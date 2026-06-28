import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { callGeminiAPI } from './gemini-client.js';
import { callOpenRouterAPI, getAIProvider, getOpenRouterModel } from './openrouter-client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate AI reply using Gemini API (with local fallback if key is missing)
 * @param {string} sessionPhone - The phone number of the whatsapp session
 * @param {string} senderPhone - The contact who sent the message
 * @param {string} messageText - The user prompt/message
 * @returns {Promise<string>} - The AI generated message
 */
export async function generateAIReply(sessionPhone, senderPhone, messageText, imageBuffer = null, imageMimeType = null) {
  // 1. Fetch the user's AI config or default config
  let config = {
    defaultModel: 'Gemini 1.5 Pro',
    systemPrompt: 'You are an helpful, human-like virtual assistant representing our business. Your tone is polite, professional, and empathetic. Answer questions accurately and naturally. Do not mention you are an AI model. Use short paragraphs suitable for WhatsApp messages.',
    temperature: 0.6,
    typingDelay: 150
  };

  let businessProfile = null;
  let userId = null;

  try {
    const wsRes = await db.query(
      'SELECT ws.user_id FROM whatsapp_sessions ws WHERE ws.id = $1 OR ws.phone = $1',
      [sessionPhone]
    );
    if (wsRes.rows.length > 0) {
      userId = wsRes.rows[0].user_id;
      const configRes = await db.query(
        'SELECT * FROM ai_configs WHERE user_id = $1',
        [userId]
      );
      if (configRes.rows.length > 0) {
        const row = configRes.rows[0];
        config = {
          defaultModel: row.default_model,
          systemPrompt: row.system_prompt,
          temperature: parseFloat(row.temperature),
          typingDelay: row.typing_delay
        };
      }

      // Fetch business profile
      const bpRes = await db.query('SELECT * FROM business_profiles WHERE user_id = $1', [userId]);
      if (bpRes.rows.length > 0) {
        businessProfile = bpRes.rows[0];
      }
    }
  } catch (dbErr) {
    console.warn('Failed to fetch user-specific AI config or profile from db, using default config:', dbErr.message);
  }

  // 2. Determine AI provider
  const aiProvider = await getAIProvider();

  try {
    // We get conversation history for this specific contact to maintain context
    let historyContext = "";
    try {
      const chatRes = await db.query(
        'SELECT c.id FROM chats c WHERE c.session_id = $1 AND c.sender_phone = $2',
        [sessionPhone, senderPhone]
      );
      if (chatRes.rows.length > 0) {
        const chatId = chatRes.rows[0].id;
        const msgRes = await db.query(
          'SELECT text, sender FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 8',
          [chatId]
        );
        // Exclude the current incoming message from history to prevent duplication in LLM prompt
        let rows = msgRes.rows;
        if (rows.length > 0 && rows[0].sender === 'customer' && rows[0].text === messageText) {
          rows = rows.slice(1);
        }
        // Reverse to sorted chronological order
        const recentMessages = rows.reverse();
        historyContext = recentMessages.map(m => 
          `${m.sender === 'customer' ? 'Customer' : 'Assistant'}: ${m.text}`
        ).join('\n');
      }
    } catch (histErr) {
      console.warn('Could not load chat history for context:', histErr.message);
    }

    // 4. Load knowledge files (sizing charts/photos) to send to Gemini as inlineData if customer sent an image
    const imageParts = [];
    if (imageBuffer && businessProfile && businessProfile.photo_urls && businessProfile.photo_urls.length > 0) {
      // Top 5 photos maximum
      const photos = businessProfile.photo_urls.slice(0, 5);
      for (const photoUrl of photos) {
        try {
          const filename = photoUrl.replace('/uploads/', '');
          const filePath = path.join(__dirname, 'uploads', filename);
          if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            const mimeType = photoUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
            imageParts.push({
              inlineData: {
                mimeType,
                data: fileBuffer.toString('base64')
              }
            });
          }
        } catch (imgErr) {
          console.warn('Failed to load knowledge base photo for prompt:', imgErr.message);
        }
      }
    }

    // 5. Expand System Prompt with Business Details & Sizing rules
    let systemPrompt = config.systemPrompt;
    if (businessProfile) {
      systemPrompt += `\n\n[BUSINESS KNOWLEDGE BASE]\nCompany Name: ${businessProfile.business_name || 'Our Store'}\nAbout Us: ${businessProfile.description || ''}\nAddress: ${businessProfile.address || ''}\nSizing Guides & Sizing details: ${businessProfile.sizes_info || ''}\n\n[ORDER PLACEMENT GUIDELINES]\nIf the customer expresses buying/ordering intent:\n1. Politely request their Recipient Name and Delivery Address.\n2. Ask if they prefer Cash on Delivery (COD) or Bank Transfer.\n3. Keep the conversation extremely natural, warm, and like a real human assistant.\n4. Once you have finalized the order details (item name, size, recipient name, delivery address, payment preference, total price), summarize it to the user. Do not trigger the summary until you have gathered all these fields!`;
    }

    // Load products from DB for inventory matching
    let inventoryInfo = "";
    if (userId) {
      try {
        const productsRes = await db.query(
          'SELECT id, name, price, description, category, colors, sizes, stock_quantity FROM products WHERE user_id = $1 OR user_id IS NULL ORDER BY id ASC',
          [userId]
        );
        if (productsRes.rows.length > 0) {
          inventoryInfo = productsRes.rows.map(p => 
            `- Product ID: ${p.id}, Name: ${p.name}, Price: Rs. ${p.price}, Colors: ${p.colors?.join(', ') || 'Any'}, Sizes: ${p.sizes?.join(', ') || 'Any'}, Stock Available: ${p.stock_quantity ?? 10}`
          ).join('\n');
        }
      } catch (prodErr) {
        console.warn('Failed to load products for AI inventory info:', prodErr.message);
      }
    }

    if (inventoryInfo) {
      systemPrompt += `\n\n[AVAILABLE INVENTORY & STOCK LEVELS]\n${inventoryInfo}\n\nINSTRUCTIONS for Stock & Inventory:\n1. If a customer inquires about stock, availability, pricing, sizes, or colors of a product, refer strictly to this inventory list.\n2. Confirm if we have the item in stock (Stock Available > 0).\n3. If it is in stock, say something like: "Yes sir, this product is in stock! Price is Rs. X, available sizes are Y. Would you like to order it?".\n4. If it is out of stock (Stock Available = 0), politely inform the customer that it is temporarily sold out but they can pre-order or open a support ticket.`;
    }

    // Fetch latest customer order tracking details to feed into AI memory context
    if (userId) {
      try {
        const orderRes = await db.query(
          "SELECT * FROM orders WHERE user_id = $1 AND (shipping_details->>'phone' = $2 OR shipping_details->>'phone' ILIKE $3) ORDER BY created_at DESC LIMIT 1",
          [userId, senderPhone, `%${senderPhone.slice(-9)}`]
        );
        if (orderRes.rows.length > 0) {
          const order = orderRes.rows[0];
          if (order.tracking_number) {
            systemPrompt += `\n\n[CUSTOMER ORDER TRACKING INFORMATION]\nOrder ID: ${order.id}\nCourier: ${order.courier_name}\nTracking Number: ${order.tracking_number}\nTracking Status: ${order.tracking_status}\nLast Log Update: ${order.tracking_history && order.tracking_history.length > 0 ? order.tracking_history[order.tracking_history.length - 1].details : 'In Transit'}\nLocation: ${order.tracking_history && order.tracking_history.length > 0 ? order.tracking_history[order.tracking_history.length - 1].location : 'Sorting Depot'}\n\nINSTRUCTIONS: If the customer asks about their delivery status, tracking info, where the parcel is, or status, retrieve these details and reply warmly in a human-like tone in Sinhala or English.`;
          } else {
            systemPrompt += `\n\n[CUSTOMER ORDER TRACKING INFORMATION]\nOrder ID: ${order.id}\nOrder Status: ${order.status}\nCourier Tracking: Not assigned or dispatched yet.`;
          }
        }
      } catch (trackErr) {
        console.warn('Failed to load tracking details for AI:', trackErr.message);
      }
    }

    const customerImageParts = [];
    if (imageBuffer && imageMimeType) {
      customerImageParts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBuffer.toString('base64')
        }
      });
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            ...customerImageParts,
            ...imageParts,
            {
              text: imageBuffer 
                ? `The customer uploaded this screenshot/image. Identify which product it matches in our [AVAILABLE INVENTORY]. Confirm if it is in stock, the price, sizes, and ask if they would like to order it. Additional message/caption from customer (if any): "${messageText || ''}"`
                : `Here is the conversation history:\n${historyContext}\n\nCustomer: ${messageText}\nAssistant:`
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: systemPrompt
          }
        ]
      },
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: 500
      }
    };

    let replyText = null;

    if (aiProvider === 'openrouter') {
      // --- OpenRouter path ---
      const orModel = await getOpenRouterModel();
      // Build OpenAI-style messages from system prompt + history + user message
      const orMessages = [
        { role: 'system', content: systemPrompt }
      ];
      // Add conversation history
      if (historyContext) {
        const lines = historyContext.split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('Customer: ')) {
            orMessages.push({ role: 'user', content: line.replace('Customer: ', '') });
          } else if (line.startsWith('Assistant: ')) {
            orMessages.push({ role: 'assistant', content: line.replace('Assistant: ', '') });
          }
        }
      }
      // Final user message
      let userContent = [];
      const userText = imageBuffer
        ? `The customer uploaded this screenshot/image. Identify which product it matches in our [AVAILABLE INVENTORY]. Confirm if it is in stock, the price, sizes, and ask if they would like to order it. Additional message/caption from customer (if any): "${messageText || ''}"`
        : messageText;

      userContent.push({
        type: 'text',
        text: userText
      });

      // Add customer uploaded image if present
      if (imageBuffer && imageMimeType) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`
          }
        });
      }

      // Add business knowledge base images (up to 5) for visual comparison if customer sent an image
      if (imageBuffer && businessProfile && businessProfile.photo_urls && businessProfile.photo_urls.length > 0) {
        const photos = businessProfile.photo_urls.slice(0, 5);
        for (const photoUrl of photos) {
          try {
            const filename = photoUrl.replace('/uploads/', '');
            const filePath = path.join(__dirname, 'uploads', filename);
            if (fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath);
              const mimeType = photoUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
              userContent.push({
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${fileBuffer.toString('base64')}`
                }
              });
            }
          } catch (imgErr) {
            console.warn('Failed to load knowledge base photo for OpenRouter:', imgErr.message);
          }
        }
      }

      // Fallback to simple string if no images are present
      if (userContent.length === 1) {
        userContent = userContent[0].text;
      }

      orMessages.push({
        role: 'user',
        content: userContent
      });

      replyText = await callOpenRouterAPI(orModel, orMessages, {
        temperature: config.temperature,
        max_tokens: 500
      });
    } else {
      // --- Gemini path (default) ---
      const modelName = config.defaultModel.toLowerCase().includes('pro')
        ? 'gemini-1.5-pro'
        : 'gemini-1.5-flash';
      const data = await callGeminiAPI(modelName, payload);
      replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) {
        throw new Error('Empty response from Gemini candidate parts.');
      }
    }

    return replyText.trim();
  } catch (err) {
    console.error('AI API call failed, falling back to mock reply:', err.message);
    return getMockAIResponse(messageText);
  }
}

