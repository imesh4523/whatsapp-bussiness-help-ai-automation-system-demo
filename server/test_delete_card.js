import jwt from 'jsonwebtoken';

async function testDelete() {
  const token = jwt.sign(
    { id: 2, email: 'admin@whatsray.com', role: 'user' },
    'super_military_grade_whatsray_jwt_secret_key',
    { expiresIn: '7d' }
  );

  console.log('Using simulated admin token:', token);

  try {
    const res = await fetch('http://localhost:5000/api/admin/payments/methods/1', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status code:', res.status);
    const data = await res.json();
    console.log('Response body:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testDelete();
