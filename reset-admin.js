const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/carbon-bazaar', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to MongoDB');

  // Define User schema
  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    role: String,
    name: String
  }, { collection: 'users' });

  const User = mongoose.model('User', userSchema);

  // Find admin user
  const adminUser = await User.findOne({ role: 'admin' });
  
  if (!adminUser) {
    console.log('No admin user found');
    process.exit(0);
  }

  console.log('Found admin user:', adminUser.email);
  console.log('Current password type:', adminUser.password.startsWith('$2') ? 'HASHED' : 'PLAIN TEXT');

  // Set new plain text password
  const newPassword = 'admin123';
  adminUser.password = newPassword;
  await adminUser.save();

  console.log('✅ Admin password reset to:', newPassword);
  console.log('   Email:', adminUser.email);
  console.log('   You can now login with this password');

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
