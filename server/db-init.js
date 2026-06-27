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
        photo_urls TEXT[] DEFAULT '{}'::TEXT[]
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
    `);
    
    console.log('Database tables verified/created successfully.');

    // Seed default users if they do not exist
    const demoEmail = 'demo@whatsray.com';
    const adminEmail = 'admin@whatsray.com';

    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [demoEmail]);
    if (userCheck.rows.length === 0) {
      console.log('Seeding demo user...');
      const demoHash = await bcrypt.hash('demo1234', 10);
      const insertUserRes = await db.query(
        'INSERT INTO users (email, password_hash, full_name, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [demoEmail, demoHash, 'Demo User', 'Premium', 'Active']
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
          id: 'Free',
          name: 'Free Tier',
          price: 0.00,
          features: JSON.stringify([
            "✓ 1 Active WhatsApp Session",
            "✓ Standard Customer Inbox",
            "✓ Mock AI replies simulator"
          ]),
          disabled_features: JSON.stringify([
            "✗ WooCommerce sync",
            "✗ Custom agent templates"
          ])
        },
        {
          id: 'Premium',
          name: 'Premium Plan',
          price: 4990.00,
          features: JSON.stringify([
            "✓ 3 Active WhatsApp Sessions",
            "✓ Advanced CRM Customer list",
            "✓ Unlimited Gemini AI replies",
            "✓ Dynamic templates & quick replies"
          ]),
          disabled_features: JSON.stringify([
            "✗ Multi-agent WooCommerce sync"
          ])
        },
        {
          id: 'Enterprise',
          name: 'Enterprise Elite',
          price: 12990.00,
          features: JSON.stringify([
            "✓ 10 Active WhatsApp Sessions",
            "✓ WooCommerce store product sync",
            "✓ Dedicated AI Custom Agents",
            "✓ Higher webhook rate limits",
            "✓ 24/7 Priority support hotline"
          ]),
          disabled_features: JSON.stringify([])
        }
      ];

      for (const plan of defaultPlans) {
        await db.query(
          'INSERT INTO plans (id, name, price, features, disabled_features) VALUES ($1, $2, $3, $4, $5)',
          [plan.id, plan.name, plan.price, plan.features, plan.disabled_features]
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
