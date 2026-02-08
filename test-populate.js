const mongoose = require('mongoose');

// Import models
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
});

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  documentType: String,
  verificationStatus: String,
});

async function testQuery() {
  try {
    await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
    
    const User = mongoose.model('User', userSchema);
    const Document = mongoose.model('Document', documentSchema);
    
    console.log('Testing Document.find with populate...');
    const docs = await Document.find({ verificationStatus: 'PENDING' })
      .populate('userId', 'name email role');
    
    console.log('Found documents:', docs.length);
    docs.forEach((doc, i) => {
      console.log(`\nDoc ${i + 1}:`);
      console.log('- _id:', doc._id);
      console.log('- userId:', doc.userId);
      console.log('- documentType:', doc.documentType);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testQuery();
