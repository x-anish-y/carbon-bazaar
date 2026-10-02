import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/db/mongodb.js';

async function testNewSellerRegistrationFlow() {
  await connectDB();
  const testEmail = `seller.test.${Date.now()}@carbonbazaar.in`;
  console.log('1️⃣ Registering brand new seller:', testEmail);

  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Patel',
      email: testEmail,
      phone: '9876543210',
      password: 'password123',
      role: 'SELLER',
      state: 'MH',
    })
  });

  const regData = await regRes.json();
  console.log('   Registration status:', regRes.status, 'Success:', regData.success);
  const token = regData.data.token;

  // 2. Check portfolio right after registration -> should have 1,000 tCO2e
  const balRes1 = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const balData1 = await balRes1.json();
  console.log('2️⃣ Initial Portfolio Active Credits Owned upon registration:', balData1.data.totalCreditsOwned, 'tCO2e');
  console.log('   Initial batch details:', balData1.data.balances[0]);

  // 3. Check Seller Dashboard stats -> should have 1,000 tCO2e in wallet, 0 listed
  const statsRes1 = await fetch('http://localhost:3000/api/seller/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const statsData1 = await statsRes1.json();
  console.log('3️⃣ Initial Seller Dashboard stats:');
  console.log('   In-Wallet Owned Balance:', statsData1.data.availableCreditsOwned, 'tCO2e');
  console.log('   Total Credits Listed on Market:', statsData1.data.totalCreditsListed, 'tCO2e');

  // 4. Seller lists 350 tCO2e on Marketplace
  console.log('4️⃣ Seller listing 350 tCO2e on Marketplace...');
  const listRes = await fetch('http://localhost:3000/api/listings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      month: '2026-08',
      creditType: 'PREMIUM',
      creditsAmount: 350,
      pricePerCredit: 1150,
      description: 'First listing of 350 verified premium carbon credits on national exchange.',
    })
  });
  const listData = await listRes.json();
  console.log('   Listing created:', listRes.status, 'Token #' + listData.data.tokenId);

  // 5. Check portfolio balance after listing -> should be 650 tCO2e
  const balRes2 = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const balData2 = await balRes2.json();
  console.log('5️⃣ Portfolio balance after listing 350 credits:', balData2.data.totalCreditsOwned, 'tCO2e');

  // 6. Check dashboard stats after listing -> should show 650 in wallet, 350 listed
  const statsRes2 = await fetch('http://localhost:3000/api/seller/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const statsData2 = await statsRes2.json();
  console.log('6️⃣ Updated Seller Dashboard stats:');
  console.log('   In-Wallet Owned Balance:', statsData2.data.availableCreditsOwned, 'tCO2e');
  console.log('   Total Credits Listed on Market:', statsData2.data.totalCreditsListed, 'tCO2e');

  process.exit(0);
}

testNewSellerRegistrationFlow().catch(e => { console.error(e); process.exit(1); });
