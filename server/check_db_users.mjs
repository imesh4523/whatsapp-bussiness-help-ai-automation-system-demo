import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false, sslmode: 'require' } });
const r = await db.query("SELECT id, email, full_name, plan FROM users");
console.log('Users list:', JSON.stringify(r.rows, null, 2));
await db.end();
