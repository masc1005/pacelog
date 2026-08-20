const API_URL = 'http://localhost:3333/api';

async function test() {
  const email = `test_${Date.now()}@example.com`;
  
  // register
  const signupRes = await fetch(`${API_URL}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5173' },
    body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
  });
  const cookies = signupRes.headers.get('set-cookie');
  const sessionCookie = cookies ? cookies.split(';')[0] : '';
  
  // hit insights
  const insightRes = await fetch(`${API_URL}/insights/daily`, {
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'Origin': 'http://localhost:5173'
    }
  });
  
  console.log('Status:', insightRes.status);
  console.log('Response:', await insightRes.text());
}
test();
