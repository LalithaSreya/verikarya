const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/verikarya';

const dropIndex = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected to drop index...');

    const collections = await mongoose.connection.db.listCollections({ name: 'attendances' }).toArray();
    if (collections.length > 0) {
      // Drop the old unique index
      try {
        await mongoose.connection.db.collection('attendances').dropIndex('user_1_date_1');
        console.log('Successfully dropped unique index: user_1_date_1');
      } catch (err) {
        console.log('Index user_1_date_1 was already removed or does not exist:', err.message);
      }
    } else {
      console.log('Attendances collection does not exist yet.');
    }

    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to drop index:', error);
    process.exit(1);
  }
};

dropIndex();
