const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const https = require('https');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';
const JWT_SECRET = process.env.JWT_SECRET || 'verikarya_jwt_secret_key_123456';

const runTest = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Find the manager user
    const user = await User.findOne({ role: 'manager' });
    if (!user) {
      console.log('No manager user found.');
      mongoose.disconnect();
      return;
    }
    console.log(`Manager user: ${user.name} (ID: ${user._id})`);

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Token generated!');

    console.log('Making GET request to live Render server for tasks...');
    const options = {
      hostname: 'verikarya.onrender.com',
      path: '/api/tasks',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Response Status Code: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Response Body:', data.substring(0, 500));
        mongoose.disconnect();
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      mongoose.disconnect();
    });

    req.end();

  } catch (err) {
    console.error('Test error:', err);
    mongoose.disconnect();
  }
};

runTest();
