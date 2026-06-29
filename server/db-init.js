import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function init() {
  console.log('Initializing database schema...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run the SQL schema
    await db.query(schemaSql);
    
    // Schema Migrations: add columns if they do not exist
    console.log('Running schema migrations...');
    await db.query(`
      ALTER TABLE ai_configs ADD COLUMN IF NOT EXISTS api_key TEXT DEFAULT NULL;
      ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS session_name VARCHAR(255) DEFAULT 'WhatsApp Account';
      
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        stripe_session_id VARCHAR(255) UNIQUE,
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        response_limit INTEGER DEFAULT 500,
        features JSONB NOT NULL,
        disabled_features JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS business_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255),
        description TEXT,
        address TEXT,
        sizes_info TEXT,
        logo_url VARCHAR(500),
        photo_urls TEXT[] DEFAULT '{}'::TEXT[],
        bank_details TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        items JSONB NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        shipping_details JSONB,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(100) DEFAULT 'Pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_history JSONB DEFAULT '[]'::JSONB;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'Monthly';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_message_count INTEGER DEFAULT 0;
      
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS response_limit INTEGER DEFAULT 500;
      
      ALTER TABLE users ADD COLUMN IF NOT EXISTS firstname VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS lastname VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dial_code VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS zip VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(255);

      UPDATE users 
      SET 
        firstname = COALESCE(firstname, SPLIT_PART(full_name, ' ', 1)),
        lastname = COALESCE(lastname, SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
      WHERE firstname IS NULL OR lastname IS NULL;

      ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 10;
      UPDATE products SET user_id = 1 WHERE user_id IS NULL;
      
      
      CREATE TABLE IF NOT EXISTS user_payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
        card_brand VARCHAR(50),
        card_last4 VARCHAR(10),
        card_fingerprint VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS trial_claims (
        id SERIAL PRIMARY KEY,
        card_fingerprint VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ticket_replies (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS email_templates (
        key VARCHAR(255) PRIMARY KEY,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_token_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id VARCHAR(255),
        purpose VARCHAR(100) DEFAULT 'Chat Reply',
        provider VARCHAR(100) NOT NULL,
        model VARCHAR(255) NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        prompt_preview TEXT,
        completion_preview TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE ai_configs ADD COLUMN IF NOT EXISTS max_history_limit INTEGER DEFAULT 10;
      ALTER TABLE ai_configs ADD COLUMN IF NOT EXISTS include_kb_images BOOLEAN DEFAULT TRUE;
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS shipping_memory JSONB DEFAULT '{}'::JSONB;
    `);
    
    console.log('Database tables verified/created successfully.');

    // Seed default users if they do not exist
    const demoEmail = 'demo@agentbunny.com';
    const adminEmail = 'admin@agentbunny.com';

    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [demoEmail]);
    if (userCheck.rows.length === 0) {
      console.log('Seeding demo user...');
      const demoHash = await bcrypt.hash('demo1234', 10);
      const insertUserRes = await db.query(
        'INSERT INTO users (email, password_hash, full_name, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [demoEmail, demoHash, 'Demo User', 'Growth', 'Active']
      );
      const userId = insertUserRes.rows[0].id;
      
      // Seed default AI config for demo user
      await db.query(
        'INSERT INTO ai_configs (user_id, default_model, temperature, typing_delay, global_ai_active) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'Gemini 1.5 Pro', 0.6, 150, true]
      );
    }

    const adminCheck = await db.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    if (adminCheck.rows.length === 0) {
      console.log('Seeding admin user...');
      const adminHash = await bcrypt.hash('admin1234', 10);
      // Admin joins as Enterprise status or standard
      await db.query(
        'INSERT INTO users (email, password_hash, full_name, plan, status) VALUES ($1, $2, $3, $4, $5)',
        [adminEmail, adminHash, 'System Admin', 'Enterprise', 'Active']
      );
    }

    // Seed products
    const productCheck = await db.query('SELECT count(*) FROM products');
    if (parseInt(productCheck.rows[0].count) === 0) {
      console.log('Seeding products catalog...');
      const defaultProducts = [
        {
          name: "Linen Summer Dress",
          price: 12500,
          description: "Flowy, breathable linen dress perfect for warm summer days. Ethically sourced and handcrafted with premium details.",
          category: "dresses",
          image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
          sizes: ["XS", "S", "M", "L"],
          colors: ["Sunny Yellow", "Ivory White", "Sage Green"]
        },
        {
          name: "Classic Silk Wrap Dress",
          price: 18500,
          description: "Elegant silk dress featuring an adjustable waist wrap and soft puff sleeves. Transitions seamlessly from daytime ease to evening sophistication.",
          category: "dresses",
          sizes: ["S", "M", "L"],
          colors: ["Emerald", "Rosewood", "Midnight Black"]
        },
        {
          name: "Oversized Knit Sweater",
          price: 9800,
          description: "An incredibly cozy, heavyweight knit sweater crafted from a premium wool blend. Features dropped shoulders and ribbed cuffs.",
          category: "knitwear",
          sizes: ["S-M", "M-L"],
          colors: ["Oatmeal", "Charcoal", "Soft Peach"]
        },
        {
          name: "Linen Casual Blazer",
          price: 14200,
          description: "Unstructured casual blazer in lightweight, breathable linen. Perfect for smart-casual summer layering.",
          category: "outerwear",
          sizes: ["S", "M", "L", "XL"],
          colors: ["Sand", "Olive", "Navy"]
        },
        {
          name: "Minimalist Linen Shirt",
          price: 7500,
          description: "A timeless linen shirt with a clean button-down collar. Relaxed fit for maximum comfort during hot afternoons.",
          category: "shirts",
          sizes: ["S", "M", "L", "XL", "XXL"],
          colors: ["Classic White", "Sky Blue", "Flax Light"]
        }
      ];

      for (const p of defaultProducts) {
        await db.query(
          'INSERT INTO products (name, price, description, category, image_url, sizes, colors) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [p.name, p.price, p.description, p.category, p.image_url || null, p.sizes, p.colors]
        );
      }
    }

    // Seed default pricing plans if empty
    const planCheck = await db.query('SELECT count(*) FROM plans');
    if (parseInt(planCheck.rows[0].count) === 0) {
      console.log('Seeding pricing plans...');
      const defaultPlans = [
        {
          id: 'Starter',
          name: 'Starter Plan',
          price: 2500.00,
          response_limit: 500,
          features: JSON.stringify([
            "1 WhatsApp Number",
            "500 AI Responses/mo",
            "Product Catalog (up to 50)",
            "Order Management",
            "Basic Analytics",
            "Email Support"
          ]),
          disabled_features: JSON.stringify([
            "✗ Broadcast Campaigns",
            "✗ Custom AI Persona"
          ])
        },
        {
          id: 'Growth',
          name: 'Growth Plan',
          price: 5500.00,
          response_limit: 2500,
          features: JSON.stringify([
            "3 WhatsApp Numbers",
            "2,500 AI Responses/mo",
            "Unlimited Products",
            "Broadcast Campaigns",
            "Advanced Analytics",
            "Priority Support",
            "Custom AI Persona"
          ]),
          disabled_features: JSON.stringify([
            "✗ Multi-store Management"
          ])
        },
        {
          id: 'Enterprise',
          name: 'Enterprise Plan',
          price: 15000.00,
          response_limit: 999999,
          features: JSON.stringify([
            "Unlimited Numbers",
            "Unlimited AI Responses",
            "Multi-store Management",
            "API Access",
            "Dedicated Account Manager",
            "White-label Option",
            "SLA Guarantee"
          ]),
          disabled_features: JSON.stringify([])
        }
      ];

      for (const plan of defaultPlans) {
        await db.query(
          'INSERT INTO plans (id, name, price, response_limit, features, disabled_features) VALUES ($1, $2, $3, $4, $5, $6)',
          [plan.id, plan.name, plan.price, plan.response_limit, plan.features, plan.disabled_features]
        );
      }
    }

    // Seed default email templates if empty
    const templateCheck = await db.query('SELECT COUNT(*) FROM email_templates');
    if (parseInt(templateCheck.rows[0].count) === 0) {
      console.log('Seeding default email templates...');
      const defaultTemplates = [
        {
          key: 'welcome',
          subject: 'Welcome to AgentBunny!',
          body: 'Hello {{fullName}},\n\nWelcome to AgentBunny! Start automating your WhatsApp business today.\n\nBest Regards,\nAgentBunny Team'
        },
        {
          key: 'invoice',
          subject: 'Your Subscription Invoice',
          body: 'Hello {{fullName}},\n\nYour subscription invoice for your plan has been processed successfully. Thank you for your business!\n\nBest Regards,\nAgentBunny Team'
        },
        {
          key: 'reset_password',
          subject: 'Reset Your Password',
          body: 'Hello {{fullName}},\n\nYou requested a password reset. To confirm it\'s you, please use the button below to reset your password.\n\nIf you did not request this, please ignore this email.\n\nBest Regards,\nAgentBunny Team'
        }
      ];
      for (const t of defaultTemplates) {
        await db.query(
          'INSERT INTO email_templates (key, subject, body) VALUES ($1, $2, $3)',
          [t.key, t.subject, t.body]
        );
      }
    }

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during database initialization:', err);
    process.exit(1);
  }
}

init();
