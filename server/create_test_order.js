import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Administrator/Desktop/whatsapp-bussiness-help-ai-automation-system/server/.env' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const orderId = 'ord_test_999999999999_999';
    const items = [
      { name: 'Classic Silk Dress (Red)', qty: 1, price: 4500.00 },
      { name: 'Designer Handbag', qty: 2, price: 6000.00 }
    ];
    const shippingDetails = {
      name: 'Rochana Imesh',
      phone: '83950135410790',
      address: 'No 45, Galle Road, Colombo 03, Sri Lanka',
      payment_method: 'COD'
    };
    const trackingHistory = [
      {
        status: 'Dispatched',
        details: 'Parcel handed over to Domex. Tracking Number: TEST12345',
        location: 'Colombo Sorting Hub',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
      },
      {
        status: 'In Transit',
        details: 'Package departed from sorting warehouse',
        location: 'Galle Hub Depot',
        timestamp: new Date().toISOString()
      }
    ];

    await pool.query(
      `INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status, courier_name, tracking_number, tracking_status, tracking_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE 
       SET items = EXCLUDED.items, 
           total_amount = EXCLUDED.total_amount, 
           shipping_details = EXCLUDED.shipping_details, 
           status = EXCLUDED.status, 
           courier_name = EXCLUDED.courier_name, 
           tracking_number = EXCLUDED.tracking_number, 
           tracking_status = EXCLUDED.tracking_status, 
           tracking_history = EXCLUDED.tracking_history`,
      [
        orderId, 
        3, // User ID 3 (Imesh)
        JSON.stringify(items), 
        16500.00, 
        JSON.stringify(shippingDetails), 
        'Dispatched', 
        'Domex', 
        'TEST12345', 
        'Dispatched', 
        JSON.stringify(trackingHistory)
      ]
    );

    console.log('Created test order with ID:', orderId);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
