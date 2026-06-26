import db from './db.js';

async function test() {
  try {
    console.log('Querying users...');
    const users = await db.query('SELECT id, email, full_name, plan, status FROM users');
    console.table(users.rows);

    console.log('Querying whatsapp_sessions...');
    const sessions = await db.query('SELECT id, user_id, phone, status, uptime, memory, updated_at FROM whatsapp_sessions');
    console.table(sessions.rows);

    console.log('Querying chats...');
    const chats = await db.query('SELECT id, session_id, sender_phone, sender_name, last_message, unread_count FROM chats');
    console.table(chats.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Error during test query:', err.message);
    process.exit(1);
  }
}

test();
