import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/server/.env' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkClaims() {
  try {
    const res = await pool.query('SELECT * FROM trial_claims');
    console.log('Claims:', res.rows);
    const users = await pool.query('SELECT id, email, plan, status FROM users');
    console.log('Users:', users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkClaims();
