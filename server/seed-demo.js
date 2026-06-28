import db from './db.js';

async function seedDemoData() {
  const userId = 3; // imesh@whatsray.com

  console.log('🌱 Seeding demo data for user ID:', userId);

  // 1. Create a demo WhatsApp session for this user
  const sessionResult = await db.query(`
    INSERT INTO whatsapp_sessions (id, user_id, phone, library, status, session_name, uptime, memory, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `, [
    'demo_session_user3',
    userId,
    '94771234567',
    'Baileys',
    'Connected',
    'My WhatsApp Store',
    '99h 12m',
    '45 MB'
  ]);
  
  const sessionId = 'demo_session_user3';
  console.log('✅ Session created:', sessionId);

  // 2. Demo customers (chats) — Sri Lankan names & products
  const demoChats = [
    {
      id: `demo_chat_${userId}_001`,
      sender_phone: '94771234001',
      sender_name: 'Nimal Perera',
      last_message: 'I want to confirm the order for the red dress',
      label: 'Confirmed',
      unread_count: 0,
    },
    {
      id: `demo_chat_${userId}_002`,
      sender_phone: '94712345678',
      sender_name: 'Dilhani Fernando',
      last_message: 'Can I get the Blue kurta in size M?',
      label: 'Interested',
      unread_count: 2,
    },
    {
      id: `demo_chat_${userId}_003`,
      sender_phone: '94763456789',
      sender_name: 'Kasun Jayawardena',
      last_message: 'COD payment for 2 shirts done, what is my order number?',
      label: 'Confirmed',
      unread_count: 1,
    },
    {
      id: `demo_chat_${userId}_004`,
      sender_phone: '94756789012',
      sender_name: 'Priya Silva',
      last_message: 'Do you have this in size L? I need it for next week',
      label: 'Interested',
      unread_count: 3,
    },
    {
      id: `demo_chat_${userId}_005`,
      sender_phone: '94741234567',
      sender_name: 'Rohan Wickramasinghe',
      last_message: 'My tracking number is not working please help',
      label: 'Confirmed',
      unread_count: 0,
    },
    {
      id: `demo_chat_${userId}_006`,
      sender_phone: '94771111222',
      sender_name: 'Chamari Bandara',
      last_message: 'Order confirmed! Please deliver to Kandy address',
      label: 'Confirmed',
      unread_count: 0,
    },
    {
      id: `demo_chat_${userId}_007`,
      sender_phone: '94779998887',
      sender_name: 'Tharaka Rajapaksa',
      last_message: 'When will my parcel arrive? It has been 3 days',
      label: 'Confirmed',
      unread_count: 2,
    },
    {
      id: `demo_chat_${userId}_008`,
      sender_phone: '94753334445',
      sender_name: 'Sachini Dissanayake',
      last_message: 'I want to order 3 pairs of earrings with bank transfer',
      label: 'Interested',
      unread_count: 1,
    },
  ];

  for (const chat of demoChats) {
    await db.query(`
      INSERT INTO chats (id, session_id, sender_phone, sender_name, last_message, label, unread_count, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - (random() * INTERVAL '5 days'))
      ON CONFLICT (id) DO NOTHING
    `, [chat.id, sessionId, chat.sender_phone, chat.sender_name, chat.last_message, chat.label, chat.unread_count]);
  }
  console.log('✅ Inserted', demoChats.length, 'demo customers (chats)');

  // 3. Demo orders for user 3
  const demoOrders = [
    {
      id: `ord_demo_${userId}_001`,
      items: [{ name: 'Classic Silk Dress (Red, Size M)', qty: 1, price: 4500 }],
      total: 4500,
      shipping: { name: 'Nimal Perera', phone: '94771234001', address: 'No 12, Galle Road, Colombo 03', payment_method: 'COD' },
      status: 'Delivered',
      courier: 'Domex',
      tracking: 'DMX88291038',
      tracking_status: 'Delivered',
      tracking_history: [
        { status: 'Dispatched', details: 'Parcel handed to Domex', location: 'Colombo Warehouse', timestamp: new Date(Date.now() - 4*24*3600*1000).toISOString() },
        { status: 'In Transit', details: 'Package on the way', location: 'Galle Hub', timestamp: new Date(Date.now() - 3*24*3600*1000).toISOString() },
        { status: 'Delivered', details: 'Package delivered successfully', location: 'Customer Address', timestamp: new Date(Date.now() - 1*24*3600*1000).toISOString() },
      ]
    },
    {
      id: `ord_demo_${userId}_002`,
      items: [{ name: 'Designer Handbag (Black)', qty: 1, price: 8500 }, { name: 'Silk Scarf', qty: 2, price: 1200 }],
      total: 10900,
      shipping: { name: 'Kasun Jayawardena', phone: '94763456789', address: 'No 56, Kandy Road, Kurunegala', payment_method: 'Bank Transfer' },
      status: 'Dispatched',
      courier: 'Koombiyo',
      tracking: 'KMB7723019',
      tracking_status: 'In Transit',
      tracking_history: [
        { status: 'Dispatched', details: 'Parcel handed to Koombiyo', location: 'Colombo Hub', timestamp: new Date(Date.now() - 2*24*3600*1000).toISOString() },
        { status: 'In Transit', details: 'Package en route to Kurunegala', location: 'Kurunegala Hub', timestamp: new Date(Date.now() - 12*3600*1000).toISOString() },
      ]
    },
    {
      id: `ord_demo_${userId}_003`,
      items: [{ name: 'Men\'s Slim Fit Shirt (White, L)', qty: 2, price: 2800 }],
      total: 5600,
      shipping: { name: 'Rohan Wickramasinghe', phone: '94741234567', address: '23/A, Station Road, Matara', payment_method: 'COD' },
      status: 'Confirmed',
      courier: null,
      tracking: null,
      tracking_status: 'Pending',
      tracking_history: []
    },
    {
      id: `ord_demo_${userId}_004`,
      items: [{ name: 'Ladies Churidar Set (Blue)', qty: 1, price: 6200 }, { name: 'Bangles Set', qty: 1, price: 800 }],
      total: 7000,
      shipping: { name: 'Chamari Bandara', phone: '94771111222', address: 'No 77, Peradeniya Road, Kandy', payment_method: 'COD' },
      status: 'Dispatched',
      courier: 'PromptX',
      tracking: 'PRX1029384',
      tracking_status: 'Dispatched',
      tracking_history: [
        { status: 'Dispatched', details: 'Parcel handed to PromptX Express', location: 'Colombo Sorting Centre', timestamp: new Date(Date.now() - 1*24*3600*1000).toISOString() },
      ]
    },
    {
      id: `ord_demo_${userId}_005`,
      items: [{ name: 'Earrings (Gold Plated, Set of 3)', qty: 1, price: 1800 }],
      total: 1800,
      shipping: { name: 'Tharaka Rajapaksa', phone: '94779998887', address: 'No 5, Rajagiriya, Colombo 10', payment_method: 'Bank Transfer' },
      status: 'Delivered',
      courier: 'Domex',
      tracking: 'DMX77001122',
      tracking_status: 'Delivered',
      tracking_history: [
        { status: 'Dispatched', details: 'Parcel handed to Domex', location: 'Colombo South', timestamp: new Date(Date.now() - 5*24*3600*1000).toISOString() },
        { status: 'Delivered', details: 'Delivered to door', location: 'Customer Address', timestamp: new Date(Date.now() - 3*24*3600*1000).toISOString() },
      ]
    },
  ];

  for (const order of demoOrders) {
    await db.query(`
      INSERT INTO orders (id, user_id, items, total_amount, shipping_details, status, courier_name, tracking_number, tracking_status, tracking_history, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - (random() * INTERVAL '7 days'))
      ON CONFLICT (id) DO NOTHING
    `, [
      order.id,
      userId,
      JSON.stringify(order.items),
      order.total,
      JSON.stringify(order.shipping),
      order.status,
      order.courier,
      order.tracking,
      order.tracking_status,
      JSON.stringify(order.tracking_history)
    ]);
  }
  console.log('✅ Inserted', demoOrders.length, 'demo orders');
  console.log('🎉 Demo data seeding complete!');

  process.exit(0);
}

seedDemoData().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
