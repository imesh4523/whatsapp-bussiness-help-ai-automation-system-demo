import db from './db.js';

async function check() {
  const res = await db.query('SELECT id, session_data_encrypted IS NULL as is_null, length(session_data_encrypted) as len FROM whatsapp_sessions');
  console.table(res.rows);
  process.exit(0);
}
check();
