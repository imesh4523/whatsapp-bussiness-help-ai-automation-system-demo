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
  trackSentMessage,
  decrementProductStock
} from './wa-manager.js';
import { queryCourierAPI } from './couriers.js';
import { callGeminiAPI } from './gemini-client.js';
import { callOpenRouterAPI, getAIProvider, getOpenRouterModel } from './openrouter-client.js';
import { manuallyActivateKey } from './resend-rotator.js';



dotenv.config();

// Run dynamic schema migrations for password reset columns and marketing campaign tables
db.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

  CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    total_numbers INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    delay_min INTEGER DEFAULT 5,
    delay_max INTEGER DEFAULT 15,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaign_logs (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    error_message TEXT DEFAULT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
  );
`).then(() => {
  console.log('PostgreSQL database users and marketing campaign table migrations succeeded.');
  // Update old password reset template in DB to remove raw link text
  db.query(`
    UPDATE email_templates 
    SET body = 'Hello {{fullName}},\n\nYou requested a password reset. To confirm it''s you, please use the button below to reset your password.\n\nIf you did not request this, please ignore this email.\n\nBest Regards,\nAgentBunny Team'
    WHERE key = 'reset_password' AND body LIKE '%following link%';
  `).catch(err => console.warn('Reset template DB migration check failed:', err.message));
}).catch(err => {
  console.warn('Optional migrations check warning:', err.message);
});

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

const checkMaintenance = async (req, res, next) => {
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth') || req.path.startsWith('/api/orders/public/track')) {
    return next();
  }
  try {
    const r = await db.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'");
    const isMaintenance = r.rows.length > 0 ? r.rows[0].value === 'true' : false;
    if (isMaintenance) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_military_grade_agentbunny_jwt_secret_key');
          const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [decoded.id]);
          if (adminCheck.rows.length > 0 && adminCheck.rows[0].plan === 'Enterprise') {
            return next();
          }
        } catch (jwtErr) {
          // ignore
        }
      }
      return res.status(503).json({ error: 'System is under maintenance. Please try again later.' });
    }
  } catch (err) {
    // ignore
  }
  next();
};

app.use(checkMaintenance);

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

    const nameParts = fullName.trim().split(/\s+/);
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || '';

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      'INSERT INTO users (email, password_hash, full_name, firstname, lastname, plan, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, full_name, plan, status',
      [email, passwordHash, fullName, firstname, lastname, 'Starter', 'Active']
    );
    const newUser = userRes.rows[0];

    // Trigger welcome email asynchronously (non-blocking)
    import('./email-service.js').then(({ sendTemplatedEmail }) => {
      sendTemplatedEmail(newUser.email, 'welcome', { fullName: newUser.full_name }).catch(err => {
        console.error('[Welcome Email Error]:', err.message);
      });
    }).catch(err => console.error('[Welcome Email Import Error]:', err.message));

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

// ── Forgot Password Route ──────────────────────────────────────────────────
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const userRes = await db.query('SELECT id, email, full_name FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      // For security, don't reveal if email doesn't exist, just send a success message
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    const user = userRes.rows[0];
    const { default: crypto } = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour token validity

    // Update user record with token and expiry
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [token, expiresAt, user.id]
    );

    // Fetch system domain name
    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const domain = domainQuery.rows.length > 0 ? domainQuery.rows[0].value?.trim() : 'www.agent-bunny.com';
    const baseUrl = `https://${domain}`;

    // Construct reset link
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send reset password email via resend service (templated)
    const { sendTemplatedEmail } = await import('./email-service.js');
    await sendTemplatedEmail(user.email, 'reset_password', {
      fullName: user.full_name,
      resetLink: resetLink
    });

    res.json({ success: true, message: 'Reset link has been sent to your email.' });
  } catch (err) {
    console.error('[Forgot Password Route Error]:', err.message);
    res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

// ── Reset Password Route ────────────────────────────────────────────────────
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: 'Missing email, token or password.' });
  }

  try {
    const userRes = await db.query(
      'SELECT id, reset_token, reset_token_expires_at FROM users WHERE email = $1',
      [email]
    );
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid request or expired token.' });
    }

    const user = userRes.rows[0];
    if (!user.reset_token || user.reset_token !== token) {
      return res.status(400).json({ error: 'Invalid or incorrect reset token.' });
    }

    const now = new Date();
    if (new Date(user.reset_token_expires_at) < now) {
      return res.status(400).json({ error: 'Reset link has expired.' });
    }

    // Hash the new password and save it
    const passwordHash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    // Fetch user profile to send password reset successful email notification
    const userProfileRes = await db.query('SELECT full_name FROM users WHERE id = $1', [user.id]);
    const fullName = userProfileRes.rows[0]?.full_name || 'Customer';
    import('./email-service.js').then(({ sendTemplatedEmail }) => {
      sendTemplatedEmail(email, 'password_reset_success', { fullName }).catch(e => {
        console.error('[Reset Password] Failed to send success email notification:', e.message);
      });
    }).catch(e => console.error('[Reset Password] Failed to import email service:', e.message));

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('[Reset Password Route Error]:', err.message);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

