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
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages'");
    console.log('Columns:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
