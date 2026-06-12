const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const https = require('https');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Task = require('./models/Task');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';
const JWT_SECRET = process.env.JWT_SECRET || 'verikarya_jwt_secret_key_123456';

const runDiag = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Find a pending task
    const task = await Task.findOne({ status: { $in: ['pending', 'in_progress'] } });
    if (!task) {
      console.log('No pending tasks found in database to test.');
      mongoose.disconnect();
      return;
    }
    console.log(`Found testing task: ${task.title} (ID: ${task._id})`);

    // Find the assignee user
    const user = await User.findById(task.assignedTo);
    if (!user) {
      console.log('Task assignee user not found.');
      mongoose.disconnect();
      return;
    }
    console.log(`Assigned employee: ${user.name} (ID: ${user._id})`);

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Token generated!');

    // Dummy base64 photo (a tiny 1x1 white pixel png)
    const dummyPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8DwABAAD//wHsAP0C2vouAAAAAElFTkSuQmCC';
    const payload = JSON.stringify({
      photo: dummyPhoto,
      notes: 'Testing daily progress via automated diagnostic script.'
    });

    console.log('Making POST request to live Render server...');
    const options = {
      hostname: 'verikarya.onrender.com',
      path: `/api/tasks/${task._id}/progress`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Response Status Code: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Response Body:', data);
        mongoose.disconnect();
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      mongoose.disconnect();
    });

    req.write(payload);
    req.end();

  } catch (err) {
    console.error('Diagnostic error:', err);
    mongoose.disconnect();
  }
};

runDiag();
