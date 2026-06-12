const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Task = require('./models/Task');
const Evidence = require('./models/Evidence');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';
const JWT_SECRET = process.env.JWT_SECRET || 'verikarya_jwt_secret_key_123456';

const runTest = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Find manager and employee
    const manager = await User.findOne({ role: 'manager' });
    const employee = await User.findOne({ role: 'employee' });
    if (!manager || !employee) {
      console.log('Test users not found.');
      mongoose.disconnect();
      return;
    }
    console.log(`Manager: ${manager.name}, Employee: ${employee.name}`);

    // Update manager's phone to verify manager notification
    manager.phone = '+919999999999';
    await manager.save();

    // Create a new task with requireCode: false and clientPhone
    const task = await Task.create({
      title: 'Configure Corporate Router Security Rules (No Code)',
      description: 'Update the firewall access control lists on the core corporate router. Verification code is bypassed for this desk task.',
      assignedTo: employee._id,
      assignedBy: manager._id,
      priority: 'medium',
      deadline: new Date(Date.now() + 86400000 * 3), // 3 days from now
      clientPhone: '+12345678901',
      requireCode: false
    });
    console.log(`Task created with requireCode: false (ID: ${task._id}, clientPhone: ${task.clientPhone})`);

    // Start the task (status -> in_progress)
    task.status = 'in_progress';
    await task.save();
    console.log('Task status updated to in_progress.');

    // Generate token for the employee
    const token = jwt.sign({ id: employee._id }, JWT_SECRET, { expiresIn: '1h' });

    // Submit evidence without verificationCode
    const payload = JSON.stringify({
      photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8DwABAAD//wHsAP0C2vouAAAAAElFTkSuQmCC',
      notes: 'Successfully completed the ACL configurations without code requirement.'
    });

    console.log('Making POST request to complete task without code...');
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${task._id}/submit`,
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
      res.on('end', async () => {
        console.log('Response Body:', data);
        
        // Double check status in DB
        const updatedTask = await Task.findById(task._id).populate('evidence');
        console.log(`Verified Task status in DB: ${updatedTask.status}`);
        console.log(`Verification code saved in task: ${updatedTask.verificationCode || 'None'}`);
        console.log(`Evidence notes: ${updatedTask.evidence?.notes || 'None'}`);
        
        // Cleanup test task
        await Task.findByIdAndDelete(task._id);
        if (updatedTask.evidence) {
          await mongoose.model('Evidence').findByIdAndDelete(updatedTask.evidence._id);
        }
        console.log('Cleanup completed.');
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
