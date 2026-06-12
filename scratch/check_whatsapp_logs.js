const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';
console.log('Connecting to:', MONGO_URI);

const checkLogs = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');
    
    const logs = await mongoose.connection.db.collection('whatsapp_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
      
    console.log('Recent logs:');
    console.log(JSON.stringify(logs, null, 2));
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

checkLogs();
