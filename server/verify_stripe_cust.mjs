import Stripe from 'stripe';
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false, sslmode: 'require' } });

// Get secret key from system_settings
const r = await db.query("SELECT value FROM system_settings WHERE key = 'stripe_secret_key'");
const stripeSecret = r.rows[0]?.value;

if (!stripeSecret) {
  console.log('Stripe secret key not found in system_settings.');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret);

try {
  const customer = await stripe.customers.retrieve('cus_UmOLKfJlptDITb');
  console.log('Customer retrieve result:', customer);
} catch (err) {
  console.error('Customer retrieve failed:', err.message);
}

await db.end();
