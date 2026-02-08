const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createMissingUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
    const db = mongoose.connection;
    
    // Create a user with the exact ID that documents reference
    const userId = new mongoose.Types.ObjectId('6980c779a892f2713b7cfcbc');
    
    // Hash a password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const newUser = {
      _id: userId,
      name: 'Test Farmer',
      email: 'farmer@test.com',
      password: hashedPassword,
      role: 'FARMER',
      isEmailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Insert the user
    const result = await db.collection('users').insertOne(newUser);
    console.log('User created successfully:', result.insertedId);
    
    // Verify it was created
    const created = await db.collection('users').findOne({ _id: userId });
    console.log('Verification - User exists:', created ? 'YES' : 'NO');
    
    if (created) {
      console.log('User details:', { _id: created._id, name: created.name, email: created.email, role: created.role });
    }
    
    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createMissingUser();
