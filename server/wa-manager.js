import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import db from './db.js';
import { encrypt, decrypt } from './crypto.js';
import { generateAIReply } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory socket store
const activeSockets = {};
const pendingQrs = {};

// In-memory set to track message IDs sent from the server/panel to prevent duplicate DB logging
export const sentMessageIds = new Set();
export function trackSentMessage(id) {
  if (!id) return;
  sentMessageIds.add(id);
  if (sentMessageIds.size > 1000) {
    const first = sentMessageIds.values().next().value;
    sentMessageIds.delete(first);
  }
}

// Recursive helper to find ephemeralExpiration inside a message structure
function findEphemeralExpirationRecursive(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  if ('ephemeralExpiration' in obj && typeof obj.ephemeralExpiration === 'number') {
    return obj.ephemeralExpiration;
  }
  for (const key of Object.keys(obj)) {
    const res = findEphemeralExpirationRecursive(obj[key]);
    if (res !== undefined) return res;
  }
  return undefined;
}

// Check and load all saved active sessions from DB on startup
export async function initWhatsAppSessions() {
  console.log('Scanning database for saved WhatsApp sessions...');
  try {
    const res = await db.query("SELECT * FROM whatsapp_sessions WHERE status = 'Connected'");
    for (const row of res.rows) {
      console.log(`Restoring WhatsApp session: ${row.id} (${row.phone})...`);
      startWhatsAppSocket(row.id, row.user_id).catch(err => {
        console.error(`Failed to restore session ${row.id}:`, err.message);
      });
    }
  } catch (err) {
    console.error('Failed to query sessions for restoration:', err.message);
  }
}

/**
 * Starts a real WASocket session (or falling back to simulator if Baileys dependencies fail)
 * @param {string} sessionId - Unique identifier (usually user email or phone)
 * @param {number} userId - Owner ID
 * @param {string} pairingPhone - Optional phone number to link via pairing code
 * @returns {Promise<object>}
 */
