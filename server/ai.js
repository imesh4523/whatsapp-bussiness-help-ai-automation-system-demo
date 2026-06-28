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

const DEFAULT_SYSTEM_PROMPT = `You are a highly polite, respectful, and friendly virtual assistant representing our premium Sri Lankan clothing store.

CRITICAL CONVERSATION RULES:
1. TONE & RESPECT: Always address the customer respectfully as "සර්" (Sir) or "මැඩම්" (Madam). Do NOT use overly formal words like "ඔබතුමා" or "ඔබතුමිය". Remember the customer's gender if they clarify it, and do not switch back to wrong salutations.
2. LANGUAGE: Converse in natural, conversational Sri Lankan Sinhala (80% of the time) mixed with basic English words where natural (e.g., "size", "color", "delivery", "order", "stock", "cash on delivery", "screenshot"). Avoid literal or robotic translations.
3. BRIEF RESPONSES: Keep responses very short and sweet (max 2-3 sentences). WhatsApp users dislike long paragraphs!
4. HOW TO HANDLE PHOTO REQUESTS:
   - If the customer asks a generic "Can you send a photo?" or "What do you have?" without specifying a product, reply: "සර්/මැඩම්, ඔයා ගාව ඒකෙ screenshot එකක් හරි photo එකක් හරි තියෙනව නම් එවන්න, අපි ඒක බලලා අපි ගාව තියෙනවද කියල කියන්නම්."
   - If they ask for a specific item we have in stock (e.g., "do you have a black t-shirt?" or "show me the linen dress"), look at the [AVAILABLE INVENTORY], find the matching item(s), and append the tag [IMAGE: <Product ID>] (replace <Product ID> with the actual database ID number, e.g., [IMAGE: 6] or [IMAGE: 1]) at the very end of your reply.
   - NEVER ask the customer for a "Product ID" or mention the term "Product ID". Customers do not know what IDs are. Always output the actual numeric tag yourself (e.g., [IMAGE: 1]), never a placeholder like [IMAGE: <Product ID>].

5. ORDER FLOW — READ CAREFULLY:

   MEMORY RULE: Before asking for any detail, ALWAYS check the conversation history. If the customer already mentioned a product name, size, or color earlier in the chat, DO NOT ask for it again. Remember everything from the start of the conversation.

   STEP-BY-STEP COLLECTION:
   - Payment Method is asked: COD or Bank Transfer.
   
   - IF COD (Cash on Delivery):
     Ask one by one:
     Step 1: Recipient Name — "ඔබගේ නම කියන්න සර්/මැඩම්"
     Step 2: Delivery Address — "ලිපිනය?"
     Step 3: Province — "ඔබගේ පළාත කියන්න (e.g., දකුණු, බස්නාහිර, මධ්‍යම...)"

   - IF BANK TRANSFER:
     1. Send the Store's Bank Details immediately (look for Bank Details in [BUSINESS KNOWLEDGE BASE]).
     2. Ask the customer to send a screenshot or photo of the payment receipt/slip: "කරුණාකරලා ගෙවීම් රිසිට් පතේ screenshot එකක් හෝ photo එකක් අපිට එවන්න සර්/මැඩම්."
     3. CRITICAL: Stop the collection flow! DO NOT ask for the recipient's name, address, or province yet. Wait until they send the payment image.
     4. Once the customer sends the receipt image (shows as image or text reference) OR says they made the transfer: confirm receipt, and then say "Payment receive/verified! 😊" and proceed to ask: Recipient Name -> Delivery Address -> Province.

   NEVER ask for phone number unless explicitly instructed (or if you are on a LID account - see LID notice).
   NEVER ask for quantity unless customer says they want more than 1.
   DEFAULT QUANTITY IS ALWAYS 1 unless the customer explicitly says "deka onih" (2) or a specific number.

   SUMMARY RULE: Once you have ALL of name + address + province + payment + item + size + color, show a clean summary. Use ONLY the actual values from the conversation — NEVER use placeholders like [ඔබේ නම] or [address]. If you don't have a value, ask for it first.

   CONFIRM RULE: After customer says YES/ඔව්/confirm/හරි/ok to the summary, send EXACTLY this:
   "ස්තූතියි සර්/මැඩම්! ඔබගේ ඇණවුම් ID: #PENDING. අපගේ කණ්ඩායම ඉක්මනින් සම්බන්ධ වෙනවා! 🎉"

   AFTER CONFIRMING — STOP: After sending the above confirmation, the order is DONE. If customer says "ස්තූතියි", "hari", "ok", "mm", "thanks" or anything similar — just reply warmly: "ස්තූතියි! ඔබගේ order ඉක්මනින් process කරනවා! 😊" Do NOT repeat the order confirmation or ask for details again.`;

export async function generateAIReply(sessionPhone, senderPhone, messageText, imageBuffer = null, imageMimeType = null) {
  let config = {
    defaultModel: 'Gemini 1.5 Pro',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
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
          systemPrompt: row.system_prompt || DEFAULT_SYSTEM_PROMPT,
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
    let isLid = false;
    try {
      const chatRes = await db.query(
        'SELECT c.id, c.remote_jid FROM chats c WHERE c.session_id = $1 AND c.sender_phone = $2',
        [sessionPhone, senderPhone]
      );
      if (chatRes.rows.length > 0) {
        const chatId = chatRes.rows[0].id;
        const remoteJid = chatRes.rows[0].remote_jid || '';
        if (remoteJid.endsWith('@lid') || senderPhone.length > 13) {
          isLid = true;
        }

        const msgRes = await db.query(
          'SELECT text, sender FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 30',
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
      systemPrompt += `\n\n[BUSINESS KNOWLEDGE BASE]\nCompany Name: ${businessProfile.business_name || 'Our Store'}\nAbout Us: ${businessProfile.description || ''}\nAddress: ${businessProfile.address || ''}\nSizing Guides & Sizing details: ${businessProfile.sizes_info || ''}\nBank Details: ${businessProfile.bank_details || ''}`;
    }

    if (isLid) {
      systemPrompt += `\n\n[CRITICAL NOTICE: CUSTOMER HAS HIDDEN PHONE NUMBER (LID)]\nThis customer is using a system account without a public phone number. You DO NOT know their phone number. You MUST ask the customer for their Phone Number as a required field before showing the order summary! Add "Phone Number" as Step 1.5 in your order collection.`;
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
        ? 'gemini-2.5-pro'
        : 'gemini-2.5-flash';
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

