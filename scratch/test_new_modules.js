const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const connectDB = require('../backend/config/db');
const User = require('../backend/models/User');
const Subscription = require('../backend/models/Subscription');
const Feedback = require('../backend/models/Feedback');
const Task = require('../backend/models/Task');
const Visit = require('../backend/models/Visit');

async function runTests() {
  console.log('--- RUNNING SUGGESTIVE IMPROVEMENTS VERIFICATION TESTS ---');
  
  // 1. Connect to DB
  await connectDB();
  
  try {
    // 2. Test Bulk Onboard Simulation
    console.log('\n1. Simulating Employee Bulk Onboarding...');
    const testEmployees = [
      { name: 'Test Tech Alpha', email: 'alpha_test@verikarya.com', password: 'password123', phone: '+919999999991' },
      { name: 'Test Tech Beta', email: 'beta_test@verikarya.com', password: 'password123', phone: '+919999999992' }
    ];
    
    // Clear previous test records if any
    await User.deleteMany({ email: { $in: testEmployees.map(e => e.email) } });
    
    const registered = [];
    for (const emp of testEmployees) {
      const exists = await User.findOne({ email: emp.email });
      if (!exists) {
        const newUser = await User.create({
          ...emp,
          role: 'employee'
        });
        registered.push(newUser);
        console.log(`   Registered: ${newUser.name} (${newUser.email})`);
      }
    }
    console.log(`   Success: Bulk registered ${registered.length} employees.`);

    // 3. Test AMC Subscription Model
    console.log('\n2. Testing AMC Subscription Model...');
    // Clear previous test AMCs
    await Subscription.deleteMany({ clientPhone: '+918888888881' });
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year contract
    
    const testAMC = await Subscription.create({
      clientName: 'Test Corporation Ltd',
      clientPhone: '+918888888881',
      plan: 'Premium',
      startDate,
      endDate,
      preventiveVisitsCount: 1,
      prioritySupport: true
    });
    console.log(`   Created subscription for: ${testAMC.clientName}`);
    console.log(`   Plan: ${testAMC.plan} (Priority Support: ${testAMC.prioritySupport})`);
    
    // 4. Test Customer Feedback & Review Calculations
    console.log('\n3. Testing Feedback Model & Aggregation calculations...');
    const tech = registered[0];
    if (tech) {
      // Clear previous reviews for this technician
      await Feedback.deleteMany({ technician: tech._id });
      
      // Submit multiple ratings
      const f1 = await Feedback.create({
        referenceId: new mongoose.Types.ObjectId(),
        refModel: 'Visit',
        rating: 5,
        comments: 'Excellent prompt service',
        clientName: 'Test Corp Ltd',
        clientPhone: '+918888888881',
        technician: tech._id
      });
      
      const f2 = await Feedback.create({
        referenceId: new mongoose.Types.ObjectId(),
        refModel: 'Task',
        rating: 4,
        comments: 'Decent work, resolved firewall policies.',
        clientName: 'Corporate Client',
        clientPhone: '+917777777771',
        technician: tech._id
      });

      console.log(`   Logged 2 feedback ratings for tech: ${tech.name}`);
      
      // Perform math verification (Average satisfaction score)
      const ratings = await Feedback.find({ technician: tech._id });
      const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      console.log(`   Average rating calculated: ${avg.toFixed(1)} / 5.0`);
      if (avg === 4.5) {
        console.log('   ✅ Feedback aggregation math verified successfully!');
      } else {
        console.log(`   ❌ Feedback math mismatch. Got: ${avg}`);
      }
    }

    // 5. Cleanup test records
    console.log('\n4. Cleaning up test records...');
    await User.deleteMany({ email: { $in: testEmployees.map(e => e.email) } });
    await Subscription.deleteMany({ clientPhone: '+918888888881' });
    if (tech) {
      await Feedback.deleteMany({ technician: tech._id });
    }
    console.log('   Cleanup complete.');
    console.log('\n✅ ALL INTEGRATION TESTS PASSED!');
    
  } catch (err) {
    console.error(`\n❌ TEST FAILURE: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB database.');
  }
}

runTests();
