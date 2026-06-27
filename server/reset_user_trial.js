import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/server/.env' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function reset() {
  try {
    // Delete payment methods for user 3
    const d1 = await pool.query('DELETE FROM user_payment_methods WHERE user_id = 3');
    console.log('Deleted payment methods:', d1.rowCount);

    // Delete trial claims for user 3
    const d2 = await pool.query('DELETE FROM trial_claims WHERE user_id = 3');
    console.log('Deleted trial claims:', d2.rowCount);

    // Reset user 3 plan/status
    const u = await pool.query("UPDATE users SET plan = 'Free', status = 'Active' WHERE id = 3");
    console.log('Reset user 3 to Free/Active:', u.rowCount);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
reset();
