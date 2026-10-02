const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function checkPassword() {
  try {
    const user = await User.findOne({ email: 'edfghbnjm@rxdtcfvgbhn.com' }).select('+password');
    
    if (!user) {
      console.log('User not found');
      process.exit(0);
    }
    
    console.log('User found:', user.name);
    console.log('Email:', user.email);
    console.log('Password hash:', user.password);
    
    // Test with the password we see in the screenshot (appears to be dots, so we don't know the actual password)
    // Let's try common test passwords
    const testPasswords = ['password', 'test123', 'password123', '123456', 'admin123'];
    
    console.log('\nTesting common passwords:');
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      console.log(`  "${pwd}": ${match ? '✓ MATCH' : '✗ no match'}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkPassword();
