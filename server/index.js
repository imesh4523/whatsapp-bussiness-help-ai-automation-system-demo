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
  getActiveSocket
} from './wa-manager.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_whatsray_123456');

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
      await sock.sendMessage(recipientJid, { text }, sendOpts);
    }

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

    res.json({
      total_earned,
      total_contacts,
      total_tags,
      total_lists,
      active_flows,
      ai_bots,
      total_deposits,
      total_withdrawals: 0.00
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

    // Generate mock shipment history timeline
    const mockHistory = [
      { status: 'Manifest Created', details: 'Seller processed package shipping manifest.', location: 'Seller Warehouse', time: new Date(Date.now() - 48*60*60*1000).toISOString() },
      { status: 'Picked Up', details: `Shipment received and scanned by ${courier_name || 'Courier'}.`, location: 'Courier Depot', time: new Date(Date.now() - 36*60*60*1000).toISOString() },
      { status: 'Sorting', details: 'Package in sorting queue.', location: 'Main Sorting Facility', time: new Date(Date.now() - 24*60*60*1000).toISOString() },
      { status: 'In Transit', details: 'Shipment dispatched to destination hub.', location: 'Transit Center', time: new Date(Date.now() - 12*60*60*1000).toISOString() },
      { status: tracking_status || 'Out for Delivery', details: 'Package out with local delivery agent.', location: 'Delivery Area', time: new Date().toISOString() }
    ];

    await db.query(`
      UPDATE orders 
      SET courier_name = $1, tracking_number = $2, tracking_status = $3, tracking_history = $4
      WHERE id = $5
    `, [courier_name, tracking_number, tracking_status || 'Out for Delivery', JSON.stringify(mockHistory), req.params.orderId]);

    res.json({ success: true, message: 'Courier tracking details updated successfully.', tracking_history: mockHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/crm/track/:trackingNumber', authenticateToken, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM orders WHERE tracking_number = $1 AND user_id = $2', [req.params.trackingNumber, req.user.id]);
    if (r.rows.length === 0) {
      return res.json({
        id: 'ord_mock_123',
        courier_name: 'DHL Express',
        tracking_number: req.params.trackingNumber,
        tracking_status: 'In Transit',
        tracking_history: [
          { status: 'Manifest Created', details: 'Shipping manifest processed.', location: 'Colombo Hub', time: new Date(Date.now() - 24*60*60*1000).toISOString() },
          { status: 'In Transit', details: 'Parcel out for delivery hub dispatch.', location: 'DHL Sorting Center', time: new Date().toISOString() }
        ]
      });
    }
    res.json(r.rows[0]);
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
  const { plan } = req.body;
  try {
    const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [plan]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plan value' });
    }
    const planRow = planRes.rows[0];
    const priceLkr = parseFloat(planRow.price);
    const amountCents = Math.round(priceLkr * 100);

    if (!process.env.STRIPE_SECRET_KEY) {
      // Mock Stripe mode fallback for testing
      const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);
      await db.query(
        `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
         VALUES ($1, $2, $3, 'LKR', $4, 'Pending')`,
        [req.user.id, mockSessionId, priceLkr, plan]
      );
      return res.json({ url: `http://localhost:5173/user/subscription/index?session_id=${mockSessionId}&mock=true` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'lkr',
          product_data: {
            name: `WhatsRay ${planRow.name}`,
            description: `Access to features of the ${planRow.name}.`,
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
        userId: req.user.id.toString()
      }
    });

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
  const { sessionId } = req.body;
  try {
    const trans = await db.query('SELECT * FROM transactions WHERE stripe_session_id = $1', [sessionId]);
    if (trans.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const transaction = trans.rows[0];
    if (transaction.status === 'Pending') {
      // Upgrade user plan and complete transaction in DB
      await db.query("UPDATE transactions SET status = 'Completed' WHERE stripe_session_id = $1", [sessionId]);
      await db.query('UPDATE users SET plan = $1 WHERE id = $2', [transaction.plan, req.user.id]);
      
      const userRes = await db.query('SELECT id, email, full_name, plan, status FROM users WHERE id = $1', [req.user.id]);
      return res.json({ success: true, plan: transaction.plan, user: userRes.rows[0] });
    }
    
    res.json({ success: true, plan: transaction.plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event = req.body;

  try {
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
        await db.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, userId]);
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
  if (req.user.email !== 'admin@whatsray.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
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
  if (req.user.email !== 'admin@whatsray.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
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
  if (req.user.email !== 'admin@whatsray.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
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

// Start Express Server & initialize sessions
app.listen(PORT, () => {
  console.log(`WhatsRay Server is running on port ${PORT}`);
  initWhatsAppSessions();
});