/**
 * Highly realistic fallback responses simulating a help-automation assistant
 */
function getMockAIResponse(prompt) {
  const normalized = prompt.toLowerCase().trim();
  
  if (normalized.includes('hello') || normalized.includes('hi') || normalized.includes('hey')) {
    return "Hi there! Welcome to our store. How can I help you today? 😊";
  }
  
  if (normalized.includes('price') || normalized.includes('cost') || normalized.includes('how much') || normalized.includes('rate') || normalized.includes('value')) {
    return "Our premium linen and silk clothing items range from Rs. 7,500 to Rs. 18,500. We currently have a 10% discount on summer collections! You can check our storefront catalog on wpp.raybeamdigital.com. 👗";
  }
  
  if (normalized.includes('shipping') || normalized.includes('delivery') || normalized.includes('track') || normalized.includes('deliver') || normalized.includes('where is my')) {
    return "We offer islandwide delivery within Sri Lanka! Standard delivery takes 2-4 business days. Delivery is free for orders over Rs. 10,000. Let me know if you would like me to check a specific order status for you! 🚚";
  }

  if (normalized.includes('payment') || normalized.includes('pay') || normalized.includes('cod') || normalized.includes('bank transfer')) {
    return "We support Bank Transfers, Visa/Mastercard payments, and Cash on Delivery (COD) for all major cities. 💳";
  }
  
  if (normalized.includes('contact') || normalized.includes('human') || normalized.includes('agent') || normalized.includes('call') || normalized.includes('talk to a')) {
    return "Sure! I can transfer you to our live agent. One of our staff members will message you shortly. Thank you for your patience! 🤝";
  }

  if (normalized.includes('discount') || normalized.includes('offer') || normalized.includes('promo') || normalized.includes('coupon')) {
    return "Yes! We currently have a 10% off promotional discount code for summer wear. Use the code SUMMER10 at checkout! 🏷️";
  }

  if (normalized.includes('order') || normalized.includes('buy') || normalized.includes('purchase')) {
    return "You can easily place an order through our online catalog! Just select your items, choose size/color, fill out shipping details, and pay securely. Let me know if you need help with your checkout. 🛍️";
  }

  if (normalized.includes('location') || normalized.includes('address') || normalized.includes('where are you') || normalized.includes('shop') || normalized.includes('store')) {
    return "We are based online in Colombo, Sri Lanka! We ship orders islandwide. We do not have a physical walk-in store at the moment, but our online sizing guide is extremely accurate. 📍";
  }

  if (normalized.includes('return') || normalized.includes('exchange') || normalized.includes('refund') || normalized.includes('size change')) {
    return "We accept returns and exchanges within 7 days of delivery, provided the tags are intact and items are unworn. Please contact our support team to initiate an exchange! 🔄";
  }

  return `I understand you're asking about "${prompt}". A support agent is currently checking this for you and will get back to you shortly. In the meantime, feel free to ask about our clothing prices, shipping options, or payment methods!`;
}

/**
 * Utility function to route global system/CRM LLM tasks (like JSON extraction) 
 * through the active global provider (Gemini or OpenRouter).
 */
export async function callActiveAI(prompt, responseMimeType = "text/plain") {
  const provider = await getAIProvider();
  if (provider === 'openrouter') {
    const model = await getOpenRouterModel();
    const messages = [
      { role: 'user', content: prompt }
    ];
    return await callOpenRouterAPI(model, messages, { temperature: 0.1 });
  } else {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    };
    if (responseMimeType === "application/json") {
      payload.generationConfig.responseMimeType = "application/json";
    }
    const data = await callGeminiAPI('gemini-1.5-flash', payload);
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error('Empty response from Gemini');
    return replyText.trim();
  }
}

