import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/server/.env' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const pms = await pool.query('SELECT * FROM user_payment_methods WHERE user_id = 3');
    console.log('User 3 PMs:', pms.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
