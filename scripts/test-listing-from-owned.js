import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/db/mongodb.js';
import User from '../src/models/User.js';
import jwt from 'jsonwebtoken';

async function testFullListingFromOwned() {
  await connectDB();
  const seller = await User.findOne({ email: 'lala@5481.com' });
  const token = jwt.sign(
    { userId: seller._id.toString(), email: seller.email, role: seller.role, isEmailVerified: true, verified: true },
    'carbon-bazaar-secret-key-2026-india-carbon-marketplace',
    { expiresIn: '7d' }
  );

  // 1. Check starting portfolio balance
  const balRes1 = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const balData1 = await balRes1.json();
  console.log('1️⃣ Starting Portfolio In-Wallet Balance:', balData1.data.totalCreditsOwned, 'tCO2e');

  // 2. Try listing 1,500 credits (more than owned) -> should fail
  console.log('2️⃣ Attempting to list 1,500 tCO2e (more than owned balance)...');
  const failRes = await fetch('http://localhost:3000/api/listings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      month: '2026-08',
      creditType: 'PREMIUM',
      creditsAmount: 1500,
      pricePerCredit: 1200,
      description: 'Attempting to list more than owned balance test',
    })
  });
  const failData = await failRes.json();
  console.log('   Rejected with status:', failRes.status, 'Message:', failData.message);

  // 3. List 200 credits from owned balance
  console.log('3️⃣ Listing 200 tCO2e from owned balance on Marketplace...');
  const successRes = await fetch('http://localhost:3000/api/listings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      month: '2026-08',
      creditType: 'PREMIUM',
      creditsAmount: 200,
      pricePerCredit: 1200,
      description: 'High-permanence premium verified credits listed from wallet inventory.',
    })
  });
  const successData = await successRes.json();
  console.log('   Listing created successfully:', successRes.status, 'Token #' + successData.data.tokenId);

  // 4. Check new portfolio balance
  const balRes2 = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const balData2 = await balRes2.json();
  console.log('4️⃣ New Portfolio In-Wallet Balance after listing:', balData2.data.totalCreditsOwned, 'tCO2e');

  // 5. Check seller dashboard stats
  const statsRes = await fetch('http://localhost:3000/api/seller/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const statsData = await statsRes.json();
  console.log('5️⃣ Seller Dashboard stats:');
  console.log('   In-Wallet Owned Balance:', statsData.data.availableCreditsOwned, 'tCO2e');
  console.log('   Total Credits Listed on Market:', statsData.data.totalCreditsListed, 'tCO2e');

  process.exit(0);
}

testFullListingFromOwned().catch(e => { console.error(e); process.exit(1); });
