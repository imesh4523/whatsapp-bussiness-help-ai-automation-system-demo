import db from '../db.js';

async function check() {
  try {
    const res = await db.query("SELECT key, subject, body FROM email_templates");
    console.log("DB TEMPLATES:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
