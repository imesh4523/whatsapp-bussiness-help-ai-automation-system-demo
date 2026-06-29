import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false, sslmode: 'require' } });
const r = await db.query("SELECT id, user_id, amount, plan, status, created_at FROM transactions ORDER BY created_at DESC LIMIT 15");
console.log('Recent transactions in DB:', JSON.stringify(r.rows, null, 2));
await db.end();
