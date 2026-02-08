const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function checkAllUsers() {
  try {
    const users = await User.find().select('name email role verified -_id');
    console.log('\nAll Users and Verification Status:');
    users.forEach(u => {
      console.log(`  ${u.name} (${u.email}) - ${u.role} - Verified: ${u.verified === true ? '✓ YES' : '✗ NO'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAllUsers();
