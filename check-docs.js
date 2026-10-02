const mongoose = require('mongoose');

async function checkDocs() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
    const db = mongoose.connection;
    
    const documentCount = await db.collection('documents').countDocuments({ verificationStatus: 'PENDING' });
    console.log('PENDING documents in MongoDB:', documentCount);
    
    const docs = await db.collection('documents').find({ verificationStatus: 'PENDING' }).toArray();
    console.log('Documents:', JSON.stringify(docs.map(d => ({
      _id: d._id,
      userId: d.userId,
      documentType: d.documentType,
      verificationStatus: d.verificationStatus
    })), null, 2));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkDocs();
