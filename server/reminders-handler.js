import db from './db.js';
import { callGeminiAPI } from './gemini-client.js';
import { getActiveSocket } from './wa-manager.js';

// Initialize queue status for bulk message sending
export const bulkQueue = {
  active: false,
  total: 0,
  sent: 0,
  failed: 0,
  currentName: '',
  logs: []
};

// Initialize queue status for AI chat scanning (scaled for 5,000+ chats)
export const aiScanQueue = {
  active: false,
  total: 0,
  processed: 0,
  failed: 0,
  currentChat: '',
  logs: []
};

// Database Migration: Initialize chat_reminders table
export async function initRemindersTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_reminders (
        chat_id VARCHAR(255) PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'Pending',
        deferred_date DATE,
        reminder_count INTEGER DEFAULT 0,
        last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
        ai_analysis TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATION] chat_reminders table initialized successfully.');
  } catch (err) {
    console.error('[MIGRATION] Failed to initialize chat_reminders table:', err.message);
  }
}

// Intercept incoming messages for auto-cancellation keywords
export async function handleIncomingReminderMessage(chatId, text, userId) {
  if (!text) return;
  
  const cancelKeywords = [
    'no need', 'already bought', 'epa', 'cancel', 'ganna epa', 
    'no thanks', 'mepara epa', 'mepa epa', 'gannepa', 'benda epa'
  ];
  
  const lowerText = text.toLowerCase().trim();
  const shouldCancel = cancelKeywords.some(keyword => lowerText.includes(keyword));
  
  if (shouldCancel) {
    console.log(`[REMINDER AUTO-CANCEL] Cancellation keyword matched in chat: ${chatId}. Cancelling reminders & orders...`);
    
    // 1. Update chat reminder status
    await db.query(
      `INSERT INTO chat_reminders (chat_id, status, ai_analysis, updated_at)
       VALUES ($1, 'Cancelled', $2, CURRENT_TIMESTAMP)
       ON CONFLICT (chat_id) DO UPDATE SET status = 'Cancelled', ai_analysis = $2, updated_at = CURRENT_TIMESTAMP`,
      [chatId, `Customer replied cancellation keyword: "${text}"`]
    );

    // 2. Extract phone number from chatId (format: 'sessionid_customerphone')
    const parts = chatId.split('_');
    if (parts.length >= 2) {
      const customerPhone = parts[1];
      const phoneLike = `%${customerPhone}`;
      
      // Update pending orders to Cancelled
      const orderUpdate = await db.query(
        `UPDATE orders 
         SET status = 'Cancelled' 
         WHERE user_id = $1 
           AND (shipping_details->>'phone' = $2 OR shipping_details->>'phone' LIKE $3)
           AND status = 'Pending'`,
        [userId || 1, customerPhone, phoneLike]
      );
      console.log(`[REMINDER AUTO-CANCEL] Cancelled ${orderUpdate.rowCount} pending orders for phone ${customerPhone}.`);
    }
  }
}

