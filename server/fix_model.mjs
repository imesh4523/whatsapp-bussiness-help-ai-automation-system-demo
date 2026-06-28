import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await pool.query("UPDATE system_settings SET value = 'openai/gpt-4o-mini' WHERE key = 'openrouter_model'");
const res = await pool.query("SELECT value FROM system_settings WHERE key = 'openrouter_model'");
console.log("Updated model to:", res.rows[0].value);
await pool.end();
