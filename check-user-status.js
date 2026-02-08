const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define User schema
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

// Define Document schema
const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

async function checkUser() {
  try {
    // Find Anish Sasmal
    const user = await User.findOne({ name: 'Anish Sasmal' });
    console.log('User found:', user);
    console.log('Verified status:', user?.verified);
    
    // Find documents for this user
    const docs = await Document.find({ userId: user?._id });
    console.log('\nDocuments for user:', docs.length);
    docs.forEach((doc, i) => {
      console.log(`  Doc ${i+1}: ${doc.documentType} - ${doc.verificationStatus}`);
    });
    
    // Check if all docs are approved
    const allApproved = docs.length > 0 && docs.every(d => d.verificationStatus === 'APPROVED');
    console.log('\nAll documents approved:', allApproved);
    console.log('User should be verified:', allApproved);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUser();
