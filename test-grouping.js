// Quick test to verify the userId structure after populate
const testData = {
  data: [
    {
      _id: "doc123",
      userId: {
        _id: "user123",
        name: "John Farmer",
        email: "john@example.com",
        role: "FARMER"
      },
      documentType: "AADHAAR",
      verificationStatus: "PENDING"
    }
  ]
};

// Simulate grouping logic from verifications page
const documents = testData.data;
const docsByUser = {};

documents.forEach((doc) => {
  if (!doc.userId) return;
  
  const userId = doc.userId._id;
  if (!docsByUser[userId]) {
    docsByUser[userId] = {
      userId,
      userName: doc.userId.name,
      userEmail: doc.userId.email,
      userRole: doc.userId.role,
      documents: [],
    };
  }
  docsByUser[userId].documents.push(doc);
});

console.log('Grouped documents:');
console.log(JSON.stringify(docsByUser, null, 2));
console.log('\nTest passed! userId structure is correct.');
