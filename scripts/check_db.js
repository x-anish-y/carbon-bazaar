const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
  
  const users = await mongoose.connection.db.collection('users').find({}, { projection: { email: 1, role: 1, name: 1 } }).toArray();
  console.log('=== ALL USERS ===');
  users.forEach(u => console.log(u._id.toString(), u.role, u.email));

  const retirements = await mongoose.connection.db.collection('retirementrecords').find({}).toArray();
  console.log('\n=== RETIREMENT RECORDS ===');
  console.log('Count:', retirements.length);
  retirements.forEach(r => console.log('  retiredBy:', r.retiredBy?.toString(), 'amount:', r.amount, 'status:', r.status, 'beneficiary:', r.beneficiaryName));

  const acceptedStatuses = ['ACCEPTED', 'SETTLED', 'COMPLETED'];
  const trades = await mongoose.connection.db.collection('tradeoffers').find({ status: { $in: acceptedStatuses } }).toArray();
  console.log('\n=== COMPLETED TRADES ===');
  console.log('Count:', trades.length);
  trades.forEach(t => console.log('  buyerId:', t.buyerId?.toString(), 'credits:', t.creditsRequested, 'status:', t.status));

  await mongoose.disconnect();
}
check().catch(e => console.error(e));
