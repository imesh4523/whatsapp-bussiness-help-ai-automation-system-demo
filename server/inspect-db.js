import db from './db.js';

async function run() {
  try {
    const cols = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position");
    console.log('PRODUCTS COLS:', cols.rows);
  } catch(e) { console.log('products error:', e.message); }
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
