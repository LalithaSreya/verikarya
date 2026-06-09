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

    // Create Sample Tasks (Remote Security Configs)
    const deadlineTask1 = new Date();
    deadlineTask1.setDate(deadlineTask1.getDate() + 3);
    await Task.create({
      title: 'Configure Corporate Firewall Security Policies',
      description: 'Apply security configuration updates to the corporate firewall, review blocked outbound traffic ports, and submit configuration snapshot.',
      priority: 'high',
      assignedTo: employee._id,
      assignedBy: manager._id,
      deadline: deadlineTask1
    });

    const deadlineTask2 = new Date();
    deadlineTask2.setDate(deadlineTask2.getDate() + 5);
    await Task.create({
      title: 'Audit AWS Cloud Security Configuration Groups',
      description: 'Perform compliance checks on cloud security groups, verify database ports are not publicly exposed, and upload audit log summary.',
      priority: 'medium',
      assignedTo: employee._id,
      assignedBy: manager._id,
      deadline: deadlineTask2
    });

    // Create Sample Field Visits (On-Site Security Audits & Solutions Deployments)
    const deadlineVisit1 = new Date();
    deadlineVisit1.setDate(deadlineVisit1.getDate() + 2);
    await Visit.create({
      clientName: 'Apex Financial Services',
      purpose: 'Conduct physical server room security control audit, verify biometric lock status, and log camera coverage coordinates.',
      assignedTo: employee._id,
      assignedBy: manager._id,
      targetLocation: {
        lat: 12.9715987,
        lng: 77.5945627
      },
      deadline: deadlineVisit1
    });

    const deadlineVisit2 = new Date();
    deadlineVisit2.setDate(deadlineVisit2.getDate() + 4);
    await Visit.create({
      clientName: 'Titan Solutions Group',
      purpose: 'On-site firewall router hardware installation, configure VLAN security isolation zones, and verify gateway routing connectivity.',
      assignedTo: employee._id,
      assignedBy: manager._id,
      targetLocation: {
        lat: 12.9141,
        lng: 77.6339
      },
      deadline: deadlineVisit2
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
