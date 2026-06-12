const https = require('https');

https.get('https://verikarya.vercel.app/assets/index-BEGZz72r.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Look for client_id or clientId
    const regexes = [
      /clientId:"([^"]+)"/,
      /clientId:'([^']+)'/,
      /client_id:"([^"]+)"/,
      /client_id:'([^']+)'/
    ];
    
    let found = false;
    for (const regex of regexes) {
      const match = data.match(regex);
      if (match) {
        console.log('Found Client ID:', match[1]);
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Print first 500 chars around "apps.googleusercontent.com"
      const index = data.indexOf('apps.googleusercontent.com');
      if (index !== -1) {
        console.log('Snippet around googleusercontent:', data.substring(index - 100, index + 100));
      } else {
        console.log('Google Client ID suffix not found in JS bundle.');
      }
    }
  });
}).on('error', (e) => {
  console.error(e.message);
});
