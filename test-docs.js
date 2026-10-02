const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
    const db = mongoose.connection.db;
    const docs = await db.collection('documents').find({verificationStatus: 'PENDING'}).toArray();
    console.log('PENDING documents count:', docs.length);
    if (docs.length > 0) {
      console.log('First document:');
      console.log(JSON.stringify(docs[0], null, 2));
    }
    mongoose.disconnect();
  } catch(e) {
    console.error('Error:', e.message);
  }
}

test();