// Analyze up to 5,000 chats with Gemini AI (Token Saver & Time Window Optimized)
export async function analyzeChatsWithAI(userId, sessionId, chatIds = null, maxLimit = 5000, hoursFilter = 0, forceRescan = false) {
  aiScanQueue.active = true;
  aiScanQueue.processed = 0;
  aiScanQueue.failed = 0;
  aiScanQueue.logs = [];

  const logScan = (str) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${str}`;
    console.log(`[AI SCAN QUEUE] ${str}`);
    aiScanQueue.logs.push(formatted);
  };

  try {
    let chatsToAnalyze = chatIds && Array.isArray(chatIds) && chatIds.length > 0 ? chatIds : [];
    
    if (chatsToAnalyze.length === 0) {
      logScan(`Querying active chats (Time Window: ${hoursFilter > 0 ? hoursFilter + 'h' : 'All Time'}, Token Saver: ${!forceRescan})...`);
      
      let sql = `
        SELECT c.id, c.updated_at as chat_updated, cr.updated_at as reminder_updated, cr.status as rem_status
        FROM chats c
        LEFT JOIN chat_reminders cr ON c.id = cr.chat_id
        WHERE c.session_id = $1
      `;
      const queryParams = [sessionId];

      // 1. Time Window Filter (e.g. last 24h, 48h)
      if (hoursFilter && Number(hoursFilter) > 0) {
        queryParams.push(Number(hoursFilter));
        sql += ` AND c.updated_at >= NOW() - ($${queryParams.length} || ' hours')::INTERVAL`;
      }

      // 2. Token Saver Mode: Skip already Confirmed or Cancelled chats unless forced
      if (!forceRescan) {
        sql += ` AND (cr.status IS NULL OR cr.status NOT IN ('Confirmed', 'Cancelled'))`;
      }

      sql += ` ORDER BY c.updated_at DESC LIMIT $${queryParams.length + 1}`;
      queryParams.push(maxLimit);

      const chatsRes = await db.query(sql, queryParams);
      
      // 3. Additional Token Saver: Skip chats where no new messages arrived since last AI analysis
      chatsToAnalyze = [];
      chatsRes.rows.forEach(r => {
        if (!forceRescan && r.reminder_updated && new Date(r.reminder_updated) >= new Date(r.chat_updated)) {
          // No new messages logged since last scan, skip calling AI to save Gemini API tokens!
          aiScanQueue.processed++;
          return;
        }
        chatsToAnalyze.push(r.id);
      });
    }

    aiScanQueue.total = chatsToAnalyze.length + aiScanQueue.processed;
    logScan(`Queued ${chatsToAnalyze.length} chats for Gemini AI analysis (Saved tokens on ${aiScanQueue.processed} unchanged/finalized chats).`);

    const todayStr = new Date().toISOString().split('T')[0];

    const batchSize = 10;
    for (let i = 0; i < chatsToAnalyze.length; i += batchSize) {
      if (!aiScanQueue.active) {
        logScan('AI Chat Analysis scan stopped by user.');
        break;
      }

      const batch = chatsToAnalyze.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (chatId) => {
        if (!aiScanQueue.active) return;

        try {
          const msgRes = await db.query(
            'SELECT text, sender, timestamp FROM messages WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 15',
            [chatId]
          );
          
          if (msgRes.rows.length === 0) {
            aiScanQueue.processed++;
            return;
          }
            aiScanQueue.processed++;
            return;
          }
          
          // Reverse to chronological order
          const messages = msgRes.rows.reverse();
          const formattedText = messages.map(m => `[${m.sender === 'customer' ? 'Customer' : 'Agent/Bot'}]: ${m.text}`).join('\n');
          
          const systemPrompt = `You are an expert CRM assistant. Analyze the following WhatsApp chat messages between our Business Agent/Bot and a Customer. 
Determine the purchase/order completion status and output a JSON object with the following fields:
1. "status": Must be one of:
   - "Confirmed": Customer has paid, sent bank slip/receipt, completed checkout, or explicitly confirmed they want to buy.
   - "Deferred": Customer asked to wait, pay later, buy tomorrow or next week (e.g. "heta salli ewannam", "passe gannam", "salli dala screenshot ewannam").
   - "Cancelled": Customer explicitly rejected, said they don't need it ("epa", "no need", "already bought").
   - "Pending": Conversing, still inquiring, or no clear status.
2. "deferred_date": If status is "Deferred", extract the date they promised (YYYY-MM-DD format). If they say "tomorrow", compute the date of tomorrow relative to today (${todayStr}). If no specific date is mentioned, estimate or set as null.
3. "summary": A brief 1-sentence summary in English explaining why they are in this status (e.g. "Customer promised to pay tomorrow morning" or "Customer already purchased from another store").

Messages:
${formattedText}

Response format: ONLY return valid JSON (no markdown formatting, no backticks, no wrap).`;

          const payload = {
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }]
              }
            ]
          };

          const aiRes = await callGeminiAPI('gemini-2.5-flash', payload);
          const textResponse = aiRes.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (textResponse) {
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);
            
            let defDate = result.deferred_date || null;
            if (defDate && isNaN(Date.parse(defDate))) {
              defDate = null;
            }

            // Insert or update reminder info
            await db.query(
              `INSERT INTO chat_reminders (chat_id, status, deferred_date, ai_analysis, updated_at)
               VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
               ON CONFLICT (chat_id) 
               DO UPDATE SET status = $2, deferred_date = $3, ai_analysis = $4, updated_at = CURRENT_TIMESTAMP`,
              [chatId, result.status || 'Pending', defDate, result.summary || '']
            );
          }
          aiScanQueue.processed++;
        } catch (err) {
          aiScanQueue.failed++;
          aiScanQueue.processed++;
          console.error(`Error analyzing chat ${chatId} with AI:`, err.message);
        }
      }));

      // Small 200ms delay between parallel batches to prevent rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    logScan(`AI Chat Analysis completed! Processed: ${aiScanQueue.processed}, Failed: ${aiScanQueue.failed}.`);
  } catch (err) {
    logScan(`Fatal error in AI Chat Analysis: ${err.message}`);
  } finally {
    aiScanQueue.active = false;
  }
}

// Background bulk reminder sending queue loop
export async function runBulkReminderQueue(userId, sessionId, chatIds, messageStep, minDelay, maxDelay) {
  bulkQueue.active = true;
  bulkQueue.total = chatIds.length;
  bulkQueue.sent = 0;
  bulkQueue.failed = 0;
  bulkQueue.logs = [];

  const logMsg = (str) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${str}`;
    console.log(`[BULK REMINDER QUEUE] ${str}`);
    bulkQueue.logs.push(formatted);
  };

  logMsg(`Started bulk reminders queue. Total recipients: ${chatIds.length}. Step: ${messageStep}`);

  try {
    // 1. Fetch template settings from database
    const settingsRes = await db.query(
      "SELECT key, value FROM system_settings WHERE key IN ('reminder_msg_1', 'reminder_msg_2', 'reminder_msg_3')"
    );
    
    const settingsMap = {};
    settingsRes.rows.forEach(r => {
      settingsMap[r.key] = r.value;
    });

    const defaultTemplates = {
      reminder_msg_1: "Hi {{ contactName }}, just checking if you'd like to proceed with your order? Let us know if you have any questions! 😊",
      reminder_msg_2: "Hey {{ contactName }}, we have reserved your items but stocks are running low. Reply 'YES' to confirm your order and get free delivery! 🚚",
      reminder_msg_3: "Hi {{ contactName }}, this is our final follow-up. If you still want the items, please let us know within today, otherwise we will cancel the order. Thank you! 🙏"
    };

    const template = settingsMap[`reminder_msg_${messageStep}`] || defaultTemplates[`reminder_msg_${messageStep}`];

    // 2. Fetch socket connection
    const sock = getActiveSocket(sessionId);
    if (!sock) {
      logMsg('Failed to find an active WhatsApp socket session. Aborting queue.');
      bulkQueue.active = false;
      return;
    }

    // 3. Process each chat
    for (let index = 0; index < chatIds.length; index++) {
      if (!bulkQueue.active) {
        logMsg('Bulk queue stopped by user.');
        break;
      }

      const chatId = chatIds[index];
      
      try {
        // Fetch contact details
        const chatRes = await db.query(
          'SELECT sender_phone, sender_name, remote_jid, ephemeral_expiration FROM chats WHERE id = $1',
          [chatId]
        );

        if (chatRes.rows.length === 0) {
          logMsg(`Failed: Chat ${chatId} not found in database.`);
          bulkQueue.failed++;
          continue;
        }

        const chat = chatRes.rows[0];
        const recipientJid = chat.remote_jid || `${chat.sender_phone}@s.whatsapp.net`;
        const customerName = chat.sender_name || 'WhatsApp Contact';
        
        bulkQueue.currentName = customerName;
        logMsg(`Sending follow-up #${messageStep} to ${customerName} (+${chat.sender_phone})...`);

        // Compile template variables
        let compiledMessage = template
          .replace(/\{\{\s*contactName\s*\}\}/g, customerName)
          .replace(/\{\{\s*contactMobile\s*\}\}/g, chat.sender_phone)
          .replace(/\{\{\s*today\s*\}\}/g, new Date().toLocaleDateString());

        const sendOpts = {};
        if (chat.ephemeral_expiration > 0) {
          sendOpts.ephemeralExpiration = chat.ephemeral_expiration;
        }

        // Send WhatsApp Message
        await sock.sendMessage(recipientJid, { text: compiledMessage }, sendOpts);

        // Update database logs & counts
        await db.query(
          `INSERT INTO messages (chat_id, text, sender) 
           VALUES ($1, $2, 'agent')`,
          [chatId, compiledMessage]
        );

        await db.query(
          `UPDATE chats 
           SET last_message = $1, unread_count = 0, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [compiledMessage, chatId]
        );

        await db.query(
          `INSERT INTO chat_reminders (chat_id, reminder_count, last_reminder_sent_at, updated_at)
           VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (chat_id) 
           DO UPDATE SET reminder_count = chat_reminders.reminder_count + 1, 
                         last_reminder_sent_at = CURRENT_TIMESTAMP, 
                         updated_at = CURRENT_TIMESTAMP`,
          [chatId]
        );

        logMsg(`Success: Message sent to ${customerName}.`);
        bulkQueue.sent++;

        // Apply delay if there are more chats in queue
        if (index < chatIds.length - 1 && bulkQueue.active) {
          const delaySec = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          logMsg(`Anti-Spam Delay: Waiting ${delaySec} seconds before the next message...`);
          
          // Wait
          await new Promise((resolve) => {
            const timer = setInterval(() => {
              if (!bulkQueue.active) {
                clearInterval(timer);
                resolve();
              }
            }, 1000);
            setTimeout(() => {
              clearInterval(timer);
              resolve();
            }, delaySec * 1000);
          });
        }
      } catch (err) {
        logMsg(`Failed sending to chat ${chatId}: ${err.message}`);
        bulkQueue.failed++;
      }
    }

    logMsg(`Bulk reminders completed. Total Sent: ${bulkQueue.sent}, Failed: ${bulkQueue.failed}.`);
  } catch (err) {
    logMsg(`Fatal error in bulk reminder queue: ${err.message}`);
  } finally {
    bulkQueue.active = false;
  }
}
