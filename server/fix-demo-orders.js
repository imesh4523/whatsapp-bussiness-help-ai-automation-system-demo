import db from './db.js';

async function fixDemoOrders() {
  const userId = 3;

  // Fix status values to match frontend filter options
  // Frontend expects: Pending, Processing, Shipped, Delivered, Cancelled
  const statusFixes = [
    { id: `ord_demo_${userId}_001`, status: 'Delivered' },       // was Delivered ✅
    { id: `ord_demo_${userId}_002`, status: 'Shipped' },         // was Dispatched → Shipped
    { id: `ord_demo_${userId}_003`, status: 'Processing' },      // was Confirmed → Processing
    { id: `ord_demo_${userId}_004`, status: 'Shipped' },         // was Dispatched → Shipped
    { id: `ord_demo_${userId}_005`, status: 'Delivered' },       // was Delivered ✅
  ];

  for (const fix of statusFixes) {
    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status',
      [fix.status, fix.id]
    );
    if (result.rows.length > 0) {
      console.log(`✅ ${fix.id} → status: ${fix.status}`);
    } else {
      console.log(`⚠️ Order ${fix.id} not found`);
    }
  }

  // Also fix the existing test order status
  await db.query(
    "UPDATE orders SET status = 'Shipped' WHERE id = 'ord_test_999999999999_999'",
  );
  
  console.log('✅ All demo order statuses fixed!');
  
  // Verify
  const orders = await db.query('SELECT id, status, total_amount FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  console.log('\n📦 Current orders for user 3:');
  orders.rows.forEach(o => console.log(`  - ${o.id}: ${o.status} | Rs. ${o.total_amount}`));

  process.exit(0);
}

fixDemoOrders().catch(e => { console.error('❌', e.message); process.exit(1); });
