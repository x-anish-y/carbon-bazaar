const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
    const db = mongoose.connection;
    
    // Check all users
    const users = await db.collection('users').find({}).toArray();
    console.log('All users in database:');
    users.forEach(u => {
      console.log(`- _id: ${u._id}, name: ${u.name}, role: ${u.role}`);
    });
    
    // Check documents
    const docs = await db.collection('documents').find({ verificationStatus: 'PENDING' }).toArray();
    console.log('\nPending documents:');
    docs.forEach(d => {
      console.log(`- _id: ${d._id}, userId: ${d.userId}, documentType: ${d.documentType}`);
    });
    
    // Check if the userId from documents matches any user
    console.log('\nChecking if document userId exists in users:');
    docs.forEach(d => {
      const userExists = users.some(u => u._id.toString() === d.userId.toString());
      console.log(`- Doc ${d._id}: userId ${d.userId} exists? ${userExists}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkUsers();
