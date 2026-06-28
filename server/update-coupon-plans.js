import pg from 'pg';
const { Pool } = pg;

// Use same connection as the server
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agentbunny' });

async function update() {
  try {
    // Update Pro -> Growth, Elite -> Enterprise in coupons table
    await pool.query("UPDATE coupons SET plan_name = 'Growth' WHERE plan_name = 'Pro'");
    await pool.query("UPDATE coupons SET plan_name = 'Enterprise' WHERE plan_name = 'Elite'");
    
    const result = await pool.query('SELECT id, code, plan_name, trial_days FROM coupons ORDER BY id');
    console.log('Updated coupons:');
    result.rows.forEach(r => console.log(`  ID=${r.id} Code=${r.code} Plan=${r.plan_name} Days=${r.trial_days}`));
  } finally {
    await pool.end();
  }
}

update().catch(console.error);
