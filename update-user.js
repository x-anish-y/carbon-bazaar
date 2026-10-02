const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function updateUser() {
  try {
    // Find and update Anish Sasmal
    const result = await User.findOneAndUpdate(
      { name: 'Anish Sasmal' },
      { verified: true },
      { new: true }
    );
    
    console.log('User updated:', result);
    console.log('Verified status:', result?.verified);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updateUser();
