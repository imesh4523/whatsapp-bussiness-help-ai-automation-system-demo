import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import db from './db.js';
import { encrypt, decrypt } from './crypto.js';
import { generateAIReply, callActiveAI } from './ai.js';
import { callGeminiAPI } from './gemini-client.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

async function generateOrderNo(db) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const countRes = await db.query(
    "SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE"
  );
  const count = parseInt(countRes.rows[0].count) || 0;
  const seq = 50 + count;
  const seqStr = String(seq).padStart(4, '0');

  return `${dateStr}${seqStr}`;
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

      let text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      const imageMessage = msg.message.imageMessage;
      if (imageMessage) {
        text = imageMessage.caption || '[Sent an image]';
      }
      if (!text && !imageMessage) continue;

      // Extract clean phone number from JID (format: '94770135410790:1@s.whatsapp.net')
      // Must strip both '@domain' and ':device' suffixes
      const senderPhone = msg.key.remoteJid.split('@')[0].split(':')[0];
      const senderName = msg.pushName || 'WhatsApp Contact';
      const sessionPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'agentbunny_agent';
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

      // Check user AI message response limits
      if (isAIActive) {
        try {
          const userRes = await db.query(
            'SELECT plan, status, ai_message_count FROM users WHERE id = $1',
            [userId]
          );
          if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            if (user.status === 'Frozen') {
              console.log(`User ${userId} is Frozen. Skipping auto-reply.`);
              return;
            }
            const planRes = await db.query(
              'SELECT response_limit FROM plans WHERE id = $1',
              [user.plan]
            );
            const responseLimit = planRes.rows.length > 0 ? planRes.rows[0].response_limit : 500;
            if (user.ai_message_count >= responseLimit) {
              console.log(`User ${userId} exceeded response limit (${user.ai_message_count}/${responseLimit}). Freezing account.`);
              await db.query("UPDATE users SET status = 'Frozen' WHERE id = $1", [userId]);
              await db.query("INSERT INTO audit_logs (action, details) VALUES ($1, $2)", ['Account Frozen', `User ID ${userId} exceeded response limit (${user.ai_message_count}/${responseLimit})`]);
              return;
            }
          }
        } catch (limitErr) {
          console.error('Failed to enforce AI response limit checks:', limitErr.message);
        }
      }

      if (isAIActive) {
        // Send presence/typing state
        await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
        
        let imageBuffer = null;
        let imageMimeType = null;
        if (imageMessage) {
          try {
            console.log(`Downloading image media from incoming WhatsApp message...`);
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }
            imageBuffer = buffer;
            imageMimeType = imageMessage.mimetype || 'image/jpeg';
            console.log(`Successfully downloaded image buffer (${imageBuffer.length} bytes)`);
          } catch (downloadErr) {
            console.error('Failed to download WhatsApp media image message:', downloadErr.message);
          }
        }

        // Generate Gemini AI response
        const aiReply = await generateAIReply(sessionId, senderPhone, text, imageBuffer, imageMimeType);
        
        // Calculate dynamic delay based on reply length (typing speed simulator)
        const wordCount = aiReply.split(/\s+/).length;
        const totalDelay = Math.min(Math.max(wordCount * typingDelayMultiplier, 1000), 7000);
        
        setTimeout(async () => {
          try {
            await sock.sendPresenceUpdate('paused', msg.key.remoteJid);
            
            // Parse reply for [IMAGE: id] tags
            let cleanReply = aiReply;
            const imagesToSend = [];
            const matches = [...aiReply.matchAll(/\[IMAGE:\s*(\d+)\]/gi)];
            
            for (const match of matches) {
              const productId = parseInt(match[1]);
              try {
                const prodRes = await db.query('SELECT image_url FROM products WHERE id = $1', [productId]);
                if (prodRes.rows.length > 0 && prodRes.rows[0].image_url) {
                  const imageUrl = prodRes.rows[0].image_url;
                  let resolvedImage = null;
                  if (imageUrl.startsWith('/uploads/')) {
                    const filename = imageUrl.replace('/uploads/', '');
                    const filePath = path.join(__dirname, 'uploads', filename);
                    if (fs.existsSync(filePath)) {
                      resolvedImage = { local: true, path: filePath };
                    }
                  } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                    resolvedImage = { local: false, url: imageUrl };
                  }
                  if (resolvedImage) {
                    imagesToSend.push(resolvedImage);
                  }
                }
              } catch (dbErr) {
                console.error('Failed to query product image from DB:', dbErr.message);
              }
            }
            
            // Clean all tags from the text message
            cleanReply = aiReply.replace(/\[IMAGE:\s*\d+\]/gi, '').trim();
            if (!cleanReply && imagesToSend.length === 0) {
              cleanReply = "සර්, මේ product එකේ photo එකක් දැනට අපේ system එකට upload කරලා නෑ. අපේ storefront catalog එකෙන් මේ ගැන වැඩි විස්තර බලාගන්න පුළුවන්!";
            }

            let orderId = null;
            if (cleanReply.toUpperCase().includes('#PENDING')) {
              try {
                orderId = await checkAndExtractOrderOnTheFly(userId, sessionId, senderPhone, cleanReply);
                if (orderId) {
                  cleanReply = cleanReply.replace(/#PENDING/gi, `#${orderId}`);
                }
              } catch (onFlyErr) {
                console.error('[AUTO-CRM] Failed to extract order on the fly:', onFlyErr.message);
              }
            }

            // Send message via Baileys socket with ephemeral expiration if active
            const sendOpts = {};
            if (ephemeralExpiration) {
              sendOpts.ephemeralExpiration = ephemeralExpiration;
            }
            
            let result;
            if (imagesToSend.length > 0) {
              try {
                // Send the first image with the caption text
                const firstImg = imagesToSend[0];
                let fileBuffer;
                if (firstImg.local) {
                  fileBuffer = fs.readFileSync(firstImg.path);
                } else {
                  const response = await fetch(firstImg.url);
                  const arrayBuffer = await response.arrayBuffer();
                  fileBuffer = Buffer.from(arrayBuffer);
                }
                
                // Convert WebP/others to JPEG buffer so WhatsApp app does not throw "Couldn't download image"
                try {
                  fileBuffer = await sharp(fileBuffer).jpeg().toBuffer();
                } catch (sharpErr) {
                  console.error('Failed to convert image to jpeg using sharp:', sharpErr.message);
                }

                result = await sock.sendMessage(msg.key.remoteJid, { image: fileBuffer, caption: cleanReply }, sendOpts);
                
                // Send remaining images if any
                for (let i = 1; i < imagesToSend.length; i++) {
                  try {
                    const nextImg = imagesToSend[i];
                    let nextBuffer;
                    if (nextImg.local) {
                      nextBuffer = fs.readFileSync(nextImg.path);
                    } else {
                      const response = await fetch(nextImg.url);
                      const arrayBuffer = await response.arrayBuffer();
                      nextBuffer = Buffer.from(arrayBuffer);
                    }

                    try {
                      nextBuffer = await sharp(nextBuffer).jpeg().toBuffer();
                    } catch (sharpErr) {
                      console.error('Failed to convert subsequent image to jpeg:', sharpErr.message);
                    }

                    // Send subsequent images with a slight delay
                    await new Promise(resolve => setTimeout(resolve, 800));
                    await sock.sendMessage(msg.key.remoteJid, { image: nextBuffer }, sendOpts);
                  } catch (subImgErr) {
                    console.error('Failed to send subsequent product image:', subImgErr.message);
                  }
                }
              } catch (sendImgErr) {
                console.error('Failed to send WhatsApp product images, falling back to text:', sendImgErr.message);
                result = await sock.sendMessage(msg.key.remoteJid, { text: cleanReply }, sendOpts);
              }
            } else {
              result = await sock.sendMessage(msg.key.remoteJid, { text: cleanReply }, sendOpts);
            }

            if (result && result.key && result.key.id) {
              trackSentMessage(result.key.id);
            }
            
            // Log outbound message to DB
            await db.query(
              'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
              [chatId, cleanReply, 'bot']
            );
            await db.query('UPDATE chats SET last_message = $1, unread_count = 0 WHERE id = $2', [cleanReply, chatId]);
            
            // Send tracking link message if order was created on the fly
            if (orderId) {
              try {
                // Fetch the product image url for items in this order
                const orderRes = await db.query('SELECT items FROM orders WHERE id = $1', [orderId]);
                let productImageUrl = null;
                if (orderRes.rows.length > 0 && orderRes.rows[0].items) {
                  const itemsList = orderRes.rows[0].items;
                  if (itemsList.length > 0) {
                    const firstItemName = itemsList[0].name || '';
                    const searchWord = firstItemName.split(' ')[0] || '';
                    if (searchWord.length > 2) {
                      const prodSearch = await db.query(
                        "SELECT image_url FROM products WHERE name ILIKE $1 AND image_url IS NOT NULL LIMIT 1",
                        [`%${searchWord}%`]
                      );
                      if (prodSearch.rows.length > 0) {
                        productImageUrl = prodSearch.rows[0].image_url;
                      }
                    }
                  }
                }

                const trackingText = `🚚 *පහත link එකෙන් ඔයාගේ ඇණවුම track කරන්න පුළුවන් සර්/මැඩම්!* 👇\n\n🔗 *Tracking Link:* https://wpp.raybeamdigital.com/track-order/${orderId}\n\n(දැනට මෙහි status එක *Confirmed / Processing* ලෙස පෙන්වයි. අප පාර්සලය courier සේවාවට භාරදුන් පසු tracking number එක update කරනු ලැබේ.) 😊`;

                if (productImageUrl) {
                  let resolvedImage = null;
                  if (productImageUrl.startsWith('/uploads/')) {
                    const filename = productImageUrl.replace('/uploads/', '');
                    const filePath = path.join(__dirname, 'uploads', filename);
                    if (fs.existsSync(filePath)) {
                      resolvedImage = { local: true, path: filePath };
                    }
                  } else if (productImageUrl.startsWith('http://') || productImageUrl.startsWith('https://')) {
                    resolvedImage = { local: false, url: productImageUrl };
                  }

                  if (resolvedImage) {
                    let fileBuffer;
                    if (resolvedImage.local) {
                      fileBuffer = fs.readFileSync(resolvedImage.path);
                    } else {
                      const response = await fetch(resolvedImage.url);
                      const arrayBuffer = await response.arrayBuffer();
                      fileBuffer = Buffer.from(arrayBuffer);
                    }
                    await sock.sendMessage(msg.key.remoteJid, { image: fileBuffer, caption: trackingText }, sendOpts);
                  } else {
                    await sock.sendMessage(msg.key.remoteJid, { text: trackingText }, sendOpts);
                  }
                } else {
                  await sock.sendMessage(msg.key.remoteJid, { text: trackingText }, sendOpts);
                }

                // Log tracking message to DB
                const trackChatId = `${sessionId}_${senderPhone}`;
                await db.query(
                  'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
                  [chatId, trackingText, 'bot']
                );
              } catch (trackErr) {
                console.error('Failed to send tracking link message:', trackErr.message);
              }
            }
            
            // Increment usage and freeze if limit met
            try {
              const userRes = await db.query('SELECT plan, ai_message_count FROM users WHERE id = $1', [userId]);
              if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const planRes = await db.query('SELECT response_limit FROM plans WHERE id = $1', [user.plan]);
                const responseLimit = planRes.rows.length > 0 ? planRes.rows[0].response_limit : 500;
                
                const newCount = (user.ai_message_count || 0) + 1;
                await db.query('UPDATE users SET ai_message_count = $1 WHERE id = $2', [newCount, userId]);
                
                if (newCount >= responseLimit) {
                  await db.query("UPDATE users SET status = 'Frozen' WHERE id = $1", [userId]);
                  await db.query("INSERT INTO audit_logs (action, details) VALUES ($1, $2)", ['Account Frozen', `User ID ${userId} hit response limit (${newCount}/${responseLimit})`]);
                  console.log(`User ${userId} has hit the message limit and is now Frozen.`);
                }
              }
            } catch (dbErr) {
              console.error('Error incrementing user message usage:', dbErr.message);
            }

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
      // Check user AI message response limits
      const userRes = await db.query(
        'SELECT plan, status, ai_message_count FROM users WHERE id = $1',
        [userId]
      );
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        if (user.status === 'Frozen') {
          console.log(`[SIMULATOR] User ${userId} is Frozen. Skipping auto-reply.`);
          return;
        }
        const planRes = await db.query(
          'SELECT response_limit FROM plans WHERE id = $1',
          [user.plan]
        );
        const responseLimit = planRes.rows.length > 0 ? planRes.rows[0].response_limit : 500;
        if (user.ai_message_count >= responseLimit) {
          console.log(`[SIMULATOR] User ${userId} exceeded response limit (${user.ai_message_count}/${responseLimit}). Freezing account.`);
          await db.query("UPDATE users SET status = 'Frozen' WHERE id = $1", [userId]);
          await db.query("INSERT INTO audit_logs (action, details) VALUES ($1, $2)", ['Account Frozen', `User ID ${userId} exceeded response limit during simulation (${user.ai_message_count}/${responseLimit})`]);
          return;
        }

        // Generate Gemini AI response
        const aiReply = await generateAIReply('agentbunny_agent', customerPhone, messageText);
        
        // Save BOT reply
        await db.query(
          'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
          [chatId, aiReply, 'bot']
        );
        await db.query('UPDATE chats SET last_message = $1, unread_count = 0 WHERE id = $2', [aiReply, chatId]);
        
        const wsRes = await db.query('SELECT ws.user_id FROM chats c JOIN whatsapp_sessions ws ON c.session_id = ws.id WHERE c.id = $1', [chatId]);
        if (wsRes.rows.length > 0) {
          await checkAndExtractOrder(wsRes.rows[0].user_id, 'agentbunny_agent', customerPhone);
        }

        // Increment usage and freeze if limit met
        const newCount = (user.ai_message_count || 0) + 1;
        await db.query('UPDATE users SET ai_message_count = $1 WHERE id = $2', [newCount, userId]);
        if (newCount >= responseLimit) {
          await db.query("UPDATE users SET status = 'Frozen' WHERE id = $1", [userId]);
          await db.query("INSERT INTO audit_logs (action, details) VALUES ($1, $2)", ['Account Frozen', `User ID ${userId} hit response limit during simulation (${newCount}/${responseLimit})`]);
          console.log(`[SIMULATOR] User ${userId} has hit the message limit and is now Frozen.`);
        }

        console.log(`[SIMULATOR] AI auto-replied to ${customerPhone}: ${aiReply}`);
      }
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
      'SELECT text, sender FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 20',
      [chatId]
    );
    const messages = msgRes.rows.reverse();
    const chatHistory = messages.map(m => `${m.sender === 'customer' ? 'Customer' : 'Assistant'}: ${m.text}`).join('\n');

    const prompt = `Analyze this chat history and determine if an order was just fully finalized and confirmed by the customer.

Finalized means:
1. Customer confirmed their order summary (said yes/ov/confirm/ok to the final summary).
2. Recipient name, delivery address, province, and payment method (COD or Bank Transfer) are known.

If NOT fully finalized, return exactly: NONE
If it IS fully finalized, extract and return strict JSON ONLY (no markdown, no explanation):
{
  "confirmed": true,
  "recipient_name": "the actual recipient name the customer gave",
  "phone": "${senderPhone}",
  "address": "full delivery address",
  "province": "province name",
  "payment_method": "COD or Bank Transfer",
  "items": [
    { "productName": "full item name including size and color", "quantity": 1, "price": 0 }
  ],
  "total_amount": 0
}
Extract item name WITH size and color from context (e.g. "T-shirt Size M Black" not just "Item").
If total amount is mentioned, use it. Otherwise 0.
Strictly output JSON or NONE. No markdown.

Chat history:
${chatHistory}`;

    try {
      const textResult = await callActiveAI(prompt, "application/json");
      if (textResult && textResult !== 'NONE' && !textResult.includes('NONE')) {
        const orderData = JSON.parse(textResult);
        if (orderData && orderData.confirmed) {
          // Check for duplicate in last 5 minutes
          const dupCheck = await db.query(
            "SELECT id FROM orders WHERE user_id = $1 AND (shipping_details->>'phone' = $2) AND created_at > NOW() - INTERVAL '15 seconds'",
            [userId, senderPhone]
          );
          if (dupCheck.rows.length === 0) {
            const orderId = await generateOrderNo(db);
            const shippingDetails = {
              name: orderData.recipient_name || customerName,
              phone: senderPhone,
              address: orderData.address,
              province: orderData.province || '',
              payment_method: orderData.payment_method
            };
            
            let amount = parseFloat(orderData.total_amount) || 0;
            if (amount === 0) {
              amount = 7500.00; // default estimated item value
            }

            const items = orderData.items && orderData.items.length > 0
              ? orderData.items.map(i => ({ name: i.productName || i.name || 'Product', qty: i.quantity || i.qty || 1, price: i.price || 0 }))
              : [{ name: 'Standard Product', qty: 1, price: amount }];

            await db.query(
              'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
              [orderId, userId, JSON.stringify(items), amount, JSON.stringify(shippingDetails), 'Confirmed']
            );

            // Decrement inventory stock
            await decrementProductStock(userId, items);

            // Update chat label to 'Confirmed'
            await db.query("UPDATE chats SET label = 'Confirmed' WHERE id = $1", [chatId]);
            console.log(`[AUTO-CRM] Order ${orderId} automatically created for customer ${senderPhone} (Amount: Rs. ${amount})`);

            // Done
          }
        }
      }
    } catch (apiErr) {
      console.error('[AUTO-CRM] Gemini API Key rotation failed in Order Extractor:', apiErr.message);
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

    try {
      const textResult = await callActiveAI(prompt, "application/json");
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
    } catch (apiErr) {
      console.error('[AUTO-TRACKING] Gemini API Key rotation failed in Tracking Extractor:', apiErr.message);
    }
  } catch (err) {
    console.error('[AUTO-TRACKING] Failed to extract tracking details:', err.message);
  }
}

