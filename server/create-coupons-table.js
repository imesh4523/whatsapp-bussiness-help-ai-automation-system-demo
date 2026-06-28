import db from './db.js';

async function run() {
  try {
    console.log('Creating coupons and coupon_claims tables...');
    
    // Create coupons table
    await db.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        plan_name VARCHAR(50) NOT NULL,
        trial_days INTEGER NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        max_uses INTEGER,
        uses_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('coupons table created successfully.');

    // Create coupon_claims table
    await db.query(`
      CREATE TABLE IF NOT EXISTS coupon_claims (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
        claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE (user_id, coupon_id)
      )
    `);
    console.log('coupon_claims table created successfully.');

    // Insert sample coupons
    await db.query(`
      INSERT INTO coupons (code, plan_name, trial_days, expires_at)
      VALUES 
        ('TRIAL30', 'Pro', 30, NOW() + INTERVAL '30 days'),
        ('ELITE15', 'Elite', 15, NOW() + INTERVAL '30 days'),
        ('AGENTBUNNY90', 'Pro', 90, NOW() + INTERVAL '90 days')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('Sample coupons inserted successfully.');

  } catch(e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
