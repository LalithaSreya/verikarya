const https = require('https');

const getHtml = () => {
  return new Promise((resolve, reject) => {
    https.get('https://verikarya.vercel.app/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const getScript = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const run = async () => {
  try {
    const html = await getHtml();
    const match = html.match(/\/assets\/index-[a-zA-Z0-9]+\.js/);
    if (!match) {
      console.log('No index script found in HTML.');
      return;
    }
    const scriptUrl = `https://verikarya.vercel.app${match[0]}`;
    console.log(`Fetching script: ${scriptUrl}`);
    const scriptContent = await getScript(scriptUrl);
    console.log('Contains "Render is still building":', scriptContent.includes('Render is still building'));
    console.log('Contains "Failed to save daily progress":', scriptContent.includes('Failed to save daily progress'));
  } catch (err) {
    console.error('Error:', err.message);
  }
};

run();
