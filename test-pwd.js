const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function testPassword() {
  try {
    const user = await User.findOne({ email: 'edfghbnjm@rxdtcfvgbhn.com' }).select('+password');
    
    console.log('User:', user.name);
    console.log('Email:', user.email);
    console.log('Current password hash:', user.password);
    
    // Test the password "test123"
    const testPwd = 'test123';
    const match = await bcrypt.compare(testPwd, user.password);
    console.log(`\nPassword "${testPwd}" matches: ${match ? '✓ YES' : '✗ NO'}`);
    
    if (!match) {
      console.log('\nThe password in database does NOT match "test123"');
      console.log('Let me check the hash more carefully...');
      console.log('Hash starts with: ', user.password.substring(0, 20));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testPassword();
