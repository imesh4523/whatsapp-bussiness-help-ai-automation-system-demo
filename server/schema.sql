-- CREATE DATABASE TABLES FOR WHATSRAY SYSTEM

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'Free', -- 'Free', 'Premium', 'Enterprise'
  status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Suspended'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Demo User and Admin credentials
-- We will run these seed insertions in db-init.js with secure hashes

-- 2. WhatsApp Sessions Table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50),
  library VARCHAR(50) DEFAULT 'Baileys', -- 'Baileys', 'whatsapp-web.js'
  status VARCHAR(50) DEFAULT 'Disconnected', -- 'Connected', 'Disconnected', 'Connecting', 'Pairing'
  session_data_encrypted TEXT, -- AES-256 encrypted authentication keys / credentials
  uptime VARCHAR(100) DEFAULT '0s',
  memory VARCHAR(50) DEFAULT '0 MB',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. AI Configurations Table
CREATE TABLE IF NOT EXISTS ai_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  default_model VARCHAR(100) DEFAULT 'Gemini 1.5 Pro',
  system_prompt TEXT DEFAULT 'You are an helpful, human-like virtual assistant representing our business. Your tone is polite, professional, and empathetic. Answer questions accurately and naturally. Do not mention you are an AI model. Use short paragraphs suitable for WhatsApp messages.',
  temperature NUMERIC(3,2) DEFAULT 0.60,
  typing_delay INTEGER DEFAULT 150, -- milliseconds per word
  global_ai_active BOOLEAN DEFAULT TRUE,
  api_key TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Chats Table
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR(255) PRIMARY KEY, -- standard session_phone_customerphone string or UUID
  session_id VARCHAR(255) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  sender_phone VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255) DEFAULT 'WhatsApp Contact',
  last_message TEXT,
  unread_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id VARCHAR(255) REFERENCES chats(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender VARCHAR(50) NOT NULL, -- 'customer', 'agent', 'bot'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Products Table (for AURA storefront integration)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  image_url VARCHAR(500),
  colors VARCHAR(100)[],
  sizes VARCHAR(50)[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Orders Table (for purchase history logging)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_details JSONB,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Processing', 'Shipped', 'Cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transactions Table (for payment records logs)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Completed', 'Failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
