const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
    const db = mongoose.connection;
    
    // Query documents with populate
    const Document = require('./src/models/Document');
    const docs = await Document.find({ verificationStatus: 'PENDING' })
      .populate('userId', 'name email role')
      .select('-fileData')
      .limit(2);
    
    console.log('Documents with populate:');
    docs.forEach((doc, i) => {
      console.log(`\nDocument ${i + 1}:`);
      console.log('- _id:', doc._id);
      console.log('- userId:', doc.userId);
      console.log('- userId._id:', doc.userId?._id);
      console.log('- userId.name:', doc.userId?.name);
      console.log('- userId.role:', doc.userId?.role);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
