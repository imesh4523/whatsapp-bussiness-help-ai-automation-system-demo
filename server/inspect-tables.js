import db from './db.js';

async function run() {
  try {
    const cols = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trial_claims' ORDER BY ordinal_position");
    console.log('trial_claims cols:', cols.rows);

    const rows = await db.query("SELECT * FROM trial_claims LIMIT 10");
    console.log('trial_claims rows:', rows.rows);
  } catch(e) {
    console.log('error:', e.message);
  }
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