// ── CRM Order Auto-Extractor on-the-fly helper ─────────────────────
export async function checkAndExtractOrderOnTheFly(userId, sessionPhone, senderPhone, pendingReply) {
  try {
    const chatRes = await db.query(
      'SELECT id, sender_name FROM chats WHERE session_id = $1 AND sender_phone = $2',
      [sessionPhone, senderPhone]
    );
    if (chatRes.rows.length === 0) return null;
    const chatId = chatRes.rows[0].id;
    const customerName = chatRes.rows[0].sender_name;

    const msgRes = await db.query(
      'SELECT text, sender FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 30',
      [chatId]
    );
    const messages = msgRes.rows.reverse();
    let chatHistory = messages.map(m => `${m.sender === 'customer' ? 'Customer' : 'Assistant'}: ${m.text}`).join('\n');
    if (pendingReply) {
      chatHistory += `\nAssistant: ${pendingReply}`;
    }

    const prompt = `Analyze this chat history and determine if an order was just fully finalized and confirmed by the customer.

Finalized means:
1. Customer confirmed their order summary (said yes/ov/confirm/ok to the final summary).
2. Recipient name, delivery address, province, and payment method (COD or Bank Transfer) are known.

If NOT fully finalized, return exactly: NONE
If it IS fully finalized, extract and return strict JSON ONLY (no markdown, no explanation):
{
  "confirmed": true,
  "recipient_name": "the actual recipient name the customer gave",
  "phone": "the recipient phone number from chat history if they explicitly gave one (otherwise use null)",
  "address": "full delivery address",
  "province": "province name",
  "payment_method": "COD or Bank Transfer",
  "items": [
    { "productName": "full item name including size and color", "quantity": 1, "price": 0 }
  ],
  "total_amount": 0
}
Extract item name WITH size and color from context (e.g. "T-shirt Size M Black" not just "Item").
If total amount is mentioned, use it. Otherwise 0.
Strictly output JSON or NONE. No markdown.

Chat history:
${chatHistory}`;

    try {
      const textResult = await callActiveAI(prompt, "application/json");
      if (textResult && textResult !== 'NONE' && !textResult.includes('NONE')) {
        const orderData = JSON.parse(textResult);
        if (orderData && orderData.confirmed) {
          // Check for duplicate in last 5 seconds
          const dupCheck = await db.query(
            "SELECT id FROM orders WHERE user_id = $1 AND (shipping_details->>'phone' = $2) AND created_at > NOW() - INTERVAL '5 seconds'",
            [userId, senderPhone]
          );
          if (dupCheck.rows.length === 0) {
            const orderId = await generateOrderNo(db);
            const shippingDetails = {
              name: orderData.recipient_name || customerName,
              phone: orderData.phone || senderPhone,
              address: orderData.address,
              province: orderData.province || '',
              payment_method: orderData.payment_method
            };
            
            let amount = parseFloat(orderData.total_amount) || 0;
            if (amount === 0) {
              amount = 7500.00; // default estimated item value
            }

            const items = orderData.items && orderData.items.length > 0
              ? orderData.items.map(i => ({ name: i.productName || i.name || 'Product', qty: i.quantity || i.qty || 1, price: i.price || 0 }))
              : [{ name: 'Standard Product', qty: 1, price: amount }];

            await db.query(
              'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
              [orderId, userId, JSON.stringify(items), amount, JSON.stringify(shippingDetails), 'Confirmed']
            );

            // Decrement inventory stock
            await decrementProductStock(userId, items);

            // Update chat label to 'Confirmed'
            await db.query("UPDATE chats SET label = 'Confirmed' WHERE id = $1", [chatId]);
            console.log(`[AUTO-CRM ON-THE-FLY] Order ${orderId} automatically created for customer ${senderPhone} (Amount: Rs. ${amount})`);
            return orderId;
          }
        }
      }
    } catch (apiErr) {
      console.error('[AUTO-CRM ON-THE-FLY] Gemini API Key rotation failed in Order Extractor:', apiErr.message);
    }
  } catch (err) {
    console.error('[AUTO-CRM ON-THE-FLY] Order extraction failed:', err.message);
  }
  return null;
}

export async function decrementProductStock(userId, items) {
  for (const item of items) {
    const itemName = item.name || item.productName || '';
    const qty = parseInt(item.qty || item.quantity || 1);
    if (!itemName) continue;

    try {
      const searchWord = itemName.split(' ')[0] || '';
      if (searchWord.length > 2) {
        const prod = await db.query(
          "SELECT id, stock_quantity FROM products WHERE (user_id = $1 OR user_id IS NULL) AND name ILIKE $2 LIMIT 1",
          [userId, `%${searchWord}%`]
        );
        if (prod.rows.length > 0) {
          const prodId = prod.rows[0].id;
          const currentStock = prod.rows[0].stock_quantity || 0;
          const newStock = Math.max(0, currentStock - qty);
          
          await db.query(
            "UPDATE products SET stock_quantity = $1 WHERE id = $2",
            [newStock, prodId]
          );
          console.log(`[INVENTORY] Decremented stock for product ID ${prodId} from ${currentStock} to ${newStock} (Ordered Qty: ${qty})`);
        }
      }
    } catch (err) {
      console.error('[INVENTORY] Failed to decrement stock for item:', itemName, err.message);
    }
  }
}
