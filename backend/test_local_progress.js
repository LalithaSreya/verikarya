const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Task = require('./models/Task');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';
const JWT_SECRET = process.env.JWT_SECRET || 'verikarya_jwt_secret_key_123456';

const runTest = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Find a pending task
    const task = await Task.findOne({ status: { $in: ['pending', 'in_progress'] } });
    if (!task) {
      console.log('No pending tasks found.');
      mongoose.disconnect();
      return;
    }
    console.log(`Testing task: ${task.title} (ID: ${task._id})`);

    // Find assignee
    const user = await User.findById(task.assignedTo);
    if (!user) {
      console.log('No assignee user found.');
      mongoose.disconnect();
      return;
    }
    console.log(`Employee user: ${user.name} (ID: ${user._id})`);

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Token generated!');

    const payload = JSON.stringify({
      photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8DwABAAD//wHsAP0C2vouAAAAAElFTkSuQmCC',
      notes: 'Testing progress saving locally.'
    });

    console.log('Making POST request to local server...');
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${task._id}/progress`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
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
    console.error('Test error:', err);
    mongoose.disconnect();
  }
};

runTest();
