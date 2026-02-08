const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function resetPassword() {
  try {
    // Hash a simple password
    const newPassword = 'test123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('New password:', newPassword);
    console.log('Hashed:', hashedPassword);
    
    // Update user password
    const result = await User.findOneAndUpdate(
      { email: 'edfghbnjm@rxdtcfvgbhn.com' },
      { password: hashedPassword },
      { new: true }
    );
    
    console.log('\nUser updated:', result.name);
    console.log('Email:', result.email);
    
    // Verify the password works
    const match = await bcrypt.compare(newPassword, result.password);
    console.log('Password verification:', match ? '✓ Works' : '✗ Failed');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

resetPassword();
