import db from './db.js';

async function checkKeys() {
  try {
    const r = await db.query("SELECT * FROM system_settings");
    console.log('SYSTEM SETTINGS:');
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkKeys();
