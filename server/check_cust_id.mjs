import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false, sslmode: 'require' } });
const r = await db.query("SELECT id, email, stripe_customer_id FROM users WHERE id = 3");
console.log('User 3 stripe_customer_id:', JSON.stringify(r.rows, null, 2));
await db.end();
