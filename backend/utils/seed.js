const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Task = require('../models/Task');
const Visit = require('../models/Visit');
const Attendance = require('../models/Attendance');
const Evidence = require('../models/Evidence');
const VerificationCode = require('../models/VerificationCode');
const Review = require('../models/Review');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected for Seeding...');

    // Clear existing collections
    await User.deleteMany();
    await Task.deleteMany();
    await Visit.deleteMany();
    
    // Drop attendances collection to ensure any old unique index is cleanly removed
    try {
      await mongoose.connection.db.dropCollection('attendances');
      console.log('Dropped attendances collection to clear index constraints.');
    } catch (err) {
      // Collection might not exist yet, ignore
    }

    await Evidence.deleteMany();
    await VerificationCode.deleteMany();
    await Review.deleteMany();

    console.log('Database cleared.');


    // Create Manager
    const manager = await User.create({
      name: 'Jane Manager',
      email: 'manager@verikarya.com',
      password: 'password123',
      role: 'manager'
    });

    // Create Employee
    const employee = await User.create({
      name: 'John Employee',
      email: 'employee@verikarya.com',
      password: 'password123',
      role: 'employee'
    });

    console.log('Test accounts created:');
    console.log('  Manager:  manager@verikarya.com  / password123');
    console.log('  Employee: employee@verikarya.com / password123');

    // Create a Sample Task
    const deadlineTask = new Date();
    deadlineTask.setDate(deadlineTask.getDate() + 3);

    const sampleTask = await Task.create({
      title: 'Verify Server Racks Installation',
      description: 'Check the rack mounting in Server Room B, verify backup power cabling, and record device serial numbers.',
      priority: 'high',
      assignedTo: employee._id,
      assignedBy: manager._id,
      deadline: deadlineTask
    });

    // Create a Sample Field Visit
    const deadlineVisit = new Date();
    deadlineVisit.setDate(deadlineVisit.getDate() + 2);

    const sampleVisit = await Visit.create({
      clientName: 'Apex Technology Solutions',
      purpose: 'Conduct on-site hardware audit and obtain client sign-off on the deployment phase.',
      assignedTo: employee._id,
      assignedBy: manager._id,
      // Default coordinate: Bangalore Central (12.9716, 77.5946)
      // Can be edited or set in UI
      targetLocation: {
        lat: 12.9715987,
        lng: 77.5945627
      },
      deadline: deadlineVisit
    });

    console.log('Sample tasks and field visits seeded successfully.');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
