const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
console.log('Connecting to:', MONGO_URI);

const User = require('./models/User');

const test = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');
    const users = await User.find({});
    console.log('Users found:', users.map(u => ({ name: u.name, email: u.email, role: u.role })));
    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
};

test();
