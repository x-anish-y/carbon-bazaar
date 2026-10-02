const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function setPassword() {
  try {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Setting password to:', password);
    console.log('Hash:', hashedPassword);
    
    const result = await User.findOneAndUpdate(
      { email: 'edfghbnjm@rxdtcfvgbhn.com' },
      { password: hashedPassword },
      { new: true }
    );
    
    console.log('\nUser updated:', result.name);
    console.log('Email:', result.email);
    
    // Verify it works
    const match = await bcrypt.compare(password, result.password);
    console.log('Password verification:', match ? '✓ Works!' : '✗ Failed');
    
    console.log('\nYou can now login with:');
    console.log('Email:', result.email);
    console.log('Password:', password);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setPassword();
