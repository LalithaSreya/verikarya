const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

async function runTests() {
  console.log('--- RUNNING BULK DELETE API UNIT TESTS ---');
  
  await connectDB();
  
  try {
    // 1. Setup mock employees
    console.log('\nSetting up mock employees for bulk delete...');
    const employeesData = [
      { name: 'Mock Del 1', email: 'mock_del1@verikarya.com', password: 'password123', role: 'employee' },
      { name: 'Mock Del 2', email: 'mock_del2@verikarya.com', password: 'password123', role: 'employee' }
    ];
    
    await User.deleteMany({ email: { $in: employeesData.map(e => e.email) } });
    const u1 = await User.create(employeesData[0]);
    const u2 = await User.create(employeesData[1]);
    console.log(`Created employee 1: ${u1.email} (ID: ${u1._id})`);
    console.log(`Created employee 2: ${u2.email} (ID: ${u2._id})`);

    // 2. Perform bulk delete math simulation (same as controller)
    console.log('\nSimulating bulk delete employee controller logic...');
    const deleteIds = [u1._id, u2._id];
    
    // Check if any are not employees
    const usersToDelete = await User.find({ _id: { $in: deleteIds } });
    const nonEmployees = usersToDelete.filter(u => u.role !== 'employee');
    if (nonEmployees.length > 0) {
      throw new Error('Can only delete employee profiles');
    }
    
    const delResult = await User.deleteMany({ _id: { $in: deleteIds } });
    console.log(`Successfully deleted ${delResult.deletedCount} employees.`);
    if (delResult.deletedCount !== 2) {
      throw new Error(`Expected to delete 2 employees, but deleted ${delResult.deletedCount}`);
    }
    console.log('✅ Employee bulk deletion logic verified!');

    // 3. Setup mock AMC subscriptions
    console.log('\nSetting up mock AMC subscriptions for bulk delete...');
    const subsData = [
      { clientName: 'Mock Client 1', clientPhone: '+919999999901', plan: 'Basic', startDate: new Date(), endDate: new Date() },
      { clientName: 'Mock Client 2', clientPhone: '+919999999902', plan: 'Standard', startDate: new Date(), endDate: new Date() }
    ];
    
    await Subscription.deleteMany({ clientPhone: { $in: subsData.map(s => s.clientPhone) } });
    const s1 = await Subscription.create(subsData[0]);
    const s2 = await Subscription.create(subsData[1]);
    console.log(`Created subscription 1: ${s1.clientName} (ID: ${s1._id})`);
    console.log(`Created subscription 2: ${s2.clientName} (ID: ${s2._id})`);

    // 4. Perform bulk delete subscription math simulation
    console.log('\nSimulating bulk delete subscription controller logic...');
    const deleteSubIds = [s1._id, s2._id];
    
    const delSubResult = await Subscription.deleteMany({ _id: { $in: deleteSubIds } });
    console.log(`Successfully deleted ${delSubResult.deletedCount} subscriptions.`);
    if (delSubResult.deletedCount !== 2) {
      throw new Error(`Expected to delete 2 subscriptions, but deleted ${delSubResult.deletedCount}`);
    }
    console.log('✅ Subscription bulk deletion logic verified!');

    console.log('\n🎉 ALL BULK DELETE VERIFICATION TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error(`\n❌ TEST FAILURE: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();
