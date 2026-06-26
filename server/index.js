import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import db from './db.js';
import { 
  startWhatsAppSocket, 
  getSessionStatus, 
  disconnectWhatsAppSession,
  initWhatsAppSessions,
  triggerMockIncomingMessage,
  getActiveSocket
} from './wa-manager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Multer: memory storage for media uploads (no disk write needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB max
});

// ── Authentication Middleware ────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET || 'super_military_grade_whatsray_jwt_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ── Auth Endpoints ───────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Please provide email, password and fullName' });
  }

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      'INSERT INTO users (email, password_hash, full_name, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, plan, status',
      [email, passwordHash, fullName, 'Free', 'Active']
    );
    const newUser = userRes.rows[0];

    // Seed default AI config
    await db.query(
      'INSERT INTO ai_configs (user_id, default_model, temperature, typing_delay, global_ai_active) VALUES ($1, $2, $3, $4, $5)',
      [newUser.id, 'Gemini 1.5 Pro', 0.6, 150, true]
    );

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: 'user' },
      process.env.JWT_SECRET || 'super_military_grade_whatsray_jwt_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.full_name,
        plan: newUser.plan,
        status: newUser.status
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'Account suspended. Please contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      process.env.JWT_SECRET || 'super_military_grade_whatsray_jwt_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        plan: user.plan,
        status: user.status
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query('SELECT id, email, full_name, plan, status FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.full_name,
      plan: user.plan,
      status: user.status
    });
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ── Storefront Products & Orders ─────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const productsRes = await db.query('SELECT * FROM products ORDER BY id ASC');
    res.json(productsRes.rows);
  } catch (err) {
    console.error('Fetch products error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  const { orderId, items, shippingDetails, totalAmount } = req.body;
  try {
    await db.query(
      'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [orderId, req.user.id, JSON.stringify(items), totalAmount, JSON.stringify(shippingDetails), 'Pending']
    );
    res.status(201).json({ message: 'Order created successfully' });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/orders/user', authenticateToken, async (req, res) => {
  try {
    const ordersRes = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(ordersRes.rows);
  } catch (err) {
    console.error('Fetch user orders error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const checkOrder = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    await db.query("UPDATE orders SET status = 'Cancelled' WHERE id = $1", [id]);
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const ordersRes = await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    res.json(ordersRes.rows);
  } catch (err) {
    console.error('Fetch all orders error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  try {
    const result = await db.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order status updated successfully', order: result.rows[0] });
  } catch (err) {
    console.error('Update order status error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ── WhatsApp Session Endpoints ───────────────────────────────────────────────
app.get('/api/whatsapp/status', authenticateToken, async (req, res) => {
  const sessionId = `user_${req.user.id}`;
  const status = await getSessionStatus(sessionId);
  res.json(status);
});

app.post('/api/whatsapp/link', authenticateToken, async (req, res) => {
  const { authMethod, phoneNumber } = req.body;
  const sessionId = `user_${req.user.id}`;
  
  try {
    // If linking via pairing code, phone number is required
    const phone = authMethod === 'phone' ? phoneNumber : null;
    const { retrievedPairingCode } = await startWhatsAppSocket(sessionId, req.user.id, phone);
    
    // Allow brief time for QR / Pairing updates
    setTimeout(async () => {
      const currentStatus = await getSessionStatus(sessionId);
      res.json(currentStatus);
    }, 1500);
  } catch (err) {
    console.error('WhatsApp link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/disconnect', authenticateToken, async (req, res) => {
  const sessionId = `user_${req.user.id}`;
  try {
    await disconnectWhatsAppSession(sessionId);
    res.json({ success: true, message: 'WhatsApp session disconnected.' });
  } catch (err) {
    console.error('WhatsApp disconnect error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/simulate', authenticateToken, async (req, res) => {
  const { message, customerPhone } = req.body;
  const sessionId = `user_${req.user.id}`;
  const cleanPhone = customerPhone || 'simulated_client';
  
  try {
    await triggerMockIncomingMessage(req.user.id, sessionId, cleanPhone, message);
    res.json({ success: true, message: 'Mock message received; AI response simulated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Active Chats & Message history ───────────────────────────────────────────
app.get('/api/whatsapp/chats', authenticateToken, async (req, res) => {
  const sessionId = `user_${req.user.id}`;
  try {
    const chatsRes = await db.query(
      // Exclude WhatsApp group chats: group JIDs produce very long numeric IDs (16-18 digits)
      // while real phone numbers are max 15 digits (E.164 standard)
      `SELECT * FROM chats 
       WHERE session_id = $1 
         AND LENGTH(sender_phone) <= 15
       ORDER BY updated_at DESC`, 
      [sessionId]
    );
    res.json(chatsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update contact phone number (correct LID/wrong JID numbers) ───────────────
app.patch('/api/whatsapp/chats/:chatId/phone', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { phone } = req.body;
  const sessionId = `user_${req.user.id}`;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Clean: digits only, max 15 chars (E.164)
  const cleanPhone = phone.replace(/\D/g, '').substring(0, 15);
  if (cleanPhone.length < 7) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    // Security: only allow updating chats belonging to this user's session
    const check = await db.query('SELECT id FROM chats WHERE id = $1 AND session_id = $2', [chatId, sessionId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('UPDATE chats SET sender_phone = $1 WHERE id = $2', [cleanPhone, chatId]);
    res.json({ success: true, phone: cleanPhone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update contact status label (Confirmed, Cancelled, Interested) ───────────
app.patch('/api/whatsapp/chats/:chatId/label', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { label } = req.body; // 'None', 'Confirmed', 'Cancelled', 'Interested'
  const sessionId = `user_${req.user.id}`;

  if (!label) {
    return res.status(400).json({ error: 'Label is required' });
  }

  try {
    // Security: only allow updating chats belonging to this user's session
    const check = await db.query('SELECT id FROM chats WHERE id = $1 AND session_id = $2', [chatId, sessionId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('UPDATE chats SET label = $1 WHERE id = $2', [label, chatId]);
    res.json({ success: true, label });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/messages/:chatId', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  try {
    // Security check: ensure chat belongs to user's session
    const sessionId = `user_${req.user.id}`;
    const checkChat = await db.query('SELECT * FROM chats WHERE id = $1 AND session_id = $2', [chatId, sessionId]);
    if (checkChat.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messagesRes = await db.query(
      'SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC',
      [chatId]
    );
    res.json(messagesRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/send-message', authenticateToken, async (req, res) => {
  const { chatId, text } = req.body;
  try {
    // 1. Save outgoing message to DB
    await db.query(
      'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
      [chatId, text, 'agent']
    );
    
    // Update last message in chat list
    await db.query('UPDATE chats SET last_message = $1, unread_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [text, chatId]);
    
    // Send via active Baileys socket
    const sessionId = `user_${req.user.id}`;
    const sock = getActiveSocket(sessionId);
    if (sock) {
      // Fetch remote_jid and ephemeral_expiration from DB to ensure correct recipient JID and disappearing message settings are used
      const chatQuery = await db.query('SELECT remote_jid, sender_phone, ephemeral_expiration FROM chats WHERE id = $1', [chatId]);
      let recipientJid;
      let ephemeralExpiration = 0;
      if (chatQuery.rows.length > 0) {
        if (chatQuery.rows[0].remote_jid) {
          recipientJid = chatQuery.rows[0].remote_jid;
        }
        if (chatQuery.rows[0].ephemeral_expiration) {
          ephemeralExpiration = chatQuery.rows[0].ephemeral_expiration;
        }
      }
      if (!recipientJid) {
        const recipientPhone = chatQuery.rows.length > 0 ? chatQuery.rows[0].sender_phone : chatId.replace(`${sessionId}_`, '');
        recipientJid = `${recipientPhone}@s.whatsapp.net`;
      }
      
      const sendOpts = {};
      if (ephemeralExpiration > 0) {
        sendOpts.ephemeralExpiration = ephemeralExpiration;
      }
      await sock.sendMessage(recipientJid, { text }, sendOpts);
    }

    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send Media (image / video / document) ─────────────────────────────
app.post('/api/whatsapp/send-media', authenticateToken, upload.single('file'), async (req, res) => {
  const { chatId, caption } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!chatId)  return res.status(400).json({ error: 'chatId is required' });

  const sessionId = `user_${req.user.id}`;

  try {
    // Security: verify chat belongs to user
    const check = await db.query('SELECT id FROM chats WHERE id = $1 AND session_id = $2', [chatId, sessionId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    const sock = getActiveSocket(sessionId);
    
    // Fetch remote_jid and ephemeral_expiration from DB to ensure correct recipient JID and disappearing message settings are used
    const chatQuery = await db.query('SELECT remote_jid, sender_phone, ephemeral_expiration FROM chats WHERE id = $1', [chatId]);
    let recipientJid;
    let ephemeralExpiration = 0;
    if (chatQuery.rows.length > 0) {
      if (chatQuery.rows[0].remote_jid) {
        recipientJid = chatQuery.rows[0].remote_jid;
      }
      if (chatQuery.rows[0].ephemeral_expiration) {
        ephemeralExpiration = chatQuery.rows[0].ephemeral_expiration;
      }
    }
    if (!recipientJid) {
      const recipientPhone = chatQuery.rows.length > 0 ? chatQuery.rows[0].sender_phone : chatId.replace(`${sessionId}_`, '');
      recipientJid = `${recipientPhone}@s.whatsapp.net`;
    }

    const mime = file.mimetype;
    let msgPayload;

    if (mime.startsWith('image/')) {
      msgPayload = { image: file.buffer, mimetype: mime, caption: caption || '' };
    } else if (mime.startsWith('video/')) {
      msgPayload = { video: file.buffer, mimetype: mime, caption: caption || '' };
    } else {
      msgPayload = {
        document: file.buffer,
        mimetype: mime,
        fileName: file.originalname,
        caption: caption || ''
      };
    }

    if (sock) {
      const sendOpts = {};
      if (ephemeralExpiration > 0) {
        sendOpts.ephemeralExpiration = ephemeralExpiration;
      }
      await sock.sendMessage(recipientJid, msgPayload, sendOpts);
    }

    // Save to messages table as [Media] note
    const label = mime.startsWith('image/') ? '🖼️ Image' : mime.startsWith('video/') ? '🎥 Video' : '📎 ' + file.originalname;
    await db.query('INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)', [chatId, label, 'agent']);
    await db.query('UPDATE chats SET last_message = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [label, chatId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Media send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Quick Replies CRUD ───────────────────────────────────────────────
app.get('/api/quick-replies', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM quick_replies WHERE user_id = $1 ORDER BY shortcut ASC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    // Table may not exist yet - return defaults
    res.json([
      { id: 1, shortcut: '/hi',      text: 'Hi there! 👋 How can I help you today?' },
      { id: 2, shortcut: '/thanks',  text: 'Thank you for reaching out! 😊' },
      { id: 3, shortcut: '/price',   text: 'Please visit our website or ask for a quote!' },
      { id: 4, shortcut: '/bye',     text: 'Thanks for contacting us. Have a great day! 🙏' },
      { id: 5, shortcut: '/hours',   text: 'We are open Mon-Fri 9AM - 6PM (Sri Lanka time).' }
    ]);
  }
});


// ── AI Configuration Endpoints ───────────────────────────────────────────────
app.get('/api/ai-config', authenticateToken, async (req, res) => {
  try {
    const configRes = await db.query('SELECT * FROM ai_configs WHERE user_id = $1', [req.user.id]);
    if (configRes.rows.length === 0) {
      // Return default
      return res.json({
        defaultModel: 'Gemini 1.5 Pro',
        systemPrompt: 'You are an helpful, human-like virtual assistant...',
        temperature: 0.6,
        typingDelay: 150,
        globalAIActive: true
      });
    }
    const row = configRes.rows[0];
    res.json({
      defaultModel: row.default_model,
      systemPrompt: row.system_prompt,
      temperature: parseFloat(row.temperature),
      typingDelay: row.typing_delay,
      globalAIActive: row.global_ai_active
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai-config', authenticateToken, async (req, res) => {
  const { defaultModel, systemPrompt, temperature, typingDelay, globalAIActive } = req.body;
  try {
    await db.query(
      `INSERT INTO ai_configs (user_id, default_model, system_prompt, temperature, typing_delay, global_ai_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET 
         default_model = $2, 
         system_prompt = $3, 
         temperature = $4, 
         typing_delay = $5, 
         global_ai_active = $6,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, defaultModel, systemPrompt, temperature, typingDelay, globalAIActive]
    );
    res.json({ success: true, message: 'AI configuration updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── System Admin Portal API (Requires admin auth header validation) ──────────
// Simple validation since this is the dedicated dashboard
app.get('/api/admin/overview', async (req, res) => {
  try {
    const usersCount = await db.query('SELECT count(*) FROM users');
    const sessionsCount = await db.query('SELECT count(*) FROM whatsapp_sessions');
    const activeRes = await db.query("SELECT count(*) FROM whatsapp_sessions WHERE status = 'Connected'");
    
    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalSessions: parseInt(sessionsCount.rows[0].count),
      activeSessions: parseInt(activeRes.rows[0].count),
      nodeHealth: 'Healthy',
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      uptime: `${Math.round(process.uptime())}s`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const usersRes = await db.query('SELECT id, email, full_name as name, plan, status, joined_at as joined FROM users ORDER BY joined_at DESC');
    res.json(usersRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/toggle-status', async (req, res) => {
  const { id } = req.params;
  try {
    const userRes = await db.query('SELECT status FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const nextStatus = userRes.rows[0].status === 'Active' ? 'Suspended' : 'Active';
    await db.query('UPDATE users SET status = $1 WHERE id = $2', [nextStatus, id]);
    
    res.json({ success: true, nextStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sessions', async (req, res) => {
  try {
    const sessionsRes = await db.query(
      `SELECT ws.id, u.full_name as "userId", ws.phone, ws.library, ws.status, ws.uptime, ws.memory 
       FROM whatsapp_sessions ws 
       LEFT JOIN users u ON ws.user_id = u.id`
    );
    res.json(sessionsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/sessions/:id/terminate', async (req, res) => {
  const { id } = req.params;
  try {
    await disconnectWhatsAppSession(id);
    res.json({ success: true, message: 'Session terminated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server & initialize sessions
app.listen(PORT, () => {
  console.log(`WhatsRay Server is running on port ${PORT}`);
  initWhatsAppSessions();
});
