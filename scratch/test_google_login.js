const https = require('https');

// Construct a mock JWT token that contains user info in its payload
const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  email: 'google_test_user@verikarya.com',
  name: 'Google Test User',
  email_verified: true
})).toString('base64url');
const signature = 'mock_signature';
const mockToken = `${header}.${payload}.${signature}`;

const runTest = async () => {
  const reqData = JSON.stringify({
    token: mockToken,
    role: 'employee'
  });

  console.log('Sending mock Google login request to live Render backend...');
  const options = {
    hostname: 'verikarya.onrender.com',
    path: '/api/auth/google',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(reqData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Response Status Code: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Response Body:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(reqData);
  req.end();
};

runTest();
