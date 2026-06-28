import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { 
  startWhatsAppSocket, 
  getSessionStatus, 
  disconnectWhatsAppSession,
  initWhatsAppSessions,
  triggerMockIncomingMessage,
  getActiveSocket,
  trackSentMessage
} from './wa-manager.js';

dotenv.config();

let stripeInstance = null;
async function getDynamicStripe() {
  let secretKey = process.env.STRIPE_SECRET_KEY;
  try {
    const r = await db.query("SELECT value FROM system_settings WHERE key = 'stripe_secret_key'");
    if (r.rows.length > 0 && r.rows[0].value) {
      secretKey = r.rows[0].value;
    }
  } catch (err) {
    console.error('Failed to retrieve Stripe secret key from DB:', err.message);
  }
  
  if (!stripeInstance || stripeInstance._secretKey !== secretKey) {
    stripeInstance = new Stripe(secretKey || 'sk_test_mock_stripe_key_agentbunny_123456');
    stripeInstance._secretKey = secretKey;
  }
  return stripeInstance;
}

async function isStripeConfigured() {
  let secretKey = process.env.STRIPE_SECRET_KEY;
  try {
    const r = await db.query("SELECT value FROM system_settings WHERE key = 'stripe_secret_key'");
    if (r.rows.length > 0 && r.rows[0].value) {
      secretKey = r.rows[0].value;
    }
  } catch (e) {}
  return !!secretKey;
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

  jwt.verify(token, process.env.JWT_SECRET || 'super_military_grade_agentbunny_jwt_secret_key', (err, user) => {
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
      process.env.JWT_SECRET || 'super_military_grade_agentbunny_jwt_secret_key',
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
      process.env.JWT_SECRET || 'super_military_grade_agentbunny_jwt_secret_key',
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
    const userRes = await db.query('SELECT id, email, full_name, plan, status, auto_renewal, plan_expires_at, billing_cycle FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.full_name,
      plan: user.plan,
      status: user.status,
      auto_renewal: user.auto_renewal,
      plan_expires_at: user.plan_expires_at,
      billing_cycle: user.billing_cycle
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

app.get('/api/orders/public/track/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const orderRes = await db.query(
      `SELECT id, items, total_amount, shipping_details, status, courier_name, tracking_number, tracking_status, tracking_history, created_at 
       FROM orders 
       WHERE id = $1`,
      [id]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(orderRes.rows[0]);
  } catch (err) {
    console.error('Fetch public order tracking error:', err.message);
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

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const check = await db.query('SELECT user_id FROM orders WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    await db.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WhatsApp Session Endpoints ───────────────────────────────────────────────

// Helper / Middleware to resolve WhatsApp session ID from request headers, query, or body
async function resolveWhatsAppSession(req, res, next) {
  let sessionId = req.headers['x-session-id'] || req.query.sessionId || req.body.sessionId;
  
  if (!sessionId) {
    try {
      const dbRes = await db.query(
        'SELECT id FROM whatsapp_sessions WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
        [req.user.id]
      );
      if (dbRes.rows.length > 0) {
        sessionId = dbRes.rows[0].id;
      } else {
        sessionId = `user_${req.user.id}`;
      }
    } catch (err) {
      return res.status(500).json({ error: 'Database error resolving session ID' });
    }
  } else {
    try {
      const check = await db.query(
        'SELECT id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, req.user.id]
      );
      if (check.rows.length === 0 && sessionId !== `user_${req.user.id}`) {
        return res.status(403).json({ error: 'Access denied: Session not found or does not belong to you' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Database error validating session ID' });
    }
  }
  
  req.whatsappSessionId = sessionId;
  next();
}

app.get('/api/whatsapp/sessions', authenticateToken, async (req, res) => {
  try {
    const sessionsRes = await db.query(
      'SELECT id, session_name, phone, library, status, uptime, memory, created_at FROM whatsapp_sessions WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(sessionsRes.rows);
  } catch (err) {
    console.error('Fetch whatsapp sessions error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/whatsapp/sessions/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const { session_name } = req.body;
  
  if (!session_name || !session_name.trim()) {
    return res.status(400).json({ error: 'Session name is required' });
  }
  
  try {
    const result = await db.query(
      'UPDATE whatsapp_sessions SET session_name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, session_name',
      [session_name.trim(), sessionId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }
    res.json({ success: true, session: result.rows[0] });
  } catch (err) {
    console.error('Rename session error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/whatsapp/status', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const sessionId = req.whatsappSessionId;
  const status = await getSessionStatus(sessionId);
  res.json(status);
});

app.post('/api/whatsapp/link', authenticateToken, async (req, res) => {
  const { authMethod, phoneNumber, sessionId: inputSessionId } = req.body;
  
  try {
    let sessionId = inputSessionId;
    
    if (!sessionId) {
      // Check limits
      const countRes = await db.query('SELECT COUNT(*) FROM whatsapp_sessions WHERE user_id = $1', [req.user.id]);
      const activeCount = parseInt(countRes.rows[0].count);
      
      const userRes = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
      const plan = userRes.rows[0]?.plan || 'Free';
      let maxSessions = 1;
      if (plan === 'Premium') maxSessions = 3;
      if (plan === 'Enterprise') maxSessions = 10;
      
      if (activeCount >= maxSessions) {
        return res.status(400).json({ 
          error: `You have reached the maximum number of WhatsApp sessions (${maxSessions}) allowed for your ${plan} plan.` 
        });
      }
      
      sessionId = `session_${req.user.id}_${Date.now()}`;
    } else {
      const check = await db.query('SELECT id FROM whatsapp_sessions WHERE id = $1 AND user_id = $2', [sessionId, req.user.id]);
      if (check.rows.length === 0 && sessionId !== `user_${req.user.id}`) {
        return res.status(403).json({ error: 'Invalid session ID provided.' });
      }
    }
    
    const phone = authMethod === 'phone' ? phoneNumber : null;
    const { retrievedPairingCode } = await startWhatsAppSocket(sessionId, req.user.id, phone);
    
    setTimeout(async () => {
      const currentStatus = await getSessionStatus(sessionId);
      res.json({ ...currentStatus, sessionId });
    }, 1500);
  } catch (err) {
    console.error('WhatsApp link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/disconnect', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const sessionId = req.whatsappSessionId;
  try {
    await disconnectWhatsAppSession(sessionId);
    res.json({ success: true, message: 'WhatsApp session disconnected.' });
  } catch (err) {
    console.error('WhatsApp disconnect error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/simulate', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const { message, customerPhone } = req.body;
  const sessionId = req.whatsappSessionId;
  const cleanPhone = customerPhone || 'simulated_client';
  
  try {
    await triggerMockIncomingMessage(req.user.id, sessionId, cleanPhone, message);
    res.json({ success: true, message: 'Mock message received; AI response simulated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Active Chats & Message history ───────────────────────────────────────────
app.get('/api/whatsapp/chats', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const sessionId = req.whatsappSessionId;
  try {
    const chatsRes = await db.query(
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
app.patch('/api/whatsapp/chats/:chatId/phone', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const { chatId } = req.params;
  const { phone } = req.body;
  const sessionId = req.whatsappSessionId;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleanPhone = phone.replace(/\D/g, '').substring(0, 15);
  if (cleanPhone.length < 7) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
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
app.patch('/api/whatsapp/chats/:chatId/label', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const { chatId } = req.params;
  const { label } = req.body;
  const sessionId = req.whatsappSessionId;

  if (!label) {
    return res.status(400).json({ error: 'Label is required' });
  }

  try {
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

app.get('/api/whatsapp/messages/:chatId', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const { chatId } = req.params;
  const sessionId = req.whatsappSessionId;
  try {
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

app.post('/api/whatsapp/send-message', authenticateToken, resolveWhatsAppSession, async (req, res) => {
  const { chatId, text } = req.body;
  const sessionId = req.whatsappSessionId;
  try {
    await db.query(
      'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
      [chatId, text, 'agent']
    );
    
    await db.query('UPDATE chats SET last_message = $1, unread_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [text, chatId]);
    
    const sock = getActiveSocket(sessionId);
    if (sock) {
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
      const result = await sock.sendMessage(recipientJid, { text }, sendOpts);
      if (result && result.key && result.key.id) {
        trackSentMessage(result.key.id);
      }
    }

    // Auto-extract tracking info if present in outgoing message sent from panel
    const customerPhone = chatId.replace(`${sessionId}_`, '');
    await checkAndExtractTracking(req.user.id, sessionId, customerPhone, text);

    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send Media (image / video / document) ─────────────────────────────
app.post('/api/whatsapp/send-media', authenticateToken, upload.single('file'), resolveWhatsAppSession, async (req, res) => {
  const { chatId, caption } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!chatId)  return res.status(400).json({ error: 'chatId is required' });

  const sessionId = req.whatsappSessionId;

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
      const result = await sock.sendMessage(recipientJid, msgPayload, sendOpts);
      if (result && result.key && result.key.id) {
        trackSentMessage(result.key.id);
      }
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


// ── Business Profile Knowledge Upload Endpoints ──────────────────────
app.get('/api/business-profile', authenticateToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
    if (r.rows.length === 0) {
      return res.json({
        business_name: '',
        description: '',
        address: '',
        sizes_info: '',
        logo_url: null,
        photo_urls: []
      });
    }
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/business-profile', authenticateToken, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'photos', maxCount: 10 }]), async (req, res) => {
  try {
    const { business_name, description, address, sizes_info } = req.body;
    
    // 1. Fetch current profile
    const currentRes = await db.query('SELECT * FROM business_profiles WHERE user_id = $1', [req.user.id]);
    let logo_url = currentRes.rows.length > 0 ? currentRes.rows[0].logo_url : null;
    let photo_urls = currentRes.rows.length > 0 && currentRes.rows[0].photo_urls ? currentRes.rows[0].photo_urls : [];

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 2. Handle single logo upload
    if (req.files && req.files.logo && req.files.logo[0]) {
      const file = req.files.logo[0];
      const filename = `logo-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
      fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
      logo_url = `/uploads/${filename}`;
    }

    // 3. Handle multiple photos upload
    if (req.files && req.files.photos) {
      for (const file of req.files.photos) {
        const filename = `photo-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        photo_urls.push(`/uploads/${filename}`);
      }
    }

    // 4. Handle photos deletion if requested
    if (req.body.deleted_photos) {
      const deletedList = JSON.parse(req.body.deleted_photos);
      photo_urls = photo_urls.filter(url => !deletedList.includes(url));
      // Delete physical files
      for (const url of deletedList) {
        try {
          const filePath = path.join(__dirname, url);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Failed to delete physical photo:', e.message);
        }
      }
    }

    // 5. Save to database
    await db.query(`
      INSERT INTO business_profiles (user_id, business_name, description, address, sizes_info, logo_url, photo_urls)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE 
      SET business_name = $2, description = $3, address = $4, sizes_info = $5, logo_url = $6, photo_urls = $7
    `, [req.user.id, business_name, description, address, sizes_info, logo_url, photo_urls]);

    res.json({ success: true, message: 'Business profile updated successfully.', profile: { business_name, description, address, sizes_info, logo_url, photo_urls } });
  } catch (err) {
    console.error('Update business profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard Statistics Endpoint ────────────────────────────────────
app.get('/api/user/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    // Dynamically process any pending auto-renewals on dashboard access
    await processSubscriptionRenewals();

    // 1. Calculate total earned: sum of total_amount of confirmed/completed orders for this user
    const earnedRes = await db.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE user_id = $1 AND (status = 'Confirmed' OR status = 'Completed')", [req.user.id]);
    const total_earned = parseFloat(earnedRes.rows[0].total);

    // 2. Count total contacts/chats
    const contactsRes = await db.query(`
      SELECT COUNT(*) as total FROM chats c
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1
    `, [req.user.id]);
    const total_contacts = parseInt(contactsRes.rows[0].total);

    // 3. Count total tags
    const tagsRes = await db.query(`
      SELECT COUNT(DISTINCT label) as total FROM chats c
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1 AND label IS NOT NULL AND label != 'None'
    `, [req.user.id]);
    const total_tags = parseInt(tagsRes.rows[0].total);

    // 4. Count total lists
    const total_lists = total_tags > 0 ? total_tags + 1 : 1;

    // 5. Count active flows & AI Bots
    const configRes = await db.query('SELECT global_ai_active FROM ai_configs WHERE user_id = $1', [req.user.id]);
    const active_flows = configRes.rows.length > 0 && configRes.rows[0].global_ai_active ? 1 : 0;
    const ai_bots = 1;

    // 6. Total deposits from transactions
    const depositsRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND status = 'Completed'", [req.user.id]);
    const total_deposits = parseFloat(depositsRes.rows[0].total);

    // 7. Total AI messages sent (sender = 'bot')
    const aiMsgsRes = await db.query(`
      SELECT COUNT(*) as total FROM messages m
      JOIN chats c ON m.chat_id = c.id
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1 AND m.sender = 'bot'
    `, [req.user.id]);
    const total_ai_messages = parseInt(aiMsgsRes.rows[0].total);

    // 8. Count successful (Completed) orders
    const completedOrdersRes = await db.query("SELECT COUNT(*) as total FROM orders WHERE user_id = $1 AND status = 'Completed'", [req.user.id]);
    const total_withdrawals = parseInt(completedOrdersRes.rows[0].total);

    res.json({
      total_earned,
      total_contacts,
      total_tags,
      total_lists,
      active_flows,
      ai_bots,
      total_deposits,
      total_withdrawals,
      total_ai_messages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM Orders CRUD Endpoints ─────────────────────────────────────────
app.get('/api/crm/orders', authenticateToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/crm/orders', authenticateToken, async (req, res) => {
  try {
    const { items, total_amount, shipping_details, status } = req.body;
    const orderId = `ord_${Date.now()}_${Math.round(Math.random() * 1000)}`;
    
    await db.query(
      'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [orderId, req.user.id, JSON.stringify(items || []), total_amount || 0, JSON.stringify(shipping_details || {}), status || 'Pending']
    );

    res.json({ success: true, message: 'Order created successfully.', orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/crm/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { status, shipping_details, items, total_amount } = req.body;
    
    // Load current order to verify ownership
    const check = await db.query('SELECT user_id FROM orders WHERE id = $1', [req.params.orderId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    let updateFields = [];
    let params = [req.params.orderId];
    
    if (status !== undefined) {
      updateFields.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (shipping_details !== undefined) {
      updateFields.push(`shipping_details = $${params.length + 1}`);
      params.push(JSON.stringify(shipping_details));
    }
    if (items !== undefined) {
      updateFields.push(`items = $${params.length + 1}`);
      params.push(JSON.stringify(items));
    }
    if (total_amount !== undefined) {
      updateFields.push(`total_amount = $${params.length + 1}`);
      params.push(total_amount);
    }

    if (updateFields.length > 0) {
      await db.query(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = $1`, params);
    }

    res.json({ success: true, message: 'Order updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/crm/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const check = await db.query('SELECT user_id FROM orders WHERE id = $1', [req.params.orderId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await db.query('DELETE FROM orders WHERE id = $1', [req.params.orderId]);
    res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM Customers Endpoint (Confirmed or Pending Delivery chats) ───────
app.get('/api/crm/customers', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT DISTINCT c.* FROM chats c
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      LEFT JOIN orders o ON o.user_id = ws.user_id AND (o.shipping_details->>'phone' = c.sender_phone OR c.last_message ILIKE '%confirm%')
      WHERE ws.user_id = $1 AND (c.label IN ('Confirmed', 'Interested') OR o.id IS NOT NULL)
      ORDER BY c.updated_at DESC
    `, [req.user.id]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Courier Tracking Endpoints ─────────────────────────────────────────
app.patch('/api/crm/orders/:orderId/tracking', authenticateToken, async (req, res) => {
  try {
    const { courier_name, tracking_number, tracking_status } = req.body;
    
    // Verify ownership
    const check = await db.query('SELECT user_id FROM orders WHERE id = $1', [req.params.orderId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Query live courier API connector
    const { queryCourierAPI } = require('./couriers');
    const apiHistory = await queryCourierAPI(courier_name || 'Sri Lanka Post', tracking_number);
    const finalStatus = tracking_status || apiHistory[apiHistory.length - 1]?.status || 'Out for Delivery';

    await db.query(`
      UPDATE orders 
      SET courier_name = $1, tracking_number = $2, tracking_status = $3, tracking_history = $4
      WHERE id = $5
    `, [courier_name, tracking_number, finalStatus, JSON.stringify(apiHistory), req.params.orderId]);

    res.json({ success: true, message: 'Courier tracking details updated successfully.', tracking_history: apiHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/crm/track/:trackingNumber', authenticateToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM orders WHERE tracking_number = $1 AND user_id = $2', [req.params.trackingNumber, req.user.id]);
    const { queryCourierAPI } = require('./couriers');

    if (r.rows.length === 0) {
      // Simulate live external lookup
      const simulatedHistory = await queryCourierAPI('Sri Lanka Post', req.params.trackingNumber);
      return res.json({
        id: 'ord_mock_123',
        courier_name: 'Sri Lanka Post',
        tracking_number: req.params.trackingNumber,
        tracking_status: simulatedHistory[simulatedHistory.length - 1]?.status || 'Out for Delivery',
        tracking_history: simulatedHistory
      });
    }

    const order = r.rows[0];
    const liveHistory = await queryCourierAPI(order.courier_name || 'Sri Lanka Post', order.tracking_number);
    const latestStatus = liveHistory[liveHistory.length - 1]?.status || 'In Transit';

    await db.query('UPDATE orders SET tracking_history = $1, tracking_status = $2 WHERE id = $3', [
      JSON.stringify(liveHistory),
      latestStatus,
      order.id
    ]);

    order.tracking_history = liveHistory;
    order.tracking_status = latestStatus;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ── Plans Configuration Endpoints ──────────────────────────────────────────
app.get('/api/plans', async (req, res) => {
  try {
    const plansRes = await db.query('SELECT * FROM plans ORDER BY price ASC');
    res.json(plansRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/plans/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, features, disabledFeatures } = req.body;
  try {
    await db.query(
      `UPDATE plans 
       SET name = $1, price = $2, features = $3, disabled_features = $4 
       WHERE id = $5`,
      [name, parseFloat(price), JSON.stringify(features), JSON.stringify(disabledFeatures), id]
    );
    await logAuditEvent('Plan Updated', `Admin updated plan ${id} (${name}) details: price set to රු ${price}`);
    res.json({ success: true, message: `Plan ${id} updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Audit Logging Helper & Endpoint ─────────────────────────────────────────
async function logAuditEvent(action, details) {
  try {
    await db.query(
      'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
      [action, details]
    );
    console.log(`[AUDIT] ${action}: ${details}`);
  } catch (err) {
    console.error('Audit logging failed:', err.message);
  }
}

app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── System Admin Portal API (Requires admin auth header validation) ──────────
app.get('/api/admin/system-settings', async (req, res) => {
  try {
    const keyQuery = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const apiKey = keyQuery.rows.length > 0 ? keyQuery.rows[0].value : '';
    res.json({ geminiApiKey: apiKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/system-settings', async (req, res) => {
  const { geminiApiKey } = req.body;
  try {
    await db.query(`
      INSERT INTO system_settings (key, value)
      VALUES ('gemini_api_key', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1
    `, [geminiApiKey]);
    await logAuditEvent('Gemini API Key Updated', 'Admin updated global Gemini API Key');
    res.json({ success: true, message: 'System settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple validation since this is the dedicated dashboard
app.get('/api/admin/overview', async (req, res) => {
  try {
    const usersCount = await db.query('SELECT count(*) FROM users');
    const sessionsCount = await db.query('SELECT count(*) FROM whatsapp_sessions');
    const activeRes = await db.query("SELECT count(*) FROM whatsapp_sessions WHERE status = 'Connected'");
    
    // User plan counts
    const freeRes = await db.query("SELECT count(*) FROM users WHERE plan = 'Free'");
    const premiumRes = await db.query("SELECT count(*) FROM users WHERE plan = 'Premium'");
    const enterpriseRes = await db.query("SELECT count(*) FROM users WHERE plan = 'Enterprise'");
    
    const freeCount = parseInt(freeRes.rows[0].count);
    const premiumCount = parseInt(premiumRes.rows[0].count);
    const enterpriseCount = parseInt(enterpriseRes.rows[0].count);

    // Fetch plan prices to compute MRR dynamically
    const plansQuery = await db.query("SELECT id, price FROM plans");
    const prices = {};
    plansQuery.rows.forEach(p => {
      prices[p.id] = parseFloat(p.price);
    });

    const premiumPrice = prices['Premium'] || 4990.00;
    const enterprisePrice = prices['Enterprise'] || 12990.00;

    const calculatedMRR = (premiumCount * premiumPrice) + (enterpriseCount * enterprisePrice);
    const totalUsers = parseInt(usersCount.rows[0].count);
    const calculatedARPU = totalUsers > 0 ? (calculatedMRR / totalUsers) : 0;

    res.json({
      totalUsers,
      totalSessions: parseInt(sessionsCount.rows[0].count),
      activeSessions: parseInt(activeRes.rows[0].count),
      nodeHealth: 'Healthy',
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      uptime: `${Math.round(process.uptime())}s`,
      distribution: {
        Free: freeCount,
        Premium: premiumCount,
        Enterprise: enterpriseCount
      },
      mrr: calculatedMRR,
      arpu: calculatedARPU
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
    const userRes = await db.query('SELECT status, email FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const nextStatus = userRes.rows[0].status === 'Active' ? 'Suspended' : 'Active';
    const email = userRes.rows[0].email;
    await db.query('UPDATE users SET status = $1 WHERE id = $2', [nextStatus, id]);
    await logAuditEvent('User Status Changed', `User status for ${email} (ID ${id}) toggled to ${nextStatus}`);
    
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
    await logAuditEvent('WhatsApp Session Terminated', `Terminated session for ID: ${id}`);
    res.json({ success: true, message: 'Session terminated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe Payments Endpoints ────────────────────────────────────────────────
app.post('/api/payments/create-checkout-session', authenticateToken, async (req, res) => {
  const { plan, billingCycle } = req.body;
  const cycle = billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';
  
  try {
    const stripe = await getDynamicStripe();
    const isConfigured = await isStripeConfigured();

    const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [plan]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plan value' });
    }
    const planRow = planRes.rows[0];

    // Determine LKR price based on plan and cycle dynamically
    let priceLkr = 0;
    if (plan === 'Premium') {
      priceLkr = cycle === 'Yearly' ? 30000.00 : 3000.00;
    } else if (plan === 'Enterprise') {
      priceLkr = cycle === 'Yearly' ? 65000.00 : 6200.00;
    } else {
      priceLkr = parseFloat(planRow.price);
    }
    
    const amountCents = Math.round(priceLkr * 100);

    if (!isConfigured) {
      // Mock Stripe mode fallback for testing
      const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);
      await db.query(
        `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
         VALUES ($1, $2, $3, 'LKR', $4, 'Pending')`,
        [req.user.id, mockSessionId, priceLkr, plan]
      );
      return res.json({ url: `http://localhost:5173/user/subscription/index?session_id=${mockSessionId}&mock=true&billing_cycle=${cycle}` });
    }

    const userRes = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    const stripeCustomerId = userRes.rows[0]?.stripe_customer_id;

    const sessionOpts = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'lkr',
          product_data: {
            name: `AgentBunny ${planRow.name} (${cycle})`,
            description: `Access to features of the ${planRow.name} (${cycle} billing).`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:5173/user/subscription/index?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/user/subscription/index?cancelled=true`,
      client_reference_id: req.user.id.toString(),
      metadata: {
        plan: plan,
        userId: req.user.id.toString(),
        billingCycle: cycle
      }
    };
    if (stripeCustomerId) {
      sessionOpts.customer = stripeCustomerId;
    }

    const session = await stripe.checkout.sessions.create(sessionOpts);

    // Log the transaction
    await db.query(
      `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
       VALUES ($1, $2, $3, 'LKR', $4, 'Pending')`,
      [req.user.id, session.id, priceLkr, plan]
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session creation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/confirm-session', authenticateToken, async (req, res) => {
  const { sessionId, billingCycle } = req.body;
  try {
    const trans = await db.query('SELECT * FROM transactions WHERE stripe_session_id = $1', [sessionId]);
    if (trans.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const transaction = trans.rows[0];
    if (transaction.status === 'Pending') {
      // Upgrade user plan and complete transaction in DB
      await db.query("UPDATE transactions SET status = 'Completed' WHERE stripe_session_id = $1", [sessionId]);
      
      let cycle = billingCycle || 'Monthly';
      if (sessionId && !sessionId.startsWith('cs_test_')) {
        try {
          const stripe = await getDynamicStripe();
          const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
          if (stripeSession && stripeSession.metadata && stripeSession.metadata.billingCycle) {
            cycle = stripeSession.metadata.billingCycle;
          }
        } catch (stripeErr) {
          console.warn('Could not fetch Stripe session for billing cycle:', stripeErr.message);
        }
      }

      const expiry = new Date();
      if (cycle === 'Yearly') {
        expiry.setDate(expiry.getDate() + 365); // 1 year validity
      } else {
        expiry.setDate(expiry.getDate() + 30);  // 30 days validity
      }
      
      await db.query(
        "UPDATE users SET plan = $1, status = 'Active', plan_expires_at = $2, auto_renewal = TRUE, billing_cycle = $3 WHERE id = $4", 
        [transaction.plan, expiry, cycle, req.user.id]
      );
      
      const userRes = await db.query('SELECT id, email, full_name, plan, status, auto_renewal, plan_expires_at, billing_cycle FROM users WHERE id = $1', [req.user.id]);
      return res.json({ success: true, plan: transaction.plan, user: userRes.rows[0] });
    }
    
    res.json({ success: true, plan: transaction.plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/fail-session', authenticateToken, async (req, res) => {
  const { sessionId } = req.body;
  try {
    const trans = await db.query('SELECT * FROM transactions WHERE stripe_session_id = $1', [sessionId]);
    if (trans.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await db.query("UPDATE transactions SET status = 'Failed' WHERE stripe_session_id = $1", [sessionId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/charge-saved-card', authenticateToken, async (req, res) => {
  console.log('CHARGE SAVED CARD ENDPOINT CALLED WITH BODY:', req.body);
  const { plan, billingCycle, paymentMethodId } = req.body;
  const cycle = billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';

  try {
    const isConfigured = await isStripeConfigured();
    const stripe = await getDynamicStripe();

    const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [plan]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plan value' });
    }
    const planRow = planRes.rows[0];

    // Determine LKR price based on plan and cycle dynamically
    let priceLkr = 0;
    if (plan === 'Premium') {
      priceLkr = cycle === 'Yearly' ? 30000.00 : 3000.00;
    } else if (plan === 'Enterprise') {
      priceLkr = cycle === 'Yearly' ? 65000.00 : 6200.00;
    } else {
      priceLkr = parseFloat(planRow.price);
    }

    const userRes = await db.query('SELECT id, stripe_customer_id, email, full_name FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    const customerId = user.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer associated with user.' });
    }

    // Verify payment method is owned by the user
    const pmRes = await db.query('SELECT * FROM user_payment_methods WHERE stripe_payment_method_id = $1 AND user_id = $2', [paymentMethodId, req.user.id]);
    if (pmRes.rows.length === 0) {
      return res.status(404).json({ error: 'Selected payment method not found.' });
    }

    // If Mock Mode
    if (!isConfigured || paymentMethodId.startsWith('pm_mock_')) {
      const isFailed = paymentMethodId.toLowerCase().includes('fail') || paymentMethodId.toLowerCase().includes('decline');
      const mockTxId = 'ch_mock_' + Math.random().toString(36).substring(2, 12);
      
      if (isFailed) {
        await db.query(
          `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
           VALUES ($1, $2, $3, 'LKR', $4, 'Failed')`,
          [req.user.id, mockTxId, priceLkr, plan]
        );
        return res.status(400).json({ error: 'Transaction declined by issuer.' });
      }

      await db.query(
        `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
         VALUES ($1, $2, $3, 'LKR', $4, 'Completed')`,
        [req.user.id, mockTxId, priceLkr, plan]
      );

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (cycle === 'Yearly' ? 365 : 30));
      
      await db.query(
        "UPDATE users SET plan = $1, status = 'Active', plan_expires_at = $2, auto_renewal = TRUE, billing_cycle = $3 WHERE id = $4", 
        [plan, expiry, cycle, req.user.id]
      );

      const updatedUserRes = await db.query('SELECT id, email, full_name, plan, status, auto_renewal, plan_expires_at, billing_cycle FROM users WHERE id = $1', [req.user.id]);
      return res.json({ success: true, plan, user: updatedUserRes.rows[0] });
    }

    // Live Stripe charge using Payment Intent
    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(priceLkr * 100), // convert to LKR cents
        currency: 'lkr',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: false
      });

      return res.json({ success: false, requiresAction: true, clientSecret: intent.client_secret, paymentIntentId: intent.id });
    } catch (stripeErr) {
      console.error('Stripe PaymentIntent creation error:', stripeErr.message);
      const mockTxId = 'ch_err_' + Math.random().toString(36).substring(2, 12);
      await db.query(
        `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
         VALUES ($1, $2, $3, 'LKR', $4, 'Failed')`,
        [req.user.id, mockTxId, priceLkr, plan]
      );
      return res.status(400).json({ error: stripeErr.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/confirm-payment-intent', authenticateToken, async (req, res) => {
  console.log('CONFIRM PAYMENT INTENT ENDPOINT CALLED WITH BODY:', req.body);
  const { paymentIntentId, plan, billingCycle } = req.body;
  const cycle = billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';

  try {
    const stripe = await getDynamicStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status === 'succeeded') {
      const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [plan]);
      if (planRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid plan value' });
      }
      const planRow = planRes.rows[0];

      // Determine LKR price based on plan and cycle dynamically
      let priceLkr = 0;
      if (plan === 'Premium') {
        priceLkr = cycle === 'Yearly' ? 30000.00 : 3000.00;
      } else if (plan === 'Enterprise') {
        priceLkr = cycle === 'Yearly' ? 65000.00 : 6200.00;
      } else {
        priceLkr = parseFloat(planRow.price);
      }

      // Check if transaction is already logged
      const txCheck = await db.query('SELECT * FROM transactions WHERE stripe_session_id = $1', [intent.id]);
      if (txCheck.rows.length === 0) {
        await db.query(
          `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
           VALUES ($1, $2, $3, 'LKR', $4, 'Completed')`,
          [req.user.id, intent.id, priceLkr, plan]
        );

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (cycle === 'Yearly' ? 365 : 30));
        
        await db.query(
          "UPDATE users SET plan = $1, status = 'Active', plan_expires_at = $2, auto_renewal = TRUE, billing_cycle = $3 WHERE id = $4", 
          [plan, expiry, cycle, req.user.id]
        );
      }

      const updatedUserRes = await db.query('SELECT id, email, full_name, plan, status, auto_renewal, plan_expires_at, billing_cycle FROM users WHERE id = $1', [req.user.id]);
      return res.json({ success: true, plan, user: updatedUserRes.rows[0] });
    } else {
      return res.status(400).json({ error: `Payment intent status: ${intent.status}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event = req.body;

  try {
    const stripe = await getDynamicStripe();
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      try {
        event = stripe.webhooks.constructEvent(req.rawBody || JSON.stringify(req.body), sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.warn('Stripe webhook verification failed, using payload directly:', err.message);
      }
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata?.userId;
    const plan = session.metadata?.plan;
    const stripeId = session.id;
    const amount = session.amount_total ? (session.amount_total / 100) : 0;
    const currency = session.currency ? session.currency.toUpperCase() : 'LKR';

    if (userId && plan) {
      try {
        const cycle = session.metadata?.billingCycle === 'Yearly' ? 'Yearly' : 'Monthly';
        const expiry = new Date();
        if (cycle === 'Yearly') {
          expiry.setDate(expiry.getDate() + 365); // 1 year validity
        } else {
          expiry.setDate(expiry.getDate() + 30);  // 30 days validity
        }

        await db.query(
          "UPDATE users SET plan = $1, status = 'Active', plan_expires_at = $2, auto_renewal = TRUE, billing_cycle = $3 WHERE id = $4", 
          [plan, expiry, cycle, userId]
        );
        await db.query(`
          INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
          VALUES ($1, $2, $3, $4, $5, 'Completed')
          ON CONFLICT (stripe_session_id) DO UPDATE SET status = 'Completed'
        `, [userId, stripeId, amount, currency, plan]);
        await logAuditEvent('Stripe Plan Purchase', `User ID ${userId} upgraded to ${plan} via Stripe session ${stripeId} (Amount: ${currency} ${amount})`);
        console.log(`Plan upgraded for user ${userId} to ${plan} via Stripe webhook.`);
      } catch (dbErr) {
        console.error('Database update failed in stripe webhook:', dbErr.message);
      }
    }
  }

  res.json({ received: true });
});

// ── In-App Stripe Card & Trial Abuse Check Endpoints ─────────────────────────
app.get('/api/payments/stripe-key', authenticateToken, async (req, res) => {
  let publicKey = process.env.STRIPE_PUBLIC_KEY;
  try {
    const r = await db.query("SELECT value FROM system_settings WHERE key = 'stripe_public_key'");
    if (r.rows.length > 0 && r.rows[0].value) {
      publicKey = r.rows[0].value;
    }
  } catch (err) {}
  res.json({ 
    stripeKey: publicKey || 'pk_test_51P6W9cCGnN9vK9jQzTestKey'
  });
});

app.get('/api/payments/methods', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, stripe_payment_method_id, card_brand, card_last4, is_default, created_at 
       FROM user_payment_methods 
       WHERE user_id = $1 
       ORDER BY created_at DESC`, 
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments/transactions', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/methods/save', authenticateToken, async (req, res) => {
  const { paymentMethodId } = req.body;
  if (!paymentMethodId) {
    return res.status(400).json({ error: 'Missing paymentMethodId' });
  }

  try {
    const stripe = await getDynamicStripe();
    const isConfigured = await isStripeConfigured();

    const userRes = await db.query('SELECT stripe_customer_id, email, full_name FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      if (isConfigured) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.full_name,
          metadata: { userId: req.user.id.toString() }
        });
        customerId = customer.id;
      } else {
        customerId = 'cus_mock_' + Math.random().toString(36).substring(2, 10);
      }
      await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user.id]);
    }

    let cardBrand = 'Visa';
    let cardLast4 = '4242';
    let cardFingerprint = 'mock_visa_fingerprint_' + Math.random().toString(36).substring(2, 10);

    if (isConfigured && !paymentMethodId.startsWith('pm_mock_')) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
      
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      cardBrand = pm.card?.brand || 'Card';
      cardLast4 = pm.card?.last4 || '0000';
      cardFingerprint = pm.card?.fingerprint || cardFingerprint;
    } else {
      // Mock mode simulates cards based on ID keyword
      if (paymentMethodId.toLowerCase().includes('mastercard')) {
        cardBrand = 'MasterCard';
        cardLast4 = '8810';
        cardFingerprint = 'mock_mastercard_fingerprint';
      } else if (paymentMethodId.toLowerCase().includes('visa')) {
        cardBrand = 'Visa';
        cardLast4 = '4242';
        cardFingerprint = 'mock_visa_fingerprint';
      }
    }

    // Reset default status of old payment methods first
    await db.query('UPDATE user_payment_methods SET is_default = FALSE WHERE user_id = $1', [req.user.id]);

    await db.query(
      `INSERT INTO user_payment_methods (user_id, stripe_payment_method_id, card_brand, card_last4, card_fingerprint, is_default)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (stripe_payment_method_id) DO UPDATE SET is_default = TRUE`,
      [req.user.id, paymentMethodId, cardBrand, cardLast4, cardFingerprint]
    );

    await logAuditEvent('Stripe Card Saved', `User ID ${req.user.id} saved card ${cardBrand} Ending in ${cardLast4}`);

    res.json({ success: true, card: { card_brand: cardBrand, card_last4: cardLast4 } });
  } catch (err) {
    console.error('Save card error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/claim-trial', authenticateToken, async (req, res) => {
  const { planId } = req.body;
  if (!planId) {
    return res.status(400).json({ error: 'Missing planId' });
  }

  try {
    // 0. Check if current user has already claimed a trial on this account
    const userClaimRes = await db.query(
      'SELECT id FROM trial_claims WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );
    if (userClaimRes.rows.length > 0) {
      return res.status(400).json({ error: 'You have already claimed a free trial subscription on this account.' });
    }

    // 1. Check if user has linked card
    const pmRes = await db.query(
      'SELECT card_fingerprint FROM user_payment_methods WHERE user_id = $1 LIMIT 1', 
      [req.user.id]
    );
    if (pmRes.rows.length === 0) {
      return res.status(400).json({ error: 'Please add a payment card under the Payment Method tab first to claim your trial.' });
    }
    const fingerprint = pmRes.rows[0].card_fingerprint;

    // 2. Check for trial abuse via card fingerprint
    const claimRes = await db.query(
      'SELECT id, user_id FROM trial_claims WHERE card_fingerprint = $1 LIMIT 1', 
      [fingerprint]
    );
    if (claimRes.rows.length > 0) {
      return res.status(400).json({ error: 'This payment card has already been used to claim a trial subscription. Trial limits are restricted to one per credit card.' });
    }

    // 3. Log the trial claim and upgrade user plan
    await db.query(
      'INSERT INTO trial_claims (card_fingerprint, user_id) VALUES ($1, $2)', 
      [fingerprint, req.user.id]
    );
    
    // Normalizing plans matching existing database plan names (Pro maps to Premium, Elite maps to Enterprise)
    let dbPlanId = planId;
    if (planId === 'Pro') dbPlanId = 'Premium';
    else if (planId === 'Elite') dbPlanId = 'Enterprise';

    await db.query(
      "UPDATE users SET plan = $1, status = 'Trial' WHERE id = $2", 
      [dbPlanId, req.user.id]
    );

    // Insert a transaction log record for the Free Trial so it shows in Purchase History & Transaction logs
    const mockStripeId = 'trial_' + Math.random().toString(36).substring(2, 10);
    await db.query(
      `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
       VALUES ($1, $2, 0.00, 'LKR', $3, 'Completed')`,
      [req.user.id, mockStripeId, dbPlanId]
    );

    await logAuditEvent('Trial Claimed', `User ID ${req.user.id} claimed 14-day trial of plan ${dbPlanId}`);

    const userRes = await db.query('SELECT id, email, full_name, plan, status FROM users WHERE id = $1', [req.user.id]);
    
    res.json({ success: true, plan: dbPlanId, user: userRes.rows[0] });
  } catch (err) {
    console.error('Claim trial error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/methods/:id/default', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query('SELECT stripe_payment_method_id FROM user_payment_methods WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found or access denied.' });
    }
    const pmId = check.rows[0].stripe_payment_method_id;

    await db.query('UPDATE user_payment_methods SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    await db.query('UPDATE user_payment_methods SET is_default = TRUE WHERE id = $1', [id]);

    const isConfigured = await isStripeConfigured();
    const userRes = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    const customerId = userRes.rows[0]?.stripe_customer_id;

    if (isConfigured && customerId && !pmId.startsWith('pm_mock_')) {
      const stripe = await getDynamicStripe();
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: pmId }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payments/methods/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query('SELECT stripe_payment_method_id, is_default FROM user_payment_methods WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found or access denied.' });
    }
    const { stripe_payment_method_id: pmId, is_default: wasDefault } = check.rows[0];

    const isConfigured = await isStripeConfigured();
    if (isConfigured && !pmId.startsWith('pm_mock_')) {
      try {
        const stripe = await getDynamicStripe();
        await stripe.paymentMethods.detach(pmId);
      } catch (stripeErr) {
        console.warn('Stripe detach error:', stripeErr.message);
      }
    }

    await db.query('DELETE FROM user_payment_methods WHERE id = $1', [id]);

    if (wasDefault) {
      const remaining = await db.query('SELECT id, stripe_payment_method_id FROM user_payment_methods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
      if (remaining.rows.length > 0) {
        const nextDefaultId = remaining.rows[0].id;
        const nextPmId = remaining.rows[0].stripe_payment_method_id;
        await db.query('UPDATE user_payment_methods SET is_default = TRUE WHERE id = $1', [nextDefaultId]);

        const userRes = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
        const customerId = userRes.rows[0]?.stripe_customer_id;
        if (isConfigured && customerId && !nextPmId.startsWith('pm_mock_')) {
          try {
            const stripe = await getDynamicStripe();
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: nextPmId }
            });
          } catch (stripeErr) {
            console.warn('Stripe default update error:', stripeErr.message);
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/payments/methods', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }

  try {
    const r = await db.query(`
      SELECT pm.id, pm.card_brand, pm.card_last4, pm.card_fingerprint, pm.is_default, pm.created_at,
             u.full_name as user_name, u.email as user_email, u.id as user_id
      FROM user_payment_methods pm
      LEFT JOIN users u ON pm.user_id = u.id
      ORDER BY pm.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/payments/methods/:id', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }

  const { id } = req.params;
  try {
    const check = await db.query('SELECT stripe_payment_method_id, user_id, is_default FROM user_payment_methods WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found.' });
    }
    const { stripe_payment_method_id: pmId, user_id: userId, is_default: wasDefault } = check.rows[0];

    const isConfigured = await isStripeConfigured();
    if (isConfigured && !pmId.startsWith('pm_mock_')) {
      try {
        const stripe = await getDynamicStripe();
        await stripe.paymentMethods.detach(pmId);
      } catch (stripeErr) {
        console.warn('Stripe detach error:', stripeErr.message);
      }
    }

    await db.query('DELETE FROM user_payment_methods WHERE id = $1', [id]);

    if (wasDefault) {
      const remaining = await db.query('SELECT id, stripe_payment_method_id FROM user_payment_methods WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
      if (remaining.rows.length > 0) {
        const nextDefaultId = remaining.rows[0].id;
        const nextPmId = remaining.rows[0].stripe_payment_method_id;
        await db.query('UPDATE user_payment_methods SET is_default = TRUE WHERE id = $1', [nextDefaultId]);

        const userRes = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
        const customerId = userRes.rows[0]?.stripe_customer_id;
        if (isConfigured && customerId && !nextPmId.startsWith('pm_mock_')) {
          try {
            const stripe = await getDynamicStripe();
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: nextPmId }
            });
          } catch (stripeErr) {
            console.warn('Stripe default update error:', stripeErr.message);
          }
        }
      }
    }

    await logAuditEvent('Card Removed by Admin', `Admin deleted payment method ID ${id} belonging to User ID ${userId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/suspicious-activity', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }

  try {
    const duplicateWhatsapps = await db.query(`
      WITH dup_phones AS (
        SELECT phone 
        FROM whatsapp_sessions 
        WHERE phone IS NOT NULL AND phone != '' AND status = 'Connected'
        GROUP BY phone 
        HAVING COUNT(DISTINCT user_id) > 1
      )
      SELECT ws.id as session_id, ws.session_name, ws.phone, ws.status, ws.library, ws.created_at,
             u.id as user_id, u.full_name as user_name, u.email as user_email
      FROM whatsapp_sessions ws
      INNER JOIN dup_phones dp ON ws.phone = dp.phone
      LEFT JOIN users u ON ws.user_id = u.id
      WHERE ws.status = 'Connected'
      ORDER BY ws.phone, u.id
    `);

    const duplicateCards = await db.query(`
      WITH dup_fingerprints AS (
        SELECT card_fingerprint 
        FROM user_payment_methods 
        WHERE card_fingerprint IS NOT NULL AND card_fingerprint != ''
        GROUP BY card_fingerprint 
        HAVING COUNT(DISTINCT user_id) > 1
      )
      SELECT pm.id as method_id, pm.card_brand, pm.card_last4, pm.card_fingerprint, pm.created_at, pm.is_default,
             u.id as user_id, u.full_name as user_name, u.email as user_email
      FROM user_payment_methods pm
      INNER JOIN dup_fingerprints df ON pm.card_fingerprint = df.card_fingerprint
      LEFT JOIN users u ON pm.user_id = u.id
      ORDER BY pm.card_fingerprint, u.id
    `);

    res.json({
      duplicateWhatsapps: duplicateWhatsapps.rows,
      duplicateCards: duplicateCards.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Billing & Users Endpoints ──────────────────────────────────────────
app.get('/api/admin/transactions', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT t.*, u.full_name as user_name, u.email as user_email 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/plan', async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  if (!['Free', 'Premium', 'Enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    const email = userRes.rows.length > 0 ? userRes.rows[0].email : `ID ${id}`;
    await db.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, id]);
    await logAuditEvent('User Plan Overridden', `Admin manually updated User ${email} (ID ${id}) plan to ${plan}`);
    res.json({ success: true, message: `User plan upgraded to ${plan}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoint: list all WhatsApp sessions across all users
app.get('/api/admin/whatsapp/sessions', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }

  try {
    const sessionsRes = await db.query(`
      SELECT ws.id, ws.session_name, ws.phone, ws.status, ws.library, ws.uptime, ws.memory, ws.created_at,
             u.full_name as user_name, u.email as user_email
      FROM whatsapp_sessions ws
      LEFT JOIN users u ON ws.user_id = u.id
      ORDER BY ws.created_at DESC
    `);
    res.json(sessionsRes.rows);
  } catch (err) {
    console.error('Fetch admin whatsapp sessions error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin endpoint: update session name / status for any user
app.patch('/api/admin/whatsapp/sessions/:sessionId', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }

  const { sessionId } = req.params;
  const { session_name, status } = req.body;

  try {
    let updateFields = [];
    let values = [];
    let placeholderIdx = 1;

    if (session_name !== undefined) {
      updateFields.push(`session_name = $${placeholderIdx}`);
      values.push(session_name);
      placeholderIdx++;
    }

    if (status !== undefined) {
      updateFields.push(`status = $${placeholderIdx}`);
      values.push(status);
      placeholderIdx++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(sessionId);
    const query = `UPDATE whatsapp_sessions SET ${updateFields.join(', ')} WHERE id = $${placeholderIdx} RETURNING *`;
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await logAuditEvent('Admin Session Update', `Admin updated WhatsApp session ${sessionId}: ${JSON.stringify(req.body)}`);
    res.json({ success: true, session: result.rows[0] });
  } catch (err) {
    console.error('Admin update session error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin endpoint: force disconnect session
app.post('/api/admin/whatsapp/sessions/:sessionId/disconnect', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }

  const { sessionId } = req.params;
  try {
    await disconnectWhatsAppSession(sessionId);
    await logAuditEvent('Admin Session Terminated', `Admin force-disconnected session ${sessionId}`);
    res.json({ success: true, message: 'WhatsApp session disconnected by Administrator.' });
  } catch (err) {
    console.error('Admin disconnect session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Toggle auto-renewal status for user
app.post('/api/payments/toggle-auto-renewal', authenticateToken, async (req, res) => {
  const { autoRenewal } = req.body;
  try {
    await db.query('UPDATE users SET auto_renewal = $1 WHERE id = $2', [!!autoRenewal, req.user.id]);
    res.json({ success: true, auto_renewal: !!autoRenewal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Subscription Renewal Checker & Card Auto-Charge Engine
async function processSubscriptionRenewals() {
  console.log('Running subscription renewal checks...');
  try {
    // Find users whose subscription has expired (plan_expires_at is in the past) and auto_renewal is enabled
    const expiredUsersRes = await db.query(
      `SELECT id, email, full_name, plan, status, stripe_customer_id, billing_cycle 
       FROM users 
       WHERE plan != 'Free' 
         AND plan_expires_at IS NOT NULL 
         AND plan_expires_at < NOW() 
         AND auto_renewal = TRUE`
    );

    for (const u of expiredUsersRes.rows) {
      console.log(`Processing auto-renewal/charge for user ${u.full_name} (${u.email}), active plan: ${u.plan} (${u.billing_cycle})`);
      
      let amountLkr = 0;
      if (u.plan === 'Premium') {
        amountLkr = u.billing_cycle === 'Yearly' ? 30000.00 : 3000.00;
      } else if (u.plan === 'Enterprise') {
        amountLkr = u.billing_cycle === 'Yearly' ? 65000.00 : 6200.00;
      }

      if (amountLkr === 0) {
        await downgradeUserToFree(u.id, 'Invalid Plan Amount');
        continue;
      }

      // Check if user has a default payment method
      const pmRes = await db.query(
        `SELECT stripe_payment_method_id 
         FROM user_payment_methods 
         WHERE user_id = $1 AND is_default = TRUE 
         LIMIT 1`,
        [u.id]
      );

      if (pmRes.rows.length === 0 || !u.stripe_customer_id) {
        console.log(`No saved payment method found for user ${u.id}, downgrading to Free.`);
        await downgradeUserToFree(u.id, 'No default payment card registered.');
        continue;
      }

      const paymentMethodId = pmRes.rows[0].stripe_payment_method_id;

      try {
        const stripe = await getDynamicStripe();
        // Create an off-session charge using Stripe Payment Intents API
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(amountLkr * 100), // convert to LKR cents
          currency: 'lkr',
          customer: u.stripe_customer_id,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
        });

        if (intent.status === 'succeeded') {
          // Renewal successful! Upgrade validity
          const nextExpiry = new Date();
          if (u.billing_cycle === 'Yearly') {
            nextExpiry.setDate(nextExpiry.getDate() + 365); // 1 year validity
          } else {
            nextExpiry.setDate(nextExpiry.getDate() + 30);  // 30 days validity
          }

          await db.query(
            `UPDATE users 
             SET status = 'Active', plan_expires_at = $1 
             WHERE id = $2`,
            [nextExpiry, u.id]
          );

          // Log transaction record
          await db.query(
            `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
             VALUES ($1, $2, $3, 'LKR', $4, 'Completed')`,
            [u.id, intent.id, amountLkr, u.plan]
          );

          await logAuditEvent('Auto Renewal Success', `User ID ${u.id} renewed to ${u.plan} via Auto-Charge (LKR ${amountLkr})`);
          console.log(`Auto-renewal charge succeeded for user ${u.id}`);
        } else {
          throw new Error(`Stripe status: ${intent.status}`);
        }
      } catch (stripeErr) {
        console.error(`Auto-renewal card charge failed for user ${u.id}:`, stripeErr.message);
        
        // Log failed transaction
        const failedId = 'fail_auto_' + Math.random().toString(36).substring(2, 10);
        await db.query(
          `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
           VALUES ($1, $2, $3, 'LKR', $4, 'Failed')`,
          [u.id, failedId, amountLkr, u.plan]
        );

        await downgradeUserToFree(u.id, `Card charge failed: ${stripeErr.message}`);
      }
    }

    // Downgrade users who expired and did not have auto-renewal enabled
    const nonRenewableExpiredRes = await db.query(
      `SELECT id FROM users 
       WHERE plan != 'Free' 
         AND plan_expires_at IS NOT NULL 
         AND plan_expires_at < NOW() 
         AND auto_renewal = FALSE`
    );
    for (const u of nonRenewableExpiredRes.rows) {
      await downgradeUserToFree(u.id, 'Subscription expired and auto-renewal is disabled.');
    }

  } catch (err) {
    console.error('Renewals processor error:', err.message);
  }
}

async function downgradeUserToFree(userId, reason) {
  try {
    await db.query(
      `UPDATE users 
       SET plan = 'Free', status = 'Active', plan_expires_at = NULL 
       WHERE id = $1`,
      [userId]
    );
    await logAuditEvent('Subscription Expired', `User ID ${userId} downgraded to Free. Reason: ${reason}`);
    console.log(`User ${userId} downgraded to Free. Reason: ${reason}`);
  } catch (err) {
    console.error(`Failed to downgrade user ${userId}:`, err.message);
  }
}

// Run checks every 10 minutes to auto-charge expired users
setInterval(processSubscriptionRenewals, 10 * 60 * 1000);

// Start Express Server & initialize sessions
app.listen(PORT, () => {
  console.log(`AgentBunny Server is running on port ${PORT}`);
  initWhatsAppSessions();
  // Trigger subscription check on server start
  processSubscriptionRenewals();
});
