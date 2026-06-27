import bcrypt from 'bcryptjs';
import db from './db.js';

async function createUser() {
  const email = 'imesh@agentbunny.com';
  const password = 'password123';
  const fullName = 'Imesh Raybeam';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      console.log(`User ${email} already exists. Updating password...`);
      await db.query('UPDATE users SET password_hash = $1, full_name = $2 WHERE email = $3', [passwordHash, fullName, email]);
    } else {
      console.log(`Creating new user: ${email}...`);
      const userRes = await db.query(
        'INSERT INTO users (email, password_hash, full_name, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [email, passwordHash, fullName, 'Premium', 'Active']
      );
      const userId = userRes.rows[0].id;
      
      // Seed default AI config
      await db.query(
        'INSERT INTO ai_configs (user_id, default_model, temperature, typing_delay, global_ai_active) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'Gemini 1.5 Pro', 0.6, 150, true]
      );
    }

    console.log('User created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating user:', err.message);
    process.exit(1);
  }
}

createUser();
