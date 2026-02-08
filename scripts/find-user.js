
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon-bazaar';

async function findUser() {
  console.log('🔍 Finding user...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Successfully connected to MongoDB');

    const user = await User.findOne({ email: 'admin@carbenbazaar.in' });

    if (user) {
      console.log('✓ User found:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('✗ User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error finding user:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

findUser();