export async function startWhatsAppSocket(sessionId, userId, pairingPhone = null) {
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  // 1. Try to restore credentials from database
  try {
    const dbSession = await db.query('SELECT session_data_encrypted FROM whatsapp_sessions WHERE id = $1', [sessionId]);
    if (dbSession.rows.length > 0 && dbSession.rows[0].session_data_encrypted) {
      const decrypted = decrypt(dbSession.rows[0].session_data_encrypted);
      if (decrypted) {
        const credsObj = JSON.parse(decrypted);
        // Write the creds file
        const credsFilePath = path.join(sessionPath, 'creds.json');
        fs.writeFileSync(credsFilePath, JSON.stringify(credsObj, null, 2));
      }
    }
  } catch (restoreErr) {
    console.warn('Could not restore creds file from DB:', restoreErr.message);
  }

  // 2. Initialize Baileys state
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const logger = pino({ level: 'silent' });
  const { version } = await fetchLatestBaileysVersion();

  console.log(`Starting Baileys socket for session ${sessionId} (v${version.join('.')})`);
  
  const sockConfig = {
    version,
    printQRInTerminal: false,
    auth: state,
    logger
  };

  const sock = makeWASocket(sockConfig);
  activeSockets[sessionId] = sock;

  // Track session details in DB
  await db.query(
    `INSERT INTO whatsapp_sessions (id, user_id, phone, library, status, uptime, memory)
     VALUES ($1, $2, $3, 'Baileys', 'Connecting', '0s', '40 MB')
     ON CONFLICT (id) DO UPDATE SET status = 'Connecting', updated_at = CURRENT_TIMESTAMP`,
    [sessionId, userId, pairingPhone]
  );

  // If pairing code requested
  let retrievedPairingCode = null;
  let pairingTimeout = null;
  if (pairingPhone) {
    pairingTimeout = setTimeout(async () => {
      if (sock.user || sock.authState?.creds?.me) {
        console.log('Socket already authenticated. Skipping pairing code request.');
        return;
      }
      try {
        const cleanPhone = pairingPhone.replace(/[^0-9]/g, '');
        console.log(`Requesting pairing code for ${cleanPhone}...`);
        const code = await sock.requestPairingCode(cleanPhone);
        retrievedPairingCode = code;
        pendingQrs[sessionId] = { pairingCode: code };
        await db.query('UPDATE whatsapp_sessions SET status = $1 WHERE id = $2', ['Pairing', sessionId]);
        console.log(`Retrieved code: ${code}`);
      } catch (pairErr) {
        console.error('Error requesting pairing code:', pairErr.message);
      }
    }, 4000);
  }

  // Monitor connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'open' && pairingTimeout) {
      clearTimeout(pairingTimeout);
    }

    if (qr) {
      try {
        const qrUrl = await QRCode.toDataURL(qr);
        pendingQrs[sessionId] = { qrUrl };
        await db.query('UPDATE whatsapp_sessions SET status = $1 WHERE id = $2', ['Connecting', sessionId]);
      } catch (qrErr) {
        console.error('Failed to generate QR Code data URL:', qrErr);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || 
                         statusCode === DisconnectReason.badSession || 
                         statusCode === 401 || 
                         statusCode === 403 || 
                         statusCode === 411 || 
                         statusCode === 500;
      const shouldReconnect = !isLoggedOut;
      console.log(`Connection closed for session ${sessionId} (code ${statusCode}). Reconnecting?`, shouldReconnect, 'Reason:', lastDisconnect?.error);
      
      await db.query('UPDATE whatsapp_sessions SET status = $1, uptime = $2 WHERE id = $3', ['Disconnected', '0s', sessionId]);
      
      if (shouldReconnect) {
        startWhatsAppSocket(sessionId, userId, pairingPhone);
      } else {
        // Logged out
        cleanSessionDirectory(sessionId);
        await db.query('DELETE FROM whatsapp_sessions WHERE id = $1', [sessionId]);
        delete activeSockets[sessionId];
        delete pendingQrs[sessionId];
      }
    } else if (connection === 'open') {
      console.log(`WhatsApp connection is now OPEN for session ${sessionId}`);
      const userPhone = sock.user?.id ? sock.user.id.split(':')[0] : (pairingPhone || 'Active Daemon');
      
      // Update session status to Connected in DB
      await db.query(
        `UPDATE whatsapp_sessions 
         SET status = 'Connected', phone = $1, uptime = 'Active Now', memory = '35 MB', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userPhone, sessionId]
      );
      
      delete pendingQrs[sessionId];
    }
  });

  // Handle credentials updates
  sock.ev.on('creds.update', async () => {
    await saveCreds();
    try {
      // Read current creds.json and save encrypted value to database
      const credsFilePath = path.join(sessionPath, 'creds.json');
      if (fs.existsSync(credsFilePath)) {
        const credsContent = fs.readFileSync(credsFilePath, 'utf8');
        const encrypted = encrypt(credsContent);
        await db.query(
          'UPDATE whatsapp_sessions SET session_data_encrypted = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [encrypted, sessionId]
        );
      }
    } catch (saveErr) {
      console.error('Failed to encrypt/save creds to DB:', saveErr.message);
    }
  });

  // Listen to incoming messages and generate AI replies
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify' && m.type !== 'append') return;
    
    for (const msg of m.messages) {
      if (!msg.message) continue;
      
      // Skip group chats — only process individual/personal conversations
      if (msg.key.remoteJid.endsWith('@g.us')) continue;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (!text) continue;

      // Extract clean phone number from JID (format: '94770135410790:1@s.whatsapp.net')
      // Must strip both '@domain' and ':device' suffixes
      const senderPhone = msg.key.remoteJid.split('@')[0].split(':')[0];
      const senderName = msg.pushName || 'WhatsApp Contact';
      const sessionPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'whatsray_agent';
      const chatId = `${sessionId}_${senderPhone}`;

      if (msg.key.fromMe) {
        // Outbound message from this WhatsApp account (either our server or linked mobile phone)
        if (sentMessageIds.has(msg.key.id)) {
          // Already sent by panel/bot and logged. Remove from Set and skip.
          sentMessageIds.delete(msg.key.id);
          continue;
        }

        // Sent manually from linked mobile phone! Log as outgoing message from 'agent'.
        console.log(`Outbound message sent from linked mobile phone on session ${sessionId} to ${senderPhone}: ${text}`);
        
        await db.query(
          `INSERT INTO chats (id, session_id, sender_phone, sender_name, last_message, unread_count, updated_at, remote_jid)
           VALUES ($1, $2, $3, $4, $5, 0, CURRENT_TIMESTAMP, $6)
           ON CONFLICT (id) DO UPDATE SET last_message = $5, updated_at = CURRENT_TIMESTAMP`,
          [chatId, sessionId, senderPhone, senderName, text, msg.key.remoteJid]
        );

        await db.query(
          'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
          [chatId, text, 'agent']
        );

        // Auto-extract tracking info if present in outgoing message from mobile phone
        await checkAndExtractTracking(userId, sessionId, senderPhone, text);

        continue;
      }

      console.log(`Incoming message on session ${sessionId} from ${senderPhone}: ${text}`);

      // Fetch sender's WhatsApp profile picture
      let profilePicUrl = null;
      try {
        profilePicUrl = await sock.profilePictureUrl(msg.key.remoteJid, 'image');
      } catch (picErr) {
        // Contact may have privacy settings that prevent fetching
        profilePicUrl = null;
      }

      // Extract ephemeral expiration if present in the incoming message
      let ephemeralExpiration = findEphemeralExpirationRecursive(msg);
      if (ephemeralExpiration === undefined) {
        ephemeralExpiration = null;
      }
      console.log(`Detected ephemeralExpiration for session ${sessionId} (chat: ${senderPhone}): ${ephemeralExpiration}`);

      // Log/Create Chat Session in DB
      await db.query(
        `INSERT INTO chats (id, session_id, sender_phone, sender_name, last_message, unread_count, updated_at, profile_pic_url, remote_jid, ephemeral_expiration)
         VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP, $6, $7, COALESCE($8, 0))
         ON CONFLICT (id) DO UPDATE 
           SET last_message = $5, 
               unread_count = chats.unread_count + 1, 
               updated_at = CURRENT_TIMESTAMP,
               sender_name = COALESCE(EXCLUDED.sender_name, chats.sender_name),
               profile_pic_url = COALESCE($6, chats.profile_pic_url),
               ephemeral_expiration = COALESCE($8, chats.ephemeral_expiration)`,
        [chatId, sessionId, senderPhone, senderName, text, profilePicUrl, msg.key.remoteJid, ephemeralExpiration]
      );


      // Save message in DB
      await db.query(
        'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
        [chatId, text, 'customer']
      );

      // Check if global AI configuration is active for this user
      let isAIActive = true;
      let typingDelayMultiplier = 150; // ms per word
      
      try {
        const aiConfRes = await db.query(
          'SELECT global_ai_active, typing_delay FROM ai_configs WHERE user_id = $1',
          [userId]
        );
        if (aiConfRes.rows.length > 0) {
          isAIActive = aiConfRes.rows[0].global_ai_active;
          typingDelayMultiplier = aiConfRes.rows[0].typing_delay;
        }
      } catch (confErr) {
        console.warn('Could not read AI config for message auto-reply:', confErr.message);
      }

      if (isAIActive) {
        // Send presence/typing state
        await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
        
        // Generate Gemini AI response
        const aiReply = await generateAIReply(sessionPhone, senderPhone, text);
        
        // Calculate dynamic delay based on reply length (typing speed simulator)
        const wordCount = aiReply.split(/\s+/).length;
        const totalDelay = Math.min(Math.max(wordCount * typingDelayMultiplier, 1000), 7000);
        
        setTimeout(async () => {
          try {
            await sock.sendPresenceUpdate('paused', msg.key.remoteJid);
            
            // Send message via Baileys socket with ephemeral expiration if active
            const sendOpts = {};
            if (ephemeralExpiration) {
              sendOpts.ephemeralExpiration = ephemeralExpiration;
            }
            const result = await sock.sendMessage(msg.key.remoteJid, { text: aiReply }, sendOpts);
            if (result && result.key && result.key.id) {
              trackSentMessage(result.key.id);
            }
            
            // Log outbound message to DB
            await db.query(
              'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
              [chatId, aiReply, 'bot']
            );
            await db.query('UPDATE chats SET last_message = $1, unread_count = 0 WHERE id = $2', [aiReply, chatId]);
            await checkAndExtractOrder(userId, sessionId, senderPhone);
            
            console.log(`AI Replied on session ${sessionId}: ${aiReply}`);
          } catch (sendErr) {
            console.error('Failed to send outbound WhatsApp reply:', sendErr.message);
          }
        }, totalDelay);
      }
    }
  });

  return { sock, retrievedPairingCode };
}

/**
 * Returns active socket for a given session ID (for sending messages/media)
 */
export function getActiveSocket(sessionId) {
  return activeSockets[sessionId] || null;
}

/**
 * Returns connection statuses, pending QR urls or pairing codes
 */
export async function getSessionStatus(sessionId) {
  const sock = activeSockets[sessionId];
  const pending = pendingQrs[sessionId] || {};
  
  if (!sock) {
    return { status: 'Disconnected', qrUrl: null, pairingCode: null };
  }
  
  try {
    const dbRes = await db.query('SELECT status, phone, uptime, memory FROM whatsapp_sessions WHERE id = $1', [sessionId]);
    if (dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      return {
        status: row.status,
        phone: row.phone,
        uptime: row.uptime,
        memory: row.memory,
        qrUrl: pending.qrUrl || null,
        pairingCode: pending.pairingCode || null
      };
    }
  } catch (err) {
    console.error('Failed to fetch session status from DB:', err.message);
  }

  return { status: 'Connecting', qrUrl: pending.qrUrl || null, pairingCode: pending.pairingCode || null };
}

/**
 * Disconnect and destroy active WhatsApp socket session
 */
export async function disconnectWhatsAppSession(sessionId) {
  const sock = activeSockets[sessionId];
  if (sock) {
    try {
      sock.logout();
      sock.end();
    } catch (e) {
      console.warn('Error during socket termination:', e.message);
    }
    delete activeSockets[sessionId];
  }
  
  delete pendingQrs[sessionId];
  cleanSessionDirectory(sessionId);

  // Update DB status
  await db.query('DELETE FROM whatsapp_sessions WHERE id = $1', [sessionId]);
  console.log(`WhatsApp Session ${sessionId} deleted and terminated.`);
}

function cleanSessionDirectory(sessionId) {
  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Could not clean directory ${sessionPath}:`, e.message);
    }
  }
}