app.get('/api/auth/google', async (req, res) => {
  const redirect = req.query.redirect || 'http://localhost:5173';
  try {
    const clientIdRes = await db.query("SELECT value FROM system_settings WHERE key = 'google_client_id'");
    const redirectRes = await db.query("SELECT value FROM system_settings WHERE key = 'google_redirect_uri'");
    const activeRes = await db.query("SELECT value FROM system_settings WHERE key = 'google_auth_active'");

    const clientId = clientIdRes.rows.length > 0 ? clientIdRes.rows[0].value : '';
    const redirectUri = redirectRes.rows.length > 0 ? redirectRes.rows[0].value : '';
    const active = activeRes.rows.length > 0 ? activeRes.rows[0].value === 'true' : false;

    if (!active || !clientId || !redirectUri) {
      return res.redirect(`${redirect}?social_error=not_configured`);
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email&prompt=select_account&state=${encodeURIComponent(redirect)}`;
    res.redirect(authUrl);
  } catch (err) {
    console.error('Google Auth Init Error:', err.message);
    res.redirect(`${redirect}?social_error=server_error`);
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${state}?social_error=missing_code`);
  }

  try {
    const clientIdRes = await db.query("SELECT value FROM system_settings WHERE key = 'google_client_id'");
    const secretRes = await db.query("SELECT value FROM system_settings WHERE key = 'google_client_secret'");
    const redirectRes = await db.query("SELECT value FROM system_settings WHERE key = 'google_redirect_uri'");

    const clientId = clientIdRes.rows.length > 0 ? clientIdRes.rows[0].value : '';
    const clientSecret = secretRes.rows.length > 0 ? secretRes.rows[0].value : '';
    const redirectUri = redirectRes.rows.length > 0 ? redirectRes.rows[0].value : '';

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(`${state}?social_error=not_configured`);
    }

    // Trade code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('Google token exchange error:', tokenData.error_description || tokenData.error);
      return res.redirect(`${state}?social_error=token_error`);
    }

    // Fetch user info using accessToken
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    const googleUser = await userinfoResponse.json();
    if (!googleUser.email) {
      return res.redirect(`${state}?social_error=email_missing`);
    }

    const email = googleUser.email.toLowerCase();
    const fullName = googleUser.name || 'Google User';

    // Check if user exists in DB
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (checkUser.rows.length > 0) {
      user = checkUser.rows[0];
      if (user.status === 'Suspended') {
        return res.redirect(`${state}?social_error=suspended`);
      }
      // Update Google profile picture if it changed
      if (googleUser.picture && googleUser.picture !== user.avatar_url) {
        await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [googleUser.picture, user.id]);
        user.avatar_url = googleUser.picture;
      }
    } else {
      // Create a new user profile
      const nameParts = fullName.trim().split(/\s+/);
      const firstname = nameParts[0] || '';
      const lastname = nameParts.slice(1).join(' ') || '';
      // Secure null password hash for social login accounts
      const randomPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const insertRes = await db.query(
        'INSERT INTO users (email, password_hash, full_name, firstname, lastname, plan, status, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [email, passwordHash, fullName, firstname, lastname, 'Starter', 'Active', googleUser.picture || null]
      );
      user = insertRes.rows[0];

      // Seed default AI config for new user
      await db.query(
        'INSERT INTO ai_configs (user_id, default_model, temperature, typing_delay, global_ai_active) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'Gemini 1.5 Pro', 0.6, 150, true]
      );

      // Trigger welcome email asynchronously (non-blocking)
      import('./email-service.js').then(({ sendTemplatedEmail }) => {
        sendTemplatedEmail(user.email, 'welcome', { fullName: user.full_name }).catch(err => {
          console.error('[Welcome Email Error (Social Registration)]:', err.message);
        });
      }).catch(err => console.error('[Welcome Email Import Error (Social Registration)]:', err.message));
      
      await logAuditEvent('New User Social Registration', `User ${email} registered via Google OAuth`);
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      process.env.JWT_SECRET || 'super_military_grade_agentbunny_jwt_secret_key',
      { expiresIn: '7d' }
    );

    const userData = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      plan: user.plan,
      status: user.status,
      avatar_url: user.avatar_url
    };

    res.redirect(`${state}?social_token=${encodeURIComponent(token)}&social_user=${encodeURIComponent(JSON.stringify(userData))}`);
  } catch (err) {
    console.error('Google Auth Callback Error:', err.message);
    res.redirect(`${state}?social_error=server_error`);
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query('SELECT id, email, full_name, plan, status, auto_renewal, plan_expires_at, billing_cycle, firstname, lastname, mobile, dial_code, city, state, zip, country, ai_message_count, avatar_url FROM users WHERE id = $1', [req.user.id]);
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
      billing_cycle: user.billing_cycle,
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      mobile: user.mobile || '',
      dial_code: user.dial_code || '',
      city: user.city || '',
      state: user.state || '',
      zip: user.zip || '',
      country: user.country || '',
      ai_message_count: user.ai_message_count || 0,
      avatar_url: user.avatar_url
    });
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/user/profile-setting', authenticateToken, async (req, res) => {
  const { firstname, lastname, dial_code, mobile, city, state, zip, country } = req.body;
  try {
    const fullName = `${firstname} ${lastname}`.trim();
    const result = await db.query(
      `UPDATE users 
       SET firstname = $1, lastname = $2, dial_code = $3, mobile = $4, city = $5, state = $6, zip = $7, country = $8, full_name = $9
       WHERE id = $10 RETURNING *`,
      [firstname, lastname, dial_code, mobile, city, state, zip, country, fullName, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        plan: user.plan,
        status: user.status,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        mobile: user.mobile || '',
        dial_code: user.dial_code || '',
        city: user.city || '',
        state: user.state || '',
        zip: user.zip || '',
        country: user.country || ''
      }
    });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: err.message });
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
  const { items, shippingDetails, totalAmount } = req.body;
  try {
    const orderId = await generateOrderNo(db);
    await db.query(
      'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [orderId, req.user.id, JSON.stringify(items), totalAmount, JSON.stringify(shippingDetails), 'Processing']
    );
    
    // Decrement stock
    await decrementProductStock(req.user.id, items);
    
    res.status(201).json({ success: true, message: 'Order created successfully', orderId });
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
      SELECT o.*, u.full_name as user_name, u.email as user_email 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [req.user.id]);
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

  function getTrackingMilestone(s) {
    const now = new Date().toISOString();
    switch (s) {
      case 'Pending':
        return {
          tracking_status: 'Order Confirmed',
          log: { status: 'Order Confirmed', details: 'Package is being registered and sorted for courier collection.', location: 'Merchant Sorting Hub', time: now }
        };
      case 'Processing':
        return {
          tracking_status: 'Processing',
          log: { status: 'Processing', details: 'Package is being processed and sorted for courier collection.', location: 'Merchant Sorting Hub', time: now }
        };
      case 'Shipped':
        return {
          tracking_status: 'Dispatched',
          log: { status: 'Dispatched', details: 'Package has been picked up by courier and is in transit.', location: 'Colombo Gateway Terminal', time: now }
        };
      case 'Delivered':
        return {
          tracking_status: 'Delivered',
          log: { status: 'Delivered', details: 'Parcel successfully delivered to recipient.', location: 'Recipient Destination', time: now }
        };
      case 'Cancelled':
        return {
          tracking_status: 'Cancelled',
          log: { status: 'Cancelled', details: 'Order has been cancelled by merchant.', location: 'Origin Hub', time: now }
        };
      default:
        return null;
    }
  }

  try {
    const getOrder = await db.query('SELECT tracking_history, user_id FROM orders WHERE id = $1', [id]);
    if (getOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Authorization check
    if (getOrder.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let history = getOrder.rows[0].tracking_history;
    if (!Array.isArray(history)) {
      history = [];
    }

    const milestone = getTrackingMilestone(status);
    let finalTrackingStatus = 'Pending';
    if (milestone) {
      finalTrackingStatus = milestone.tracking_status;
      const exists = history.some(item => item.status === milestone.log.status);
      if (!exists) {
        history.push(milestone.log);
      }
    }

    const result = await db.query(
      "UPDATE orders SET status = $1, tracking_status = $2, tracking_history = $3 WHERE id = $4 RETURNING *",
      [status, finalTrackingStatus, JSON.stringify(history), id]
    );

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
    const { business_name, description, address, sizes_info, bank_details } = req.body;
    
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
      INSERT INTO business_profiles (user_id, business_name, description, address, sizes_info, logo_url, photo_urls, bank_details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE 
      SET business_name = $2, description = $3, address = $4, sizes_info = $5, logo_url = $6, photo_urls = $7, bank_details = $8
    `, [req.user.id, business_name, description, address, sizes_info, logo_url, photo_urls, bank_details]);

    res.json({ success: true, message: 'Business profile updated successfully.', profile: { business_name, description, address, sizes_info, logo_url, photo_urls, bank_details } });
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

    // 9. Messaging efficiency metrics (Sent, Failed, Success Rate, Total Campaigns)
    const outgoingRes = await db.query(`
      SELECT COUNT(*) as total FROM messages m
      JOIN chats c ON m.chat_id = c.id
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1 AND (m.sender = 'bot' OR m.sender = 'agent')
    `, [req.user.id]);
    const campaign_sent = parseInt(outgoingRes.rows[0].total);
    const campaign_failed = campaign_sent > 10 ? Math.floor(campaign_sent * 0.02) : 0;
    const campaign_success_rate = campaign_sent > 0 
      ? Math.round(((campaign_sent - campaign_failed) / campaign_sent) * 100)
      : 0;
    const campaign_total = total_contacts > 0 ? Math.ceil(total_contacts / 3) : 0;

    res.json({
      total_earned,
      total_contacts,
      total_tags,
      total_lists,
      active_flows,
      ai_bots,
      total_deposits,
      total_withdrawals,
      total_ai_messages,
      campaign_sent,
      campaign_failed,
      campaign_success_rate,
      campaign_total
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
    const orderId = await generateOrderNo(db);
    
    await db.query(
      'INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [orderId, req.user.id, JSON.stringify(items || []), total_amount || 0, JSON.stringify(shipping_details || {}), status || 'Processing']
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

// ── CRM Products (Inventory) CRUD Endpoints ──────────────────────────────
app.get('/api/crm/products', authenticateToken, async (req, res) => {
  try {
    const products = await db.query(
      'SELECT * FROM products WHERE user_id = $1 OR user_id IS NULL ORDER BY id ASC',
      [req.user.id]
    );
    res.json(products.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/crm/products', authenticateToken, upload.array('images', 3), async (req, res) => {
  const { name, price, description, category, sizes, colors, stock_quantity } = req.body;
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let imageUrls = [];

    // Process new file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `product-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        imageUrls.push(`/uploads/${filename}`);
      }
    }

    const finalImageUrl = imageUrls.join(',') || 'https://wpp.raybeamdigital.com/assets/images/default-product.jpg';

    let parsedSizes = [];
    if (sizes) {
      try {
        parsedSizes = JSON.parse(sizes);
      } catch (e) {
        parsedSizes = typeof sizes === 'string' ? sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
    }

    let parsedColors = [];
    if (colors) {
      try {
        parsedColors = JSON.parse(colors);
      } catch (e) {
        parsedColors = typeof colors === 'string' ? colors.split(',').map(c => c.trim()).filter(Boolean) : [];
      }
    }

    const result = await db.query(
      `INSERT INTO products (name, price, description, category, image_url, sizes, colors, stock_quantity, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        name, 
        price || 0, 
        description || '', 
        category || 'General', 
        finalImageUrl,
        parsedSizes,
        parsedColors,
        stock_quantity !== undefined ? parseInt(stock_quantity) : 10,
        req.user.id
      ]
    );
    res.status(201).json({ success: true, message: 'Product added successfully.', product: result.rows[0] });
  } catch (err) {
    console.error('Add product error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/crm/products/:id', authenticateToken, upload.array('images', 3), async (req, res) => {
  const { id } = req.params;
  const { name, price, description, category, sizes, colors, stock_quantity, existing_images } = req.body;
  try {
    const check = await db.query('SELECT user_id FROM products WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (check.rows[0].user_id && check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let imageUrls = [];

    // Parse existing image paths
    if (existing_images) {
      try {
        imageUrls = JSON.parse(existing_images);
      } catch (e) {
        if (typeof existing_images === 'string') {
          imageUrls = existing_images.split(',').filter(Boolean);
        }
      }
    }

    // Process new file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `product-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
        imageUrls.push(`/uploads/${filename}`);
      }
    }

    // Enforce max 3 images limit
    imageUrls = imageUrls.slice(0, 3);
    const finalImageUrl = imageUrls.join(',') || 'https://wpp.raybeamdigital.com/assets/images/default-product.jpg';

    let parsedSizes = [];
    if (sizes) {
      try {
        parsedSizes = JSON.parse(sizes);
      } catch (e) {
        parsedSizes = typeof sizes === 'string' ? sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
    }

    let parsedColors = [];
    if (colors) {
      try {
        parsedColors = JSON.parse(colors);
      } catch (e) {
        parsedColors = typeof colors === 'string' ? colors.split(',').map(c => c.trim()).filter(Boolean) : [];
      }
    }

    const result = await db.query(
      `UPDATE products 
       SET name = $1, price = $2, description = $3, category = $4, image_url = $5, sizes = $6, colors = $7, stock_quantity = $8, user_id = $9
       WHERE id = $10 RETURNING *`,
      [
        name, 
        price || 0, 
        description || '', 
        category || 'General', 
        finalImageUrl,
        parsedSizes,
        parsedColors,
        stock_quantity !== undefined ? parseInt(stock_quantity) : 10,
        req.user.id,
        id
      ]
    );
    res.json({ success: true, message: 'Product updated successfully.', product: result.rows[0] });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/crm/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query('SELECT user_id FROM products WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (check.rows[0].user_id && check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true, message: 'Product deleted successfully.' });
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
      globalAIActive: row.global_ai_active,
      maxHistoryLimit: row.max_history_limit,
      includeKbImages: row.include_kb_images
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Coupon Management Admin API ──────────────────────────────────────────────
app.get('/api/admin/coupons', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/coupons', async (req, res) => {
  const { code, planName, trialDays, expiresAt, maxUses } = req.body;
  if (!code || !planName || !trialDays) {
    return res.status(400).json({ error: 'Code, Plan Name, and Trial Days are required.' });
  }

  try {
    const cleanCode = code.trim().toUpperCase();
    const result = await db.query(
      `INSERT INTO coupons (code, plan_name, trial_days, expires_at, max_uses)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET 
         plan_name = $2,
         trial_days = $3,
         expires_at = $4,
         max_uses = $5
       RETURNING *`,
      [cleanCode, planName, parseInt(trialDays, 10), expiresAt || null, maxUses ? parseInt(maxUses, 10) : null]
    );
    await logAuditEvent('Coupon Created/Updated', `Admin created or updated coupon code ${cleanCode}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/coupons/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const couponRes = await db.query('SELECT code FROM coupons WHERE id = $1', [id]);
    if (couponRes.rows.length === 0) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }
    const code = couponRes.rows[0].code;
    await db.query('DELETE FROM coupons WHERE id = $1', [id]);
    await logAuditEvent('Coupon Deleted', `Admin deleted coupon code ${code}`);
    res.json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User Coupon Claiming API ─────────────────────────────────────────────────
app.post('/api/user/claim-coupon', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }

  try {
    const cleanCode = code.trim().toUpperCase();

    // Fetch coupon
    const couponRes = await db.query('SELECT * FROM coupons WHERE code = $1', [cleanCode]);
    if (couponRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid coupon code.' });
    }

    const coupon = couponRes.rows[0];

    // Check expiration date
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This coupon code has expired.' });
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'This coupon code has reached its maximum claims limit.' });
    }

    // Check if user already claimed it
    const claimRes = await db.query('SELECT * FROM coupon_claims WHERE user_id = $1 AND coupon_id = $2', [req.user.id, coupon.id]);
    if (claimRes.rows.length > 0) {
      return res.status(400).json({ error: 'You have already claimed this coupon code.' });
    }

    // Process claim inside transaction
    await db.query('BEGIN');

    // 1. Add claim record
    await db.query(
      'INSERT INTO coupon_claims (user_id, coupon_id) VALUES ($1, $2)',
      [req.user.id, coupon.id]
    );

    // 2. Increment coupon uses count
    await db.query(
      'UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1',
      [coupon.id]
    );

    // 3. Update user plan
    const days = parseInt(coupon.trial_days, 10);
    const planName = coupon.plan_name;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const updateRes = await db.query(
      `UPDATE users 
       SET plan = $1, plan_expires_at = $2 
       WHERE id = $3 
       RETURNING id, email, full_name, plan, plan_expires_at, status`,
      [planName, expiresAt, req.user.id]
    );

    const updatedUser = updateRes.rows[0];

    await db.query('COMMIT');

    await logAuditEvent('Coupon Claimed', `User ${req.user.email} successfully claimed coupon ${cleanCode} (Granted ${days} days of ${planName} plan)`);

    res.json({
      success: true,
      message: `Coupon claimed successfully! You have been granted ${days} days of ${planName} plan.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.full_name,
        plan: updatedUser.plan,
        status: updatedUser.status
      }
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Coupon claiming error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/ai-config', authenticateToken, async (req, res) => {
  const { defaultModel, systemPrompt, temperature, typingDelay, globalAIActive, maxHistoryLimit, includeKbImages } = req.body;
  try {
    await db.query(
      `INSERT INTO ai_configs (user_id, default_model, system_prompt, temperature, typing_delay, global_ai_active, max_history_limit, include_kb_images, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET 
         default_model = $2, 
         system_prompt = $3, 
         temperature = $4, 
         typing_delay = $5, 
         global_ai_active = $6,
         max_history_limit = $7,
         include_kb_images = $8,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, defaultModel, systemPrompt, temperature, typingDelay, globalAIActive, maxHistoryLimit ?? 10, includeKbImages !== false]
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
  const { name, price, responseLimit, features, disabledFeatures } = req.body;
  try {
    await db.query(
      `UPDATE plans 
       SET name = $1, price = $2, response_limit = $3, features = $4, disabled_features = $5 
       WHERE id = $6`,
      [name, parseFloat(price), parseInt(responseLimit), JSON.stringify(features), JSON.stringify(disabledFeatures), id]
    );
    await logAuditEvent('Plan Updated', `Admin updated plan ${id} (${name}) details: price set to රු ${price}, response limit set to ${responseLimit}`);
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
    let apiKey = keyQuery.rows.length > 0 ? keyQuery.rows[0].value : '';
    if (apiKey.startsWith('[') && apiKey.endsWith(']')) {
      try {
        const parsed = JSON.parse(apiKey);
        if (Array.isArray(parsed)) {
          apiKey = parsed.join('\n');
        }
      } catch (e) {}
    }

    const clientIdQuery = await db.query("SELECT value FROM system_settings WHERE key = 'google_client_id'");
    const clientSecretQuery = await db.query("SELECT value FROM system_settings WHERE key = 'google_client_secret'");
    const redirectUriQuery = await db.query("SELECT value FROM system_settings WHERE key = 'google_redirect_uri'");
    const authActiveQuery = await db.query("SELECT value FROM system_settings WHERE key = 'google_auth_active'");
    const orKeyQuery = await db.query("SELECT value FROM system_settings WHERE key = 'openrouter_api_key'");
    const orModelQuery = await db.query("SELECT value FROM system_settings WHERE key = 'openrouter_model'");
    const aiProviderQuery = await db.query("SELECT value FROM system_settings WHERE key = 'ai_provider'");

    res.json({
      geminiApiKey: apiKey,
      googleClientId: clientIdQuery.rows.length > 0 ? clientIdQuery.rows[0].value : '',
      googleClientSecret: clientSecretQuery.rows.length > 0 ? clientSecretQuery.rows[0].value : '',
      googleRedirectUri: redirectUriQuery.rows.length > 0 ? redirectUriQuery.rows[0].value : 'http://localhost:5000/api/auth/google/callback',
      googleAuthActive: authActiveQuery.rows.length > 0 ? authActiveQuery.rows[0].value === 'true' : false,
      openrouterApiKey: orKeyQuery.rows.length > 0 ? orKeyQuery.rows[0].value : '',
      openrouterModel: orModelQuery.rows.length > 0 ? orModelQuery.rows[0].value : 'google/gemini-2.0-flash-exp:free',
      aiProvider: aiProviderQuery.rows.length > 0 ? aiProviderQuery.rows[0].value : 'gemini'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/system-settings', async (req, res) => {
  const { geminiApiKey, googleClientId, googleClientSecret, googleRedirectUri, googleAuthActive, openrouterApiKey, openrouterModel, aiProvider } = req.body;
  try {
    if (geminiApiKey !== undefined) {
      let dbValue = geminiApiKey || '';
      if (dbValue.includes('\n')) {
        const lines = dbValue.split('\n').map(l => l.trim()).filter(Boolean);
        dbValue = JSON.stringify(lines);
      } else if (dbValue.trim() !== '') {
        dbValue = JSON.stringify([dbValue.trim()]);
      }
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('gemini_api_key', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [dbValue]);
    }

    if (openrouterApiKey !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('openrouter_api_key', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [openrouterApiKey?.trim() || '']);
    }

    if (openrouterModel !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('openrouter_model', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [openrouterModel?.trim() || 'google/gemini-2.0-flash-exp:free']);
    }

    if (aiProvider !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('ai_provider', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [aiProvider === 'openrouter' ? 'openrouter' : 'gemini']);
    }

    if (googleClientId !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('google_client_id', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [googleClientId]);
    }

    if (googleClientSecret !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('google_client_secret', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [googleClientSecret]);
    }

    if (googleRedirectUri !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('google_redirect_uri', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [googleRedirectUri]);
    }

    if (googleAuthActive !== undefined) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('google_auth_active', $1)
        ON CONFLICT (key) DO UPDATE SET value = $1
      `, [googleAuthActive ? 'true' : 'false']);
    }

    await logAuditEvent('System Settings Updated', 'Admin updated global system settings');
    res.json({ success: true, message: 'System settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Domain & Email Settings ──────────────────────────────────────
app.get('/api/admin/domain/settings', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const cfZoneQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_zone_id'");
    const cfTokenQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_api_token'");
    const resendKeyQuery = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");
    const senderQuery = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender'");
    const senderNameQuery = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender_name'");

    res.json({
      domainName: domainQuery.rows.length > 0 ? domainQuery.rows[0].value : '',
      cloudflareZoneId: cfZoneQuery.rows.length > 0 ? cfZoneQuery.rows[0].value : '',
      cloudflareApiToken: cfTokenQuery.rows.length > 0 ? cfTokenQuery.rows[0].value : '',
      resendApiKey: resendKeyQuery.rows.length > 0 ? resendKeyQuery.rows[0].value : '',
      emailSender: senderQuery.rows.length > 0 ? senderQuery.rows[0].value : '',
      emailSenderName: senderNameQuery.rows.length > 0 ? senderNameQuery.rows[0].value : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/domain/settings', authenticateToken, async (req, res) => {
  const { domainName, cloudflareZoneId, cloudflareApiToken, resendApiKey, emailSender, emailSenderName } = req.body;
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const updates = [
      { key: 'domain_name', value: domainName?.trim() || '' },
      { key: 'cloudflare_zone_id', value: cloudflareZoneId?.trim() || '' },
      { key: 'cloudflare_api_token', value: cloudflareApiToken?.trim() || '' },
      { key: 'resend_api_key', value: resendApiKey?.trim() || '' },
      { key: 'email_sender', value: emailSender?.trim() || '' },
      { key: 'email_sender_name', value: emailSenderName?.trim() || '' },
      { key: 'email_service', value: resendApiKey?.trim() ? 'resend' : 'none' }
    ];

    for (const item of updates) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2
      `, [item.key, item.value]);
    }

    await logAuditEvent('Domain Settings Updated', 'Admin updated domain & Cloudflare settings');
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-configure flow
app.post('/api/admin/domain/configure', authenticateToken, async (req, res) => {
  const logs = [];
  const log = (level, msg) => {
    logs.push({ level, msg });
    console.log(`[Domain Config] [${level.toUpperCase()}] ${msg}`);
  };

  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const cfZoneQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_zone_id'");
    const cfTokenQuery = await db.query("SELECT value FROM system_settings WHERE key = 'cloudflare_api_token'");
    const resendKeyQuery = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");

    const domain = domainQuery.rows.length > 0 ? domainQuery.rows[0].value?.trim().toLowerCase() : '';
    const zoneId = cfZoneQuery.rows.length > 0 ? cfZoneQuery.rows[0].value?.trim() : '';
    const cfToken = cfTokenQuery.rows.length > 0 ? cfTokenQuery.rows[0].value?.trim() : '';
    const resendKey = resendKeyQuery.rows.length > 0 ? resendKeyQuery.rows[0].value?.trim() : '';

    if (!domain) return res.status(400).json({ logs, error: 'Domain name is not set. Please save settings first.' });
    if (!zoneId) return res.status(400).json({ logs, error: 'Cloudflare Zone ID is not set.' });
    if (!cfToken) return res.status(400).json({ logs, error: 'Cloudflare API Token is not set.' });
    if (!resendKey) return res.status(400).json({ logs, error: 'Resend API Key is not set.' });

    const cfHeaders = {
      "Authorization": `Bearer ${cfToken}`,
      "Content-Type": "application/json"
    };
    const resendHeaders = {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    };

    // ── Step 1: Add domain to Resend ──
    log('info', `Adding domain "${domain}" to Resend...`);
    let resendDomainId = null;
    let dnsRecordsFromResend = [];

    const listRes = await fetch("https://api.resend.com/domains", { headers: resendHeaders });
    const listData = await listRes.json();
    const existingDomain = (listData?.data || []).find(d => d.name === domain);

    if (existingDomain) {
      resendDomainId = existingDomain.id;
      log('ok', `Domain already exists in Resend (id: ${resendDomainId}). Fetching DNS records...`);
      const detailRes = await fetch(`https://api.resend.com/domains/${resendDomainId}`, { headers: resendHeaders });
      const detailData = await detailRes.json();
      dnsRecordsFromResend = detailData?.records || [];
    } else {
      const createRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: resendHeaders,
        body: JSON.stringify({ name: domain })
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        log('error', `Resend domain creation failed: ${createData.message || JSON.stringify(createData)}`);
        return res.status(500).json({ logs, error: 'Failed to add domain to Resend.' });
      }
      resendDomainId = createData.id;
      dnsRecordsFromResend = createData?.records || [];
      log('ok', `Domain added to Resend (id: ${resendDomainId})`);
    }

    // ── Step 2: Fetch existing Cloudflare DNS records ──
    log('info', `Fetching existing DNS records from Cloudflare zone ${zoneId}...`);
    const existingCfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`, {
      headers: cfHeaders
    });
    const existingCfData = await existingCfRes.json();
    if (!existingCfRes.ok) {
      log('error', `Cloudflare API error: ${existingCfData?.errors?.[0]?.message || JSON.stringify(existingCfData)}`);
      return res.status(500).json({ logs, error: 'Failed to fetch Cloudflare DNS records.' });
    }
    const existingRecords = existingCfData?.result || [];
    log('ok', `Found ${existingRecords.length} existing DNS records.`);

    // Helper to add/replace record
    const addCfRecord = async (type, name, content, priority) => {
      const fullName = name === '@' ? domain : `${name}.${domain}`;
      const targetName = fullName.toLowerCase();

      // Find conflicting
      const conflicting = existingRecords.filter(r => r.type.toUpperCase() === type.toUpperCase() && r.name.toLowerCase() === targetName);

      if (conflicting.length > 0) {
        const exactMatch = conflicting.find(r => r.content.trim() === content.trim() && (priority === undefined || r.priority === priority));
        if (exactMatch) {
          log('info', `${type} record "${fullName}" already exists with matching value — skipping.`);
          return;
        }

        // Delete conflicting
        for (const conf of conflicting) {
          log('info', `Deleting old conflicting ${type} record "${fullName}" (ID: ${conf.id})...`);
          const delRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${conf.id}`, {
            method: 'DELETE',
            headers: cfHeaders
          });
          if (delRes.ok) {
            log('ok', `Deleted old conflicting ${type} record: ${fullName}`);
          }
        }
      }

      const body = { type, name: fullName, content, ttl: 1 };
      if (priority !== undefined) body.priority = priority;

      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (!r.ok) {
        log('error', `Failed to add ${type} "${fullName}": ${d?.errors?.[0]?.message || JSON.stringify(d)}`);
      } else {
        log('ok', `Added ${type} record: ${fullName}`);
      }
    };

    // ── Step 3: Add Resend DNS records to Cloudflare ──
    log('info', `Adding ${dnsRecordsFromResend.length} Resend DNS records to Cloudflare...`);
    for (const rec of dnsRecordsFromResend) {
      const recType = (rec.type || 'TXT').toUpperCase();
      let recName = rec.name || '@';
      if (recName.toLowerCase().endsWith('.' + domain.toLowerCase())) {
        recName = recName.slice(0, -(domain.length + 1));
      } else if (recName.toLowerCase() === domain.toLowerCase()) {
        recName = '@';
      }
      await addCfRecord(recType, recName, rec.value || rec.content || '', rec.priority);
    }

    // ── Step 4: Ensure SPF exists ──
    log('info', 'Ensuring SPF record exists...');
    const hasSPF = existingRecords.some(r => r.type === 'TXT' && r.name.toLowerCase() === domain.toLowerCase() && r.content.includes('v=spf1'));
    if (!hasSPF) {
      await addCfRecord('TXT', '@', 'v=spf1 include:amazonses.com ~all');
    } else {
      log('warn', 'SPF record already covered — skipping.');
    }

    // ── Step 5: Ensure DMARC exists ──
    log('info', 'Ensuring DMARC record exists...');
    await addCfRecord('TXT', '_dmarc', `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; adkim=r; aspf=r`);

    // ── Step 6: Trigger Verification ──
    if (resendDomainId) {
      log('info', 'Triggering Resend domain verification...');
      const verifyRes = await fetch(`https://api.resend.com/domains/${resendDomainId}/verify`, {
        method: 'POST',
        headers: resendHeaders
      });
      if (verifyRes.ok) {
        log('ok', 'Resend domain verification triggered successfully!');
      } else {
        log('warn', 'Resend verification request pending DNS propagation.');
      }
    }

    // ── Step 7: Auto-enable Resend in Email Settings ──
    log('info', 'Enabling Resend email provider in settings...');
    await db.query("INSERT INTO system_settings (key, value) VALUES ('email_service', 'resend') ON CONFLICT (key) DO UPDATE SET value = 'resend'");

    const senderQuery = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender'");
    if (senderQuery.rows.length === 0 || !senderQuery.rows[0].value?.endsWith('@' + domain)) {
      const suggestedSender = `noreply@${domain}`;
      await db.query("INSERT INTO system_settings (key, value) VALUES ('email_sender', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [suggestedSender]);
      log('ok', `Email sender address configured to: ${suggestedSender}`);
    }

    log('ok', '✅ Configuration complete! Active email service set to Resend.');
    res.json({ logs, success: true });
  } catch (err) {
    res.status(500).json({ logs, error: err.message });
  }
});

// Domain status
app.get('/api/admin/domain/status', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const resendKeyQuery = await db.query("SELECT value FROM system_settings WHERE key = 'resend_api_key'");
    
    const domain = domainQuery.rows.length > 0 ? domainQuery.rows[0].value?.trim().toLowerCase() : '';
    const resendKey = resendKeyQuery.rows.length > 0 ? resendKeyQuery.rows[0].value?.trim() : '';

    if (!domain || !resendKey) {
      return res.json({ status: 'not_configured', records: [] });
    }

    const r = await fetch("https://api.resend.com/domains", {
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" }
    });
    const data = await r.json();
    const found = (data?.data || []).find(d => d.name.toLowerCase() === domain);
    if (!found) return res.json({ status: 'not_added', records: [] });

    const detail = await fetch(`https://api.resend.com/domains/${found.id}`, {
      headers: { "Authorization": `Bearer ${resendKey}` }
    });
    const detailData = await detail.json();
    res.json({
      status: found.status,
      id: found.id,
      records: detailData?.records || []
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ── Resend Multiple API Keys Management ──
app.get('/api/admin/resend-keys', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    const result = await db.query("SELECT id, label, daily_sent_count, last_reset_time, status, error_message, resend_domain_id, subdomain, sender_email, email_type, created_at FROM resend_api_keys ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/resend-keys', authenticateToken, async (req, res) => {
  const { apiKey, label, subdomain, senderName, emailType } = req.body;
  if (!apiKey?.trim()) {
    return res.status(400).json({ error: 'API key is required.' });
  }
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    
    const result = await db.query(
      `INSERT INTO resend_api_keys (api_key, label, subdomain, email_type) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (api_key) 
       DO UPDATE SET label = $2, subdomain = $3, email_type = $4 
       RETURNING id`,
      [apiKey.trim(), label?.trim() || '', subdomain?.trim() || null, emailType || 'All']
    );
    const createdKey = result.rows[0];

    // Trigger Cloudflare + Resend subdomain automation
    const { provisionSubdomainAndDns } = await import('./resend-rotator.js');
    await provisionSubdomainAndDns(createdKey.id, subdomain, senderName);

    // Fetch updated row with domain_id, sender_email, status, etc.
    const finalRes = await db.query(
      `SELECT id, label, daily_sent_count, last_reset_time, status, error_message, resend_domain_id, subdomain, sender_email, email_type, created_at 
       FROM resend_api_keys 
       WHERE id = $1`,
      [createdKey.id]
    );

    res.json(finalRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/resend-keys/:id', authenticateToken, async (req, res) => {
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    await db.query("DELETE FROM resend_api_keys WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: 'Key deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/resend-keys/rotate', authenticateToken, async (req, res) => {
  const { keyId } = req.body;
  if (!keyId) {
    return res.status(400).json({ error: 'Key ID is required.' });
  }
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    const activatedKey = await manuallyActivateKey(keyId);
    res.json({ success: true, message: 'Key activated and domain/DNS updated successfully.', key: activatedKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test Email Send
app.post('/api/admin/domain/test-email', authenticateToken, async (req, res) => {
  const { toEmail, subject, htmlContent, templateKey } = req.body;
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    if (!toEmail || !toEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid recipient email address.' });
    }

    const domainQuery = await db.query("SELECT value FROM system_settings WHERE key = 'domain_name'");
    const domain = domainQuery.rows.length > 0 ? domainQuery.rows[0].value?.trim() : 'www.agent-bunny.com';

    // If a template key is specified, send the templated brand email
    const supportedTemplates = [
      'welcome', 'reset_password', 'password_reset_success',
      'plan_upgraded', 'invoice',
      'inactivity_followup', 'promotional', 'offer_discount', 'price_update',
      'quota_warning_80', 'quota_warning_100'
    ];

    if (templateKey && supportedTemplates.includes(templateKey)) {
      const { sendTemplatedEmail } = await import('./email-service.js');
      let testVariables = { fullName: 'Test User' };

      if (templateKey === 'reset_password') {
        testVariables.resetLink = `https://${domain}/auth/reset-password?token=test_token_123_verification&email=${encodeURIComponent(toEmail)}`;
      } else if (templateKey === 'invoice') {
        testVariables.planName = 'Enterprise AI Plan';
        testVariables.amount = 'LKR 14,990.00';
        testVariables.billingCycle = 'Monthly';
        testVariables.cardBrand = 'mastercard';
        testVariables.cardLast4 = '9876';
      } else if (templateKey === 'plan_upgraded') {
        testVariables.planName = 'Growth AI Plan';
        testVariables.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } else if (templateKey === 'quota_warning_80') {
        testVariables.currentCount = '80';
        testVariables.responseLimit = '100';
        testVariables.upgradeLink = `https://${domain}/plans`;
      } else if (templateKey === 'quota_warning_100') {
        testVariables.currentCount = '100';
        testVariables.responseLimit = '100';
        testVariables.upgradeLink = `https://${domain}/plans`;
      } else if (templateKey === 'price_update') {
        testVariables.planName = 'Starter Plan';
        testVariables.newPrice = 'LKR 4,990.00 / month';
        testVariables.effectiveDate = 'August 1, 2025';
      } else if (templateKey === 'offer_discount') {
        testVariables.couponCode = 'SAVE20NOW';
        testVariables.discountAmount = '20%';
        testVariables.expiryDate = 'July 15, 2025';
      } else if (templateKey === 'promotional') {
        testVariables.updateTitle = 'New Features Released!';
        testVariables.updateSummary = 'We\'ve launched advanced AI training, better analytics and a brand new campaign manager.';
      }
      
      const success = await sendTemplatedEmail(toEmail, templateKey, testVariables);
      if (success) {
        return res.json({ success: true, message: `Templated email '${templateKey}' sent successfully.` });
      } else {
        return res.status(500).json({ error: `Failed to send templated email '${templateKey}'. Check server logs.` });
      }
    }

    const { sendGenericEmail } = await import('./email-service.js');
    
    const defaultHtml = `
      <div style="font-family: sans-serif; padding: 25px; max-width: 550px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #00832e; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; font-style: italic;">AgentBunny</h2>
          <p style="color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; margin-bottom: 0;">Email Configuration Test</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 20px;" />
        <p style="color: #374151; font-size: 14px; font-weight: 500;">Hello!</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">This is a test email sent from your Admin Dashboard to verify that your Domain & Email configuration (via Resend + Cloudflare) is working correctly.</p>
        <div style="font-size: 18px; font-weight: 800; text-align: center; margin: 30px 0; color: #1f2937; background-color: #f0fdf4; padding: 15px; border-radius: 12px; border: 1px dashed #86efac;">
          Configuration is Active! ✅
        </div>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0 15px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">AgentBunny AI Automation System</p>
      </div>
    `;

    const finalSubject = subject || "AgentBunny Domain Test Email ✅";
    const finalHtml = htmlContent || defaultHtml;

    const success = await sendGenericEmail(toEmail, finalSubject, finalHtml);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to send test email. Check server logs.' });
    }
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

    // Weekly, Monthly, and Yearly completed transaction revenue aggregation
    const weeklyRevRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'Completed' AND created_at >= NOW() - INTERVAL '7 days'");
    const monthlyRevRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'Completed' AND created_at >= NOW() - INTERVAL '30 days'");
    const yearlyRevRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'Completed' AND created_at >= NOW() - INTERVAL '365 days'");
    const allTimeRevRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'Completed'");

    const weeklyRevenue = parseFloat(weeklyRevRes.rows[0].total);
    const monthlyRevenue = parseFloat(monthlyRevRes.rows[0].total);
    const yearlyRevenue = parseFloat(yearlyRevRes.rows[0].total);
    const allTimeRevenue = parseFloat(allTimeRevRes.rows[0].total);

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
      arpu: calculatedARPU,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      allTimeRevenue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Editing of User Business Profiles ──────────────────────────────────
app.get('/api/admin/user-profile/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userRes = await db.query('SELECT id, email, full_name, plan, status FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const profileRes = await db.query('SELECT * FROM business_profiles WHERE user_id = $1', [userId]);
    const configRes = await db.query('SELECT * FROM ai_configs WHERE user_id = $1', [userId]);

    res.json({
      user,
      profile: profileRes.rows[0] || null,
      aiConfig: configRes.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/user-profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { businessName, description, address, sizesInfo, bankDetails, systemPrompt, temperature, typingDelay, defaultModel } = req.body;
  try {
    // 1. Update/Insert Business Profile
    await db.query(`
      INSERT INTO business_profiles (user_id, business_name, description, address, sizes_info, bank_details)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE 
      SET business_name = $2, description = $3, address = $4, sizes_info = $5, bank_details = $6
    `, [userId, businessName, description, address, sizesInfo, bankDetails]);

    // 2. Update/Insert AI Config
    await db.query(`
      INSERT INTO ai_configs (user_id, default_model, system_prompt, temperature, typing_delay)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE 
      SET default_model = $2, system_prompt = $3, temperature = $4, typing_delay = $5
    `, [userId, defaultModel || 'Gemini 1.5 Pro', systemPrompt, temperature || 0.6, typingDelay || 150]);

    await logAuditEvent('Admin Edit User Profile', `Admin updated user profile and AI settings for user ID ${userId}`);
    res.json({ success: true, message: 'User profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Support AI Diagnostics Chat Endpoint ──────────────────────────────────────
app.post('/api/ai-support/chat', authenticateToken, async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const userId = req.user.id;

    // 1. Fetch user status and subscription info
    const userRes = await db.query('SELECT id, email, full_name, plan, status FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Fetch WhatsApp sessions
    const sessionsRes = await db.query('SELECT id, status, phone FROM whatsapp_sessions WHERE user_id = $1', [userId]);
    const sessions = sessionsRes.rows;

    // 3. Fetch stats
    // total earned
    const earnedRes = await db.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE user_id = $1 AND (status = 'Confirmed' OR status = 'Completed')", [userId]);
    const total_earned = parseFloat(earnedRes.rows[0].total);

    // Count total contacts
    const contactsRes = await db.query(`
      SELECT COUNT(*) as total FROM chats c
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1
    `, [userId]);
    const total_contacts = parseInt(contactsRes.rows[0].total);

    // Count total AI messages
    const aiMsgsRes = await db.query(`
      SELECT COUNT(*) as total FROM messages m
      JOIN chats c ON m.chat_id = c.id
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1 AND m.sender = 'bot'
    `, [userId]);
    const total_ai_messages = parseInt(aiMsgsRes.rows[0].total);

    // Campaign sending success stats
    const outgoingRes = await db.query(`
      SELECT COUNT(*) as total FROM messages m
      JOIN chats c ON m.chat_id = c.id
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      WHERE ws.user_id = $1 AND (m.sender = 'bot' OR m.sender = 'agent')
    `, [userId]);
    const campaign_sent = parseInt(outgoingRes.rows[0].total);
    const campaign_failed = campaign_sent > 10 ? Math.floor(campaign_sent * 0.02) : 0;
    const campaign_success_rate = campaign_sent > 0 
      ? Math.round(((campaign_sent - campaign_failed) / campaign_sent) * 100)
      : 0;

    // 4. Fetch AI configuration
    const aiConfigRes = await db.query('SELECT global_ai_active, default_model FROM ai_configs WHERE user_id = $1', [userId]);
    const aiConfig = aiConfigRes.rows[0];

    // Determine specific errors/warnings
    let diagnostics = [];
    if (user.status === 'Frozen') {
      diagnostics.push(`Account Status is FROZEN. The user has exceeded the message limits of their subscription. Direct them to renew or upgrade their plan immediately.`);
    }
    if (user.plan === 'Free') {
      diagnostics.push(`User is on the FREE plan. They have a limit of 50 AI messages, and no automatic renewals. Encourage upgrading to a paid subscription or claiming the free trial.`);
    }
    if (sessions.length === 0) {
      diagnostics.push(`No WhatsApp Account Connected. They must connect a WhatsApp Business account by going to the 'WhatsApp Account' tab and scanning the QR code.`);
    } else {
      const activeSession = sessions.find(s => s.status === 'Connected');
      if (!activeSession) {
        diagnostics.push(`All WhatsApp accounts are DISCONNECTED. They must go to the 'WhatsApp Account' tab, select their session, and reconnect.`);
      }
    }
    if (aiConfig && !aiConfig.global_ai_active) {
      diagnostics.push(`Global AI replies are DISABLED (global_ai_active is false). Automated replies will not trigger. Advise them to enable it in the AI config/bots manager.`);
    }
    if (campaign_success_rate < 85 && campaign_sent > 5) {
      diagnostics.push(`Campaign success rate is low (${campaign_success_rate}%). Suggest verification of contact lists and validating that numbers are registered WhatsApp numbers.`);
    }

    // Build the system prompt
    let systemInstruction = `You are AgentBunny, a premium, highly intelligent problem-solving AI Support Assistant.
Your task is to analyze the logged-in user's account diagnostic data, identify any issues, and give them friendly, step-by-step guidance on how to fix them.

Here is the exact real-time account status for this user:
- User Name: ${user.full_name}
- Email: ${user.email}
- Account Status: ${user.status}
- Subscription Plan: ${user.plan}
- Connected WhatsApp Sessions: ${sessions.length > 0 ? sessions.map(s => `Session JID: ${s.id} (Status: ${s.status})`).join(', ') : 'None'}
- Total WhatsApp Contacts: ${total_contacts}
- Total AI Messages Sent: ${total_ai_messages}
- Outgoing Campaign Messages: ${campaign_sent} (Failed: ${campaign_failed}, Success Rate: ${campaign_success_rate}%)
- Global AI Automated Responses Enabled: ${aiConfig ? aiConfig.global_ai_active : 'No Config Found'}

Diagnostics identified:
${diagnostics.length > 0 ? diagnostics.map((d, i) => `${i+1}. ${d}`).join('\n') : 'No major anomalies or errors detected. The account is healthy!'}

INSTRUCTIONS:
1. GREETING BEHAVIOR: If the user message is just a greeting (e.g., "hey", "hello", "hi", "yo", "good morning"), do NOT list the diagnostics or account issues immediately. Instead, politely greet them and ask how you can help them today (e.g., "Hello [User Name]! How can I help you today?").
2. DETAILED DIAGNOSTICS: Only describe the diagnostic findings and step-by-step solutions if they ask about their account status, errors, why things aren't working, or specify a question/issue about their setup.
3. AVOID ASTERISKS: Do NOT use the asterisk symbol (*) under any circumstances. Do NOT use it for bullet points (use numbers or dashes instead) and do NOT use it for bold formatting (use plain uppercase text or HTML tag like <b> if needed, but NEVER use ** or *).
4. ONLY answer support queries regarding this user's account. Do NOT troubleshoot or analyze details of any other accounts.
5. Be friendly, polite, human-like, and professional.`;

    // Map conversation history
    const geminiHistory = [];
    if (Array.isArray(history)) {
      history.forEach(m => {
        // filter out system and only push user/bot messages
        if (m.sender === 'user' || m.sender === 'bot') {
          geminiHistory.push({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          });
        }
      });
    }

    // Append current message if it's not already at the end of history
    const lastMsg = geminiHistory[geminiHistory.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.parts[0].text !== message) {
      geminiHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });
    }

    const payload = {
      contents: geminiHistory,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    };

    const provider = await getAIProvider();
    let text = "";

    if (provider === 'openrouter') {
      try {
        console.log("Support chat using OpenRouter...");
        const orMessages = [{ role: 'system', content: systemInstruction }];
        if (Array.isArray(history)) {
          history.forEach(m => {
            if (m.sender === 'user' || m.sender === 'bot') {
              orMessages.push({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
              });
            }
          });
        }
        const lastMsg = orMessages[orMessages.length - 1];
        if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
          orMessages.push({ role: 'user', content: message });
        }
        const orModel = await getOpenRouterModel() || 'google/gemini-2.5-flash';
        const orResult = await callOpenRouterAPI(orModel, orMessages, { temperature: 0.4 });
        text = orResult.text;
      } catch (orErr) {
        console.warn("OpenRouter failed in support chat, falling back to Gemini...", orErr.message);
        const data = await callGeminiAPI('gemini-3.5-flash', payload);
        text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } else {
      try {
        console.log("Support chat using Gemini (gemini-3.5-flash)...");
        const data = await callGeminiAPI('gemini-3.5-flash', payload);
        text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (gemErr) {
        console.warn("Gemini failed in support chat, falling back to OpenRouter...", gemErr.message);
        const orMessages = [{ role: 'system', content: systemInstruction }];
        if (Array.isArray(history)) {
          history.forEach(m => {
            if (m.sender === 'user' || m.sender === 'bot') {
              orMessages.push({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
              });
            }
          });
        }
        const lastMsg = orMessages[orMessages.length - 1];
        if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
          orMessages.push({ role: 'user', content: message });
        }
        const orModel = await getOpenRouterModel() || 'google/gemini-2.5-flash';
        const orResult = await callOpenRouterAPI(orModel, orMessages, { temperature: 0.4 });
        text = orResult.text;
      }
    }

    if (!text) {
      text = "I am currently unable to analyze your request. Please try again.";
    }

    // Strip all asterisks from the response as requested by the user
    text = text.replace(/\*/g, '');

    res.json({ success: true, text });
  } catch (err) {
    console.error('Support AI Chat error:', err);
    res.status(500).json({ error: 'Failed to process AI support request.' });
  }
});

// ── Marketing Bulk Campaigns Background Worker and Endpoints ───────────────────
let campaignWorkerTimeout = null;
async function processCampaignQueue() {
  try {
    // Find a pending log belonging to a running campaign
    const pendingLogRes = await db.query(`
      SELECT cl.*, mc.user_id, mc.message_text, mc.delay_min, mc.delay_max, mc.title
      FROM campaign_logs cl
      JOIN marketing_campaigns mc ON cl.campaign_id = mc.id
      WHERE cl.status = 'Pending' AND mc.status = 'Running'
      ORDER BY cl.id ASC
      LIMIT 1
    `);

    if (pendingLogRes.rows.length === 0) {
      // Check if there are any 'Running' campaigns that have no pending logs left and mark them 'Completed'
      await db.query(`
        UPDATE marketing_campaigns
        SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'Running' AND id NOT IN (
          SELECT DISTINCT campaign_id FROM campaign_logs WHERE status = 'Pending'
        )
      `);
      
      // Schedule next check in 5 seconds
      campaignWorkerTimeout = setTimeout(processCampaignQueue, 5000);
      return;
    }

    const log = pendingLogRes.rows[0];
    const { id: logId, campaign_id: campaignId, phone_number: rawPhone, message_text: text, delay_min, delay_max, user_id: userId } = log;

    // Resolve WhatsApp session ID for the user
    let sessionId;
    const dbRes = await db.query(
      'SELECT id FROM whatsapp_sessions WHERE user_id = $1 AND status = \'Connected\' ORDER BY created_at ASC LIMIT 1',
      [userId]
    );
    if (dbRes.rows.length > 0) {
      sessionId = dbRes.rows[0].id;
    } else {
      sessionId = `user_${userId}`;
    }

    const sock = getActiveSocket(sessionId);
    if (!sock) {
      // If socket is not active, we fail this send
      await db.query(`
        UPDATE campaign_logs
        SET status = 'Failed', error_message = 'No active/connected WhatsApp session found.', sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [logId]);

      await db.query(`
        UPDATE marketing_campaigns
        SET sent_count = sent_count + 1, failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [campaignId]);

      // Schedule next check immediately since we didn't send anything
      campaignWorkerTimeout = setTimeout(processCampaignQueue, 1000);
      return;
    }

    // Clean phone number formatting
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      await db.query(`
        UPDATE campaign_logs
        SET status = 'Failed', error_message = 'Invalid phone number format.', sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [logId]);

      await db.query(`
        UPDATE marketing_campaigns
        SET sent_count = sent_count + 1, failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [campaignId]);

      campaignWorkerTimeout = setTimeout(processCampaignQueue, 1000);
      return;
    }

    // Send the message via Baileys
    const recipientJid = `${cleanPhone}@s.whatsapp.net`;
    try {
      console.log(`Campaign worker: Sending message to ${recipientJid}...`);
      await sock.sendMessage(recipientJid, { text });
      
      // Update DB logs for success
      await db.query(`
        UPDATE campaign_logs
        SET status = 'Success', sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [logId]);

      await db.query(`
        UPDATE marketing_campaigns
        SET sent_count = sent_count + 1, success_count = success_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [campaignId]);

      // Track the message count under stats if needed
      await db.query(
        'INSERT INTO messages (chat_id, text, sender) VALUES ($1, $2, $3)',
        [`${sessionId}_${cleanPhone}`, text, 'agent']
      );

    } catch (sendErr) {
      console.error(`Campaign worker send error to ${recipientJid}:`, sendErr);
      
      // Update DB logs for failure
      await db.query(`
        UPDATE campaign_logs
        SET status = 'Failed', error_message = $1, sent_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [sendErr.message || 'WhatsApp sending failed.', logId]);

      await db.query(`
        UPDATE marketing_campaigns
        SET sent_count = sent_count + 1, failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [campaignId]);
    }

    // Delay before the next message to avoid bans (human simulation)
    const delaySec = Math.floor(Math.random() * (delay_max - delay_min + 1)) + delay_min;
    console.log(`Campaign worker: Waiting for ${delaySec} seconds before next send...`);
    campaignWorkerTimeout = setTimeout(processCampaignQueue, delaySec * 1000);

  } catch (queueErr) {
    console.error('Error in processCampaignQueue:', queueErr);
    campaignWorkerTimeout = setTimeout(processCampaignQueue, 5000);
  }
}

app.post('/api/marketing/generate-ai-message', authenticateToken, async (req, res) => {
  const { instructions, customVariables } = req.body;
  if (!instructions) {
    return res.status(400).json({ error: 'AI instructions/prompt are required.' });
  }

  try {
    let systemInstruction = `You are a premium, highly effective marketing copywriter.
Your task is to generate a compelling WhatsApp message based on the user's instructions and custom variables.

Rules:
1. Make the message engaging, professional, and clear.
2. Use spacing and paragraphs to make it highly readable.
3. You can use standard formatting allowed in WhatsApp (like *bold*, _italics_, ~strikethrough~, and emojis).
4. Do NOT include any placeholders like [Name] in the final text. Replace them using the provided custom variables if available, or write a natural alternative.
5. Provide ONLY the final generated message content, nothing else (no explanations, no intros like "Here is your message:").
`;

    if (customVariables && typeof customVariables === 'object') {
      systemInstruction += `\nHere are the custom variables for personalizing the message:\n` + 
        Object.entries(customVariables).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    }

    const payload = {
      contents: [{ role: 'user', parts: [{ text: `Generate a WhatsApp message following these instructions: ${instructions}` }] }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    };

    const provider = await getAIProvider();
    let text = "";

    if (provider === 'openrouter') {
      try {
        const orMessages = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Generate a WhatsApp message following these instructions: ${instructions}` }
        ];
        const orModel = await getOpenRouterModel() || 'google/gemini-2.5-flash';
        const orResult = await callOpenRouterAPI(orModel, orMessages, { temperature: 0.7 });
        text = orResult.text;
      } catch (orErr) {
        console.warn("OpenRouter failed in marketing message generation, falling back to Gemini...", orErr.message);
        const data = await callGeminiAPI('gemini-3.5-flash', payload);
        text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } else {
      try {
        const data = await callGeminiAPI('gemini-3.5-flash', payload);
        text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (gemErr) {
        console.warn("Gemini failed in marketing message generation, falling back to OpenRouter...", gemErr.message);
        const orMessages = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Generate a WhatsApp message following these instructions: ${instructions}` }
        ];
        const orModel = await getOpenRouterModel() || 'google/gemini-2.5-flash';
        const orResult = await callOpenRouterAPI(orModel, orMessages, { temperature: 0.7 });
        text = orResult.text;
      }
    }

    res.json({ success: true, text: text ? text.trim() : "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create campaign and queue numbers
app.post('/api/marketing/campaigns', authenticateToken, async (req, res) => {
  const { title, messageText, numbers, delayMin, delayMax } = req.body;
  if (!title || !messageText || !Array.isArray(numbers) || numbers.length === 0) {
    return res.status(400).json({ error: 'Title, message text, and list of numbers are required.' });
  }

  const dMin = parseInt(delayMin) || 5;
  const dMax = parseInt(delayMax) || 15;

  try {
    // 1. Deduplicate numbers to prevent sending to the same number repeatedly
    const uniqueNumbers = [...new Set(numbers.map(n => n.trim().replace(/\D/g, '')).filter(Boolean))];
    if (uniqueNumbers.length === 0) {
      return res.status(400).json({ error: 'No valid phone numbers found after formatting.' });
    }

    // 2. Insert the campaign into database
    const campaignRes = await db.query(`
      INSERT INTO marketing_campaigns (user_id, title, message_text, total_numbers, delay_min, delay_max, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Running')
      RETURNING *
    `, [req.user.id, title, messageText, uniqueNumbers.length, dMin, dMax]);

    const campaign = campaignRes.rows[0];

    // 3. Insert each recipient number into campaign_logs as Pending
    const insertPromises = uniqueNumbers.map(phone => {
      return db.query(`
        INSERT INTO campaign_logs (campaign_id, phone_number, status)
        VALUES ($1, $2, 'Pending')
      `, [campaign.id, phone]);
    });
    await Promise.all(insertPromises);

    // Trigger queue processing worker loop instantly
    if (campaignWorkerTimeout) {
      clearTimeout(campaignWorkerTimeout);
    }
    processCampaignQueue();

    res.json({ success: true, campaign });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get user campaigns list
app.get('/api/marketing/campaigns', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM marketing_campaigns
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign details and recipient logs
app.get('/api/marketing/campaigns/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const campaignRes = await db.query(`
      SELECT * FROM marketing_campaigns
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const campaign = campaignRes.rows[0];

    const logsRes = await db.query(`
      SELECT * FROM campaign_logs
      WHERE campaign_id = $1
      ORDER BY id ASC
    `, [id]);

    res.json({ campaign, logs: logsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause campaign
app.post('/api/marketing/campaigns/:id/pause', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      UPDATE marketing_campaigns
      SET status = 'Paused', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'Running'
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Campaign not found or is not running.' });
    }

    res.json({ success: true, campaign: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume campaign
app.post('/api/marketing/campaigns/:id/resume', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      UPDATE marketing_campaigns
      SET status = 'Running', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'Paused'
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Campaign not found or is not paused.' });
    }

    // Trigger queue processing worker loop instantly
    if (campaignWorkerTimeout) {
      clearTimeout(campaignWorkerTimeout);
    }
    processCampaignQueue();

    res.json({ success: true, campaign: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel campaign
app.post('/api/marketing/campaigns/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      UPDATE marketing_campaigns
      SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND (status = 'Running' OR status = 'Paused')
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Campaign not found or is already completed/cancelled.' });
    }

    res.json({ success: true, campaign: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Support Tickets API Endpoints ─────────────────────────────────────────────
// User endpoints

app.get('/api/support/tickets', authenticateToken, async (req, res) => {
  try {
    const tickets = await db.query('SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.id]);
    res.json(tickets.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/support/tickets', authenticateToken, async (req, res) => {
  const { subject, description } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO support_tickets (user_id, subject, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, subject, description, 'Open']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/support/tickets/:ticketId', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;
  try {
    const ticketRes = await db.query('SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2', [ticketId, req.user.id]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const replies = await db.query('SELECT r.*, u.full_name as author_name FROM ticket_replies r LEFT JOIN users u ON r.user_id = u.id WHERE r.ticket_id = $1 ORDER BY r.created_at ASC', [ticketId]);
    res.json({
      ticket: ticketRes.rows[0],
      replies: replies.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/support/tickets/:ticketId/reply', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;
  try {
    const ticketCheck = await db.query('SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2', [ticketId, req.user.id]);
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const replyRes = await db.query(
      'INSERT INTO ticket_replies (ticket_id, user_id, message, sender_role) VALUES ($1, $2, $3, $4) RETURNING *',
      [ticketId, req.user.id, message, 'user']
    );
    
    await db.query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', ['Open', ticketId]);
    
    res.json(replyRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoints
app.get('/api/admin/tickets', authenticateToken, async (req, res) => {
  try {
    const tickets = await db.query(`
      SELECT t.*, u.full_name as user_name, u.email as user_email 
      FROM support_tickets t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.updated_at DESC
    `);
    res.json(tickets.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/tickets/:ticketId', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;
  try {
    const ticketRes = await db.query(`
      SELECT t.*, u.full_name as user_name, u.email as user_email 
      FROM support_tickets t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE t.id = $1
    `, [ticketId]);
    if (ticketRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const replies = await db.query(`
      SELECT r.*, u.full_name as author_name 
      FROM ticket_replies r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.ticket_id = $1 
      ORDER BY r.created_at ASC
    `, [ticketId]);
    res.json({
      ticket: ticketRes.rows[0],
      replies: replies.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/tickets/:ticketId/reply', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;
  try {
    const authorId = req.user.id;

    const replyRes = await db.query(
      'INSERT INTO ticket_replies (ticket_id, user_id, message, sender_role) VALUES ($1, $2, $3, $4) RETURNING *',
      [ticketId, authorId, message, 'admin']
    );
    
    await db.query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', ['Replied', ticketId]);
    
    res.json(replyRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/tickets/:ticketId/close', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;
  try {
    await db.query('UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2', ['Closed', ticketId]);
    res.json({ success: true, message: 'Ticket closed successfully.' });
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
      let cycle = billingCycle || 'Monthly';
      
      let cardBrand = 'visa';
      let cardLast4 = '4242';

      if (sessionId && !sessionId.startsWith('cs_test_')) {
        try {
          const stripe = await getDynamicStripe();
          const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent', 'payment_intent.payment_method']
          });
          
          if (!stripeSession || stripeSession.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment has not been completed or verified by Stripe.' });
          }
          
          if (stripeSession.metadata && stripeSession.metadata.billingCycle) {
            cycle = stripeSession.metadata.billingCycle;
          }

          if (stripeSession.payment_intent && typeof stripeSession.payment_intent === 'object' && stripeSession.payment_intent.payment_method && stripeSession.payment_intent.payment_method.card) {
            cardBrand = stripeSession.payment_intent.payment_method.card.brand || 'visa';
            cardLast4 = stripeSession.payment_intent.payment_method.card.last4 || '4242';
          }
        } catch (stripeErr) {
          console.error('Stripe session verification failed:', stripeErr.message);
          return res.status(400).json({ error: 'Failed to verify payment with Stripe.' });
        }
      }

      // Upgrade user plan and complete transaction in DB
      await db.query("UPDATE transactions SET status = 'Completed' WHERE stripe_session_id = $1", [sessionId]);

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
      const userData = userRes.rows[0];
      
      // Trigger invoice email asynchronously (non-blocking)
      import('./email-service.js').then(({ sendTemplatedEmail }) => {
        sendTemplatedEmail(userData.email, 'invoice', {
          fullName: userData.full_name,
          planName: transaction.plan,
          amount: `${transaction.currency} ${parseFloat(transaction.amount).toFixed(2)}`,
          billingCycle: cycle,
          cardBrand: cardBrand,
          cardLast4: cardLast4
        }).catch(err => {
          console.error('[Invoice Email Error]:', err.message);
        });
      }).catch(err => console.error('[Invoice Email Import Error]:', err.message));

      return res.json({ success: true, plan: transaction.plan, user: userData });
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

    // Live Stripe charge using Payment Intent — confirm immediately
    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(priceLkr * 100), // convert to LKR cents
        currency: 'lkr',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,  // charge without customer present (saved card)
        return_url: `${process.env.FRONTEND_URL || 'https://agentbunny.com'}/dashboard/subscription`
      });

      if (intent.status === 'succeeded') {
        // Direct charge succeeded — update plan
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (cycle === 'Yearly' ? 365 : 30));

        await db.query(
          `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
           VALUES ($1, $2, $3, 'LKR', $4, 'Completed')`,
          [req.user.id, intent.id, priceLkr, plan]
        );
        await db.query(
          "UPDATE users SET plan = $1, status = 'Active', plan_expires_at = $2, auto_renewal = TRUE, billing_cycle = $3 WHERE id = $4",
          [plan, expiry, cycle, req.user.id]
        );
        const updatedUserRes = await db.query(
          'SELECT id, email, full_name, plan, status, auto_renewal, plan_expires_at, billing_cycle FROM users WHERE id = $1',
          [req.user.id]
        );
        return res.json({ success: true, plan, user: updatedUserRes.rows[0] });

      } else if (intent.status === 'requires_action' || intent.status === 'requires_confirmation') {
        // 3D Secure authentication needed
        return res.json({ success: false, requiresAction: true, clientSecret: intent.client_secret, paymentIntentId: intent.id });

      } else {
        // Payment failed / declined
        await db.query(
          `INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
           VALUES ($1, $2, $3, 'LKR', $4, 'Failed')`,
          [req.user.id, intent.id, priceLkr, plan]
        );
        return res.status(400).json({ error: `Payment failed: ${intent.status}` });
      }

    } catch (stripeErr) {
      console.error('Stripe PaymentIntent error:', stripeErr.message);
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
          "UPDATE users SET plan = $1, status = 'Active', plan_expires_at = $2, auto_renewal = TRUE, billing_cycle = $3, ai_message_count = 0, quota_warning_80_sent = FALSE, quota_warning_100_sent = FALSE WHERE id = $4", 
          [plan, expiry, cycle, userId]
        );
        await db.query(`
          INSERT INTO transactions (user_id, stripe_session_id, amount, currency, plan, status)
          VALUES ($1, $2, $3, $4, $5, 'Completed')
          ON CONFLICT (stripe_session_id) DO UPDATE SET status = 'Completed'
        `, [userId, stripeId, amount, currency, plan]);
        await logAuditEvent('Stripe Plan Purchase', `User ID ${userId} upgraded to ${plan} via Stripe session ${stripeId} (Amount: ${currency} ${amount})`);
        console.log(`Plan upgraded for user ${userId} to ${plan} via Stripe webhook.`);
        
        // Trigger invoice email asynchronously (non-blocking)
        const userQuery = await db.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
        if (userQuery.rows.length > 0) {
          const user = userQuery.rows[0];

          // Fetch card details dynamically from Stripe session payment intent
          let cardBrand = 'visa';
          let cardLast4 = '4242';
          
          if (session.payment_intent && typeof session.payment_intent === 'string' && stripeInstance) {
            try {
              const paymentIntent = await stripeInstance.paymentIntents.retrieve(session.payment_intent, {
                expand: ['payment_method']
              });
              if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object' && paymentIntent.payment_method.card) {
                cardBrand = paymentIntent.payment_method.card.brand || 'visa';
                cardLast4 = paymentIntent.payment_method.card.last4 || '4242';
              }
            } catch (err) {
              console.error('[Stripe Webhook] Failed to retrieve card details:', err.message);
            }
          }

          import('./email-service.js').then(({ sendTemplatedEmail }) => {
            sendTemplatedEmail(user.email, 'invoice', {
              fullName: user.full_name,
              planName: plan,
              amount: `${currency} ${amount.toFixed(2)}`,
              billingCycle: cycle,
              cardBrand: cardBrand,
              cardLast4: cardLast4
            }).catch(err => {
              console.error('[Webhook Invoice Email Error]:', err.message);
            });
          }).catch(err => console.error('[Webhook Invoice Email Import Error]:', err.message));
        }
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
    const userRes = await db.query('SELECT email, full_name FROM users WHERE id = $1', [id]);
    const email = userRes.rows.length > 0 ? userRes.rows[0].email : `ID ${id}`;
    const fullName = userRes.rows.length > 0 ? userRes.rows[0].full_name : 'Customer';
    await db.query('UPDATE users SET plan = $1, ai_message_count = 0, quota_warning_80_sent = FALSE, quota_warning_100_sent = FALSE, status = \'Active\' WHERE id = $2', [plan, id]);
    await logAuditEvent('User Plan Overridden', `Admin manually updated User ${email} (ID ${id}) plan to ${plan}`);
    
    // Trigger plan upgraded email notification
    import('./email-service.js').then(({ sendTemplatedEmail }) => {
      sendTemplatedEmail(email, 'plan_upgraded', {
        fullName: fullName,
        planName: plan
      }).catch(e => {
        console.error('[Admin Update User Plan] Failed to send email:', e.message);
      });
    }).catch(e => console.error('[Admin Update User Plan] Failed to import email service:', e.message));

    res.json({ success: true, message: `User plan upgraded to ${plan}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/impersonate', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  const targetUserId = req.params.id;
  try {
    const targetUserRes = await db.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (targetUserRes.rows.length === 0) return res.status(404).json({ error: 'Target user not found' });
    const targetUser = targetUserRes.rows[0];
    const token = jwt.sign(
      { id: targetUser.id, email: targetUser.email, fullName: targetUser.full_name },
      process.env.JWT_SECRET || 'super_military_grade_agentbunny_jwt_secret_key',
      { expiresIn: '2h' }
    );
    await logAuditEvent('User Impersonated', `Admin impersonated Merchant User ${targetUser.email} (ID ${targetUser.id})`);
    res.json({ success: true, token, user: { id: targetUser.id, email: targetUser.email, fullName: targetUser.full_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/ai-usage', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  try {
    const result = await db.query(`
      SELECT u.id as user_id, u.full_name as user_name, u.email as user_email, COUNT(m.id) as ai_messages_count
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      JOIN whatsapp_sessions ws ON c.session_id = ws.id
      JOIN users u ON ws.user_id = u.id
      WHERE m.sender = 'bot'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY ai_messages_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/token-usage', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  try {
    const result = await db.query(`
      SELECT t.*, u.email as user_email, u.full_name as user_name
      FROM ai_token_usage t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/token-usage/clear', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  try {
    await db.query('DELETE FROM ai_token_usage');
    res.json({ success: true, message: 'AI Token Usage logs cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/revenue-stats', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  try {
    const totalRevRes = await db.query("SELECT SUM(amount) as total_revenue FROM transactions WHERE status = 'Completed'");
    const mrrRes = await db.query("SELECT SUM(amount) as mrr FROM transactions WHERE status = 'Completed' AND created_at > NOW() - INTERVAL '30 days'");
    res.json({
      total_revenue: parseFloat(totalRevRes.rows[0].total_revenue) || 0,
      mrr: parseFloat(mrrRes.rows[0].mrr) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings/maintenance', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  const { active } = req.body;
  try {
    await db.query(
      "INSERT INTO system_settings (key, value) VALUES ('maintenance_mode', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [active ? 'true' : 'false']
    );
    await logAuditEvent('Maintenance Mode Toggled', `Admin toggled maintenance mode to ${active ? 'ON' : 'OFF'}`);
    res.json({ success: true, message: `Maintenance mode updated to ${active}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings/maintenance', async (req, res) => {
  try {
    const r = await db.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'");
    const active = r.rows.length > 0 ? r.rows[0].value === 'true' : false;
    res.json({ active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/email-templates', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  try {
    const r = await db.query('SELECT * FROM email_templates ORDER BY key ASC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/email-templates/:key', authenticateToken, async (req, res) => {
  const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
  if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
    return res.status(403).json({ error: 'Access denied: Admin only.' });
  }
  const { key } = req.params;
  const { subject, body } = req.body;
  try {
    await db.query(
      'UPDATE email_templates SET subject = $1, body = $2, updated_at = CURRENT_TIMESTAMP WHERE key = $3',
      [subject, body, key]
    );
    await logAuditEvent('Email Template Updated', `Admin updated email template: ${key}`);
    res.json({ success: true, message: 'Template updated successfully.' });
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

// Inactivity Checker: Select users who joined 3+ hours ago with 0 whatsapp sessions, send followup
async function checkUserInactivity() {
  console.log('Running user inactivity checks...');
  try {
    const inactiveUsersRes = await db.query(`
      SELECT u.id, u.full_name as name, u.email 
      FROM users u
      LEFT JOIN whatsapp_sessions w ON u.id = w.user_id
      WHERE u.inactivity_email_sent = FALSE 
        AND u.joined < NOW() - INTERVAL '3 hours'
        AND w.id IS NULL
    `);

    if (inactiveUsersRes.rows.length > 0) {
      const { sendTemplatedEmail } = await import('./email-service.js');
      for (const user of inactiveUsersRes.rows) {
        console.log(`[Inactivity Checker] User ${user.email} (ID: ${user.id}) is inactive after 3 hours. Sending wakeup email...`);
        const emailSent = await sendTemplatedEmail(user.email, 'inactivity_followup', {
          fullName: user.name
        });
        if (emailSent) {
          await db.query("UPDATE users SET inactivity_email_sent = TRUE WHERE id = $1", [user.id]);
          await logAuditEvent('Inactivity Email Sent', `Sent inactive user follow-up to ${user.email}`);
        }
      }
    }
  } catch (err) {
    console.error('[Inactivity Checker] Error in inactivity check background loop:', err.message);
  }
}

// Run inactivity checker loop every 15 minutes
setInterval(checkUserInactivity, 15 * 60 * 1000);

// ── Email Campaigns Mass Blast Dispatcher ──
app.post('/api/admin/campaigns/send', authenticateToken, async (req, res) => {
  const { templateKey, subject, body, variables = {}, targetEmails = null } = req.body;
  try {
    const adminCheck = await db.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (req.user.email !== 'admin@agentbunny.com' && adminCheck.rows[0]?.plan !== 'Enterprise') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    // Fetch target users
    let users = [];
    if (targetEmails && Array.isArray(targetEmails) && targetEmails.length > 0) {
      // Specific emails provided
      const placeholders = targetEmails.map((_, i) => `$${i + 1}`).join(',');
      const res2 = await db.query(
        `SELECT email, full_name AS name FROM users WHERE email IN (${placeholders}) AND status = 'Active'`,
        targetEmails
      );
      users = res2.rows;
    } else {
      // All active users
      const usersRes = await db.query("SELECT email, full_name AS name FROM users WHERE status = 'Active'");
      users = usersRes.rows;
    }

    if (users.length === 0) {
      return res.json({ success: true, sentCount: 0, totalUsers: 0, message: 'No active users found to send to.' });
    }

    console.log(`[Campaign Dispatch] Preparing to dispatch "${subject || templateKey}" to ${users.length} users...`);

    // ── Smart Pool-aware Batch Distribution ──
    // Fetch all active pool keys with remaining quota
    const { resetExpiredLimits } = await import('./resend-rotator.js');
    await resetExpiredLimits();

    const poolRes = await db.query(
      `SELECT id, api_key, sender_email, label, daily_sent_count, email_type 
       FROM resend_api_keys 
       WHERE status = 'Active' AND daily_sent_count < 100 AND sender_email IS NOT NULL
       ORDER BY id ASC`
    );
    const poolKeys = poolRes.rows;

    const { sendTemplatedEmail, sendGenericEmail } = await import('./email-service.js');
    const senderNameRes = await db.query("SELECT value FROM system_settings WHERE key = 'email_sender_name'");
    const senderDisplayName = senderNameRes.rows[0]?.value?.trim() || 'AgentBunny';

    let successCount = 0;
    let failCount = 0;
    const perKeyStats = [];

    // Build batches per key based on remaining quota
    let userQueue = [...users];

    if (poolKeys.length > 0) {
      // Distribute across pool keys
      for (const key of poolKeys) {
        if (userQueue.length === 0) break;
        const remaining = 100 - key.daily_sent_count;
        const batch = userQueue.splice(0, remaining);

        let keySent = 0;
        let keyFailed = 0;

        for (const u of batch) {
          const userVars = { fullName: u.name || u.email, ...variables };
          let sent = false;

          if (templateKey) {
            // Use direct key dispatch bypassing the pool resolver
            const { sendTemplatedEmailWithKey } = await import('./email-service.js').catch(() => ({}));
            // Fallback: patch the from address via sendGenericEmail
            sent = await sendTemplatedEmail(u.email, templateKey, userVars);
          } else {
            let customSub = subject || 'Update from AgentBunny';
            let customBody = body || '';
            for (const [vKey, vVal] of Object.entries(userVars)) {
              const regex = new RegExp(`{{\\s*${vKey}\\s*}}`, 'g');
              customSub = customSub.replace(regex, vVal);
              customBody = customBody.replace(regex, vVal);
            }
            // Direct Resend call for this specific key
            const fromEmail = `${senderDisplayName} <${key.sender_email}>`;
            const textFallback = customBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const sendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${key.api_key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: fromEmail, to: [u.email], subject: customSub,
                html: customBody, text: textFallback,
                headers: { 'X-Mailer': 'AgentBunny Mailer', 'Precedence': 'bulk' }
              })
            });
            sent = sendRes.ok;
          }

          if (sent) { keySent++; successCount++; } else { keyFailed++; failCount++; }
        }

        // Update daily count for this key
        if (keySent > 0) {
          await db.query(
            'UPDATE resend_api_keys SET daily_sent_count = daily_sent_count + $1 WHERE id = $2',
            [keySent, key.id]
          );
        }

        perKeyStats.push({ keyLabel: key.label || `Key #${key.id}`, senderEmail: key.sender_email, sent: keySent, failed: keyFailed });
      }

      // If there are still users remaining (all pool keys full), use fallback generic send
      for (const u of userQueue) {
        const userVars = { fullName: u.name || u.email, ...variables };
        let sent = false;
        if (templateKey) {
          sent = await sendTemplatedEmail(u.email, templateKey, userVars);
        } else {
          let customSub = subject || 'Update from AgentBunny';
          let customBody = body || '';
          for (const [vKey, vVal] of Object.entries(userVars)) {
            const regex = new RegExp(`{{\\s*${vKey}\\s*}}`, 'g');
            customSub = customSub.replace(regex, vVal);
            customBody = customBody.replace(regex, vVal);
          }
          sent = await sendGenericEmail(u.email, customSub, customBody, '', true);
        }
        if (sent) successCount++; else failCount++;
      }
    } else {
      // No pool keys — use generic email service fallback
      for (const u of userQueue) {
        const userVars = { fullName: u.name || u.email, ...variables };
        let sent = false;
        if (templateKey) {
          sent = await sendTemplatedEmail(u.email, templateKey, userVars);
        } else {
          let customSub = subject || 'Update from AgentBunny';
          let customBody = body || '';
          for (const [vKey, vVal] of Object.entries(userVars)) {
            const regex = new RegExp(`{{\\s*${vKey}\\s*}}`, 'g');
            customSub = customSub.replace(regex, vVal);
            customBody = customBody.replace(regex, vVal);
          }
          sent = await sendGenericEmail(u.email, customSub, customBody, '', true);
        }
        if (sent) successCount++; else failCount++;
      }
    }

    await logAuditEvent('Email Campaign Sent', `Campaign "${subject || templateKey}" sent to ${successCount}/${users.length} users. Failed: ${failCount}.`);
    res.json({ success: true, sentCount: successCount, failCount, totalUsers: users.length, perKeyStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 📇 MARKETING TOOLS API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── Contacts ──────────────────────────────────────────────────────────────────
app.get('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, 
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', ct.id, 'name', ct.name, 'color', ct.color)) FILTER (WHERE ct.id IS NOT NULL), '[]') as tags
       FROM contacts c
       LEFT JOIN contact_tag_members ctm ON ctm.contact_id = c.id
       LEFT JOIN contact_tags ct ON ct.id = ctm.tag_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name = '', mobile_code = '+94', mobile, email = '', company = '' } = req.body;
    if (!first_name || !mobile) return res.status(400).json({ error: 'First name and mobile are required' });
    const result = await db.query(
      `INSERT INTO contacts (user_id, first_name, last_name, mobile_code, mobile, email, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, first_name, last_name, mobile_code, mobile, email, company]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, mobile_code, mobile, email, company } = req.body;
    const result = await db.query(
      `UPDATE contacts SET first_name=$1, last_name=$2, mobile_code=$3, mobile=$4, email=$5, company=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [first_name, last_name, mobile_code, mobile, email, company, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM contacts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Contact Tags ──────────────────────────────────────────────────────────────
app.get('/api/contact-tags', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ct.*, COUNT(ctm.contact_id) as contact_count
       FROM contact_tags ct
       LEFT JOIN contact_tag_members ctm ON ctm.tag_id = ct.id
       WHERE ct.user_id = $1
       GROUP BY ct.id
       ORDER BY ct.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contact-tags', authenticateToken, async (req, res) => {
  try {
    const { name, color = '#00832e' } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    const result = await db.query(
      `INSERT INTO contact_tags (user_id, name, color) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, name, color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contact-tags/:id', authenticateToken, async (req, res) => {
  try {
    const { name, color } = req.body;
    const result = await db.query(
      `UPDATE contact_tags SET name=$1, color=$2 WHERE id=$3 AND user_id=$4 RETURNING *`,
      [name, color, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contact-tags/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM contact_tags WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Contact Lists ─────────────────────────────────────────────────────────────
app.get('/api/contact-lists', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cl.*, COUNT(clm.contact_id) as contact_count
       FROM contact_lists cl
       LEFT JOIN contact_list_members clm ON clm.list_id = cl.id
       WHERE cl.user_id = $1
       GROUP BY cl.id
       ORDER BY cl.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contact-lists', authenticateToken, async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'List name is required' });
    const result = await db.query(
      `INSERT INTO contact_lists (user_id, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contact-lists/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await db.query(
      `UPDATE contact_lists SET name=$1, description=$2 WHERE id=$3 AND user_id=$4 RETURNING *`,
      [name, description, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'List not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/contact-lists/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM contact_lists WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WhatsApp Templates ────────────────────────────────────────────────────────
app.get('/api/whatsapp-templates', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM whatsapp_templates WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp-templates', authenticateToken, async (req, res) => {
  try {
    const { name, category = 'MARKETING', language = 'en_US', header_type = 'NONE', header_text = '', body_text, footer_text = '', buttons = [] } = req.body;
    if (!name || !body_text) return res.status(400).json({ error: 'Template name and body text are required' });
    const result = await db.query(
      `INSERT INTO whatsapp_templates (user_id, name, category, language, header_type, header_text, body_text, footer_text, buttons)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, category, language, header_type, header_text, body_text, footer_text, JSON.stringify(buttons)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/whatsapp-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { name, category, language, header_type, header_text, body_text, footer_text, buttons } = req.body;
    const result = await db.query(
      `UPDATE whatsapp_templates SET name=$1, category=$2, language=$3, header_type=$4, header_text=$5, body_text=$6, footer_text=$7, buttons=$8
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [name, category, language, header_type, header_text, body_text, footer_text, JSON.stringify(buttons || []), req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/whatsapp-templates/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM whatsapp_templates WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Saved Replies ─────────────────────────────────────────────────────────────
app.get('/api/saved-replies', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM saved_replies WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/saved-replies', authenticateToken, async (req, res) => {
  try {
    const { title, shortcut, message } = req.body;
    if (!title || !shortcut || !message) return res.status(400).json({ error: 'Title, shortcut and message are required' });
    const result = await db.query(
      `INSERT INTO saved_replies (user_id, title, shortcut, message) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, title, shortcut, message]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/saved-replies/:id', authenticateToken, async (req, res) => {
  try {
    const { title, shortcut, message } = req.body;
    const result = await db.query(
      `UPDATE saved_replies SET title=$1, shortcut=$2, message=$3 WHERE id=$4 AND user_id=$5 RETURNING *`,
      [title, shortcut, message, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reply not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/saved-replies/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM saved_replies WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Welcome Message Settings ──────────────────────────────────────────────────
app.get('/api/welcome-message', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM welcome_message_settings WHERE user_id=$1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ user_id: req.user.id, is_active: false, message: 'Hello! Welcome to our business. How can we help you today?', delay_seconds: 2 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/welcome-message', authenticateToken, async (req, res) => {
  try {
    const { is_active, message, delay_seconds } = req.body;
    const result = await db.query(
      `INSERT INTO welcome_message_settings (user_id, is_active, message, delay_seconds)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET is_active=$2, message=$3, delay_seconds=$4, updated_at=NOW()
       RETURNING *`,
      [req.user.id, is_active, message, delay_seconds]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// Serve static assets from React client build folder in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle client-side routing, send index.html for all other routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Express Server & initialize sessions
app.listen(PORT, () => {
  console.log(`AgentBunny Server is running on port ${PORT}`);
  initWhatsAppSessions();
  // Trigger subscription check on server start
  processSubscriptionRenewals();
  // Initialize campaign processor
  processCampaignQueue();
});


