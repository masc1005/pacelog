const API_URL = 'http://localhost:3333/api';

async function test() {
  console.log('1. Trying to login...');
  const loginRes = await fetch(`${API_URL}/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  
  let cookies = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status);
  console.log('Set-Cookie header:', cookies);
  
  if (loginRes.status !== 200) {
    console.log('Login failed, creating user...');
    const signupRes = await fetch(`${API_URL}/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'password123' })
    });
    console.log('Signup status:', signupRes.status);
    console.log('Signup Set-Cookie:', signupRes.headers.get('set-cookie'));
    
    // retry login to get fresh cookie string
    const retryRes = await fetch(`${API_URL}/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    cookies = retryRes.headers.get('set-cookie');
    console.log('Retry Login Set-Cookie:', cookies);
  }
  
  // Now let's try to hit /api/sessions
  const sessionCookie = cookies ? cookies.split(';')[0] : ''; // rudimentary extraction
  console.log('2. Hitting /api/sessions with cookie:', sessionCookie);
  
  const reqRes = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
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