// ── VIRTUAL MOCK SIMULATION ENGINE (For sandbox & UI client demonstrations) ──
// Allows the React frontend to run simulation webhooks easily
export async function triggerMockIncomingMessage(userId, sessionId, customerPhone, messageText) {
  const chatId = `${sessionId}_${customerPhone}`;
  const mockJid = `${customerPhone}@s.whatsapp.net`;
  
  // 1. Create/Update Chat
  await db.query(
    `INSERT INTO chats (id, session_id, sender_phone, sender_name, last_message, unread_count, updated_at, remote_jid)
     VALUES ($1, $2, $3, 'Test Customer', $4, 1, CURRENT_TIMESTAMP, $5)
     ON CONFLICT (id) DO UPDATE SET last_message = $4, unread_count = chats.unread_count + 1, updated_at = CURRENT_TIMESTAMP`,
    [chatId, sessionId, customerPhone, messageText, mockJid]
  );

  // 2. Insert message
  await db.query(
    'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
    [chatId, messageText, 'customer']
  );

  // 3. Trigger simulated AI processing
  setTimeout(async () => {
    try {
      const aiReply = await generateAIReply('whatsray_agent', customerPhone, messageText);
      
      // Save BOT reply
      await db.query(
        'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
        [chatId, aiReply, 'bot']
      );
      await db.query('UPDATE chats SET last_message = $1, unread_count = 0 WHERE id = $2', [aiReply, chatId]);
      
      const wsRes = await db.query('SELECT ws.user_id FROM chats c JOIN whatsapp_sessions ws ON c.session_id = ws.id WHERE c.id = $1', [chatId]);
      if (wsRes.rows.length > 0) {
        await checkAndExtractOrder(wsRes.rows[0].user_id, 'whatsray_agent', customerPhone);
      }

      console.log(`[SIMULATOR] AI auto-replied to ${customerPhone}: ${aiReply}`);
    } catch (err) {
      console.error('[SIMULATOR] Failed to process AI response:', err.message);
    }
  }, 2000);
}

