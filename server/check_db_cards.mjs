import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false, sslmode: 'require' } });
const r = await db.query("SELECT * FROM user_payment_methods");
console.log('Saved cards in DB:', JSON.stringify(r.rows, null, 2));
await db.end();
