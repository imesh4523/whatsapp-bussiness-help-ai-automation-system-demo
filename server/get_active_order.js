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
    const resCount = await pool.query("SELECT COUNT(*) FROM orders");
    console.log('Total Orders Count:', resCount.rows[0].count);
    const res = await pool.query("SELECT id FROM orders LIMIT 5");
    console.log('Orders:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