// ── CRM Order Auto-Extractor helper using Gemini ─────────────────────
async function checkAndExtractOrder(userId, sessionPhone, senderPhone) {
  try {
    const chatRes = await db.query(
      'SELECT id, sender_name FROM chats WHERE session_id = $1 AND sender_phone = $2',
      [sessionPhone, senderPhone]
    );
    if (chatRes.rows.length === 0) return;
    const chatId = chatRes.rows[0].id;
    const customerName = chatRes.rows[0].sender_name;

    const msgRes = await db.query(
      'SELECT text, sender FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 15',
      [chatId]
    );
    const messages = msgRes.rows.reverse();
    const chatHistory = messages.map(m => `${m.sender === 'customer' ? 'Customer' : 'Assistant'}: ${m.text}`).join('\n');

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const dbKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
      if (dbKeyRes.rows.length > 0) apiKey = dbKeyRes.rows[0].value;
    }
    if (!apiKey) return;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Analyze this chat history and determine if an order was just fully finalized and confirmed.
Finalized means:
1. Customer provided recipient name, address, and payment method choice (COD/Cash on Delivery or Bank Transfer).
2. The order has been finalized and confirmed by the assistant or customer.

If NOT fully finalized, return exactly: NONE
If it is fully finalized, extract details and return a strict JSON block.
JSON format:
{
  "confirmed": true,
  "recipient_name": "extracted name or empty",
  "phone": "${senderPhone}",
  "address": "extracted delivery address",
  "payment_method": "COD" or "Bank Transfer",
  "items": [
    { "name": "item name", "qty": 1, "price": 0 }
  ],
  "total_amount": 0
}
Strictly output JSON or NONE. No markup, no markdown formatting.

Chat history:
${chatHistory}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (textResult && textResult !== 'NONE' && !textResult.includes('NONE')) {
        const orderData = JSON.parse(textResult);
        if (orderData && orderData.confirmed) {
          // Check for duplicate in last 5 minutes
          const dupCheck = await db.query(
            "SELECT id FROM orders WHERE user_id = $1 AND (shipping_details->>'phone' = $2) AND created_at > NOW() - INTERVAL '5 minutes'",
            [userId, senderPhone]
          );
          if (dupCheck.rows.length === 0) {
            const orderId = `ord_${Date.now()}_${Math.round(Math.random() * 1000)}`;
            const shippingDetails = {
              name: orderData.recipient_name || customerName,
              phone: senderPhone,
              address: orderData.address,
              payment_method: orderData.payment_method
            };
            
            let amount = parseFloat(orderData.total_amount) || 0;
            if (amount === 0) {
              amount = 7500.00; // default estimated item value
            }

            const items = orderData.items && orderData.items.length > 0 ? orderData.items : [{ name: 'Standard Product', qty: 1, price: amount }];

            await db.query(
              'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
              [orderId, userId, JSON.stringify(items), amount, JSON.stringify(shippingDetails), 'Confirmed']
            );

            // Update chat label to 'Confirmed'
            await db.query("UPDATE chats SET label = 'Confirmed' WHERE id = $1", [chatId]);
            console.log(`[AUTO-CRM] Order ${orderId} automatically created for customer ${senderPhone} (Amount: Rs. ${amount})`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[AUTO-CRM] Order extraction failed:', err.message);
  }
}

// ── CRM Order Tracking Auto-Extractor helper using Gemini ───────────────
export async function checkAndExtractTracking(userId, sessionPhone, customerPhone, text) {
  try {
    // 1. Fetch latest order for this customer
    const orderRes = await db.query(
      `SELECT id, courier_name, tracking_number 
       FROM orders 
       WHERE user_id = $1 
         AND (shipping_details->>'phone' = $2 OR shipping_details->>'phone' ILIKE $3) 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, customerPhone, `%${customerPhone.slice(-9)}`]
    );
    if (orderRes.rows.length === 0) return;
    const orderId = orderRes.rows[0].id;

    // 2. Fetch Gemini API Key
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const dbKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
      if (dbKeyRes.rows.length > 0) apiKey = dbKeyRes.rows[0].value;
    }
    if (!apiKey) return;

    // 3. Prompt Gemini to check for tracking number and courier name
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Analyze this message sent by the shop assistant to the customer and determine if it contains a delivery/package tracking number or tracking link, and optionally a courier/delivery service name.
If NOT found, return exactly: NONE
If found, extract the details and return a strict JSON block.
JSON format:
{
  "has_tracking": true,
  "tracking_number": "extracted tracking number or tracking reference",
  "courier_name": "extracted courier/delivery service name (e.g. Domex, Koombiyo, PromptX, Fardar, Certis Lanka, etc.) or 'Courier Service'"
}
Strictly output JSON or NONE. No markup, no markdown formatting.

Message text:
"${text}"`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (textResult && textResult !== 'NONE' && !textResult.includes('NONE')) {
        const trackingData = JSON.parse(textResult);
        if (trackingData && trackingData.has_tracking && trackingData.tracking_number) {
          const trackingNumber = trackingData.tracking_number;
          const courierName = trackingData.courier_name || 'Courier Service';

          // Initialize tracking history with first log
          const trackingHistory = [
            {
              status: 'Dispatched',
              details: `Parcel handed over to ${courierName}. Tracking Number: ${trackingNumber}`,
              location: 'Courier Warehouse',
              timestamp: new Date().toISOString()
            }
          ];

          // Update the order in database
          await db.query(
            `UPDATE orders 
             SET tracking_number = $1, 
                 courier_name = $2, 
                 tracking_status = 'Dispatched', 
                 tracking_history = $3,
                 status = 'Dispatched'
             WHERE id = $4`,
            [trackingNumber, courierName, JSON.stringify(trackingHistory), orderId]
          );

          console.log(`[AUTO-TRACKING] Linked tracking number ${trackingNumber} (${courierName}) to order ${orderId}`);
        }
      }
    }
  } catch (err) {
    console.error('[AUTO-TRACKING] Failed to extract tracking details:', err.message);
  }
}
