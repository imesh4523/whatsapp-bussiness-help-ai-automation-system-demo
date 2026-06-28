import bcrypt from 'bcryptjs';
import db from './db.js';

async function createAdmin() {
  const email = 'admin@agentbunny.com';
  const password = 'admin1234';
  const fullName = 'System Administrator';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      console.log(`Admin ${email} already exists. Updating credentials...`);
      await db.query(
        'UPDATE users SET password_hash = $1, full_name = $2, plan = $3, status = $4 WHERE email = $5', 
        [passwordHash, fullName, 'Enterprise', 'Active', email]
      );
    } else {
      console.log(`Creating new Admin user: ${email}...`);
      const userRes = await db.query(
        'INSERT INTO users (email, password_hash, full_name, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [email, passwordHash, fullName, 'Enterprise', 'Active']
      );
      const userId = userRes.rows[0].id;
      
      // Seed default AI config
      await db.query(
        'INSERT INTO ai_configs (user_id, default_model, temperature, typing_delay, global_ai_active) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'Gemini 1.5 Pro', 0.6, 150, true]
      );
    }

    console.log('Admin user setup completed successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
