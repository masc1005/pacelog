const API_URL = 'http://localhost:3333/api';

async function test() {
  const email = `test_${Date.now()}@example.com`;
  
  console.log('Registering user...');
  const signupRes = await fetch(`${API_URL}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173'
    },
    body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
  });
  console.log('Signup status:', signupRes.status);
  console.log('Signup body:', await signupRes.text());
  
  const loginRes = await fetch(`${API_URL}/auth/sign-in/email`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173'
    },
    body: JSON.stringify({ email, password: 'password123' })
  });
  
  let cookies = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status);
  
  const sessionCookie = cookies ? cookies.split(';')[0] : '';
  console.log('Session cookie:', sessionCookie);
  
  const reqRes = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'Origin': 'http://localhost:5173'
    },
    body: JSON.stringify({
      clientUuid: "fed0d9ba-db45-4ce2-921e-31635d7c40f5",
      durationSeconds: 3600,
      metrics: {matchResult: "draw"},
      sportKey: "futevolei",
      startedAt: "2026-08-18T22:00:00.000Z",
      status: "completed"
    })
  });
  
  console.log('Session creation status:', reqRes.status);
  console.log('Session creation response:', await reqRes.text());
}

test();
