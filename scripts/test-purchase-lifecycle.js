import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/db/mongodb.js';
import User from '../src/models/User.js';
import CarbonListing from '../src/models/CarbonListing.js';
import jwt from 'jsonwebtoken';

async function testFullListingAndPurchase() {
  await connectDB();
  const seller = await User.findOne({ email: 'lala@5481.com' });
  let buyer = await User.findOne({ role: 'BUYER' });
  if (!buyer) {
    buyer = await User.create({
      name: 'EcoCorp Buyer Test',
      email: 'buyer.test.auto@ecocorp.com',
      password: 'password123',
      role: 'BUYER',
      verified: true,
      isEmailVerified: true,
      state: 'MH',
    });
  }

  const sellerToken = jwt.sign(
    { userId: seller._id.toString(), email: seller.email, role: seller.role, isEmailVerified: true, verified: true },
    'carbon-bazaar-secret-key-2026-india-carbon-marketplace',
    { expiresIn: '7d' }
  );

  const buyerToken = jwt.sign(
    { userId: buyer._id.toString(), email: buyer.email, role: buyer.role, isEmailVerified: true, verified: true },
    'carbon-bazaar-secret-key-2026-india-carbon-marketplace',
    { expiresIn: '7d' }
  );

  // 1. Check seller balance before purchase (should be 0 since all credits are in marketplace)
  const sellerBalRes1 = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${sellerToken}` }
  });
  const sellerBal1 = await sellerBalRes1.json();
  console.log('1️⃣ Seller Active Credits Owned before purchase:', sellerBal1.data.totalCreditsOwned);

  // 2. Buyer purchases 25 credits from an active listing
  const activeListing = await CarbonListing.findOne({ sellerId: seller._id, status: 'ACTIVE', availableCredits: { $gte: 25 } });
  console.log('2️⃣ Buyer purchasing 25 credits from listing:', activeListing._id, 'Token #' + activeListing.tokenId);

  const payVerifyRes = await fetch('http://localhost:3000/api/payments/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerToken}`
    },
    body: JSON.stringify({
      razorpayOrderId: 'order_test_' + Date.now(),
      razorpayPaymentId: 'pay_test_' + Date.now(),
      razorpaySignature: 'demo_sig',
      listingId: activeListing._id.toString(),
      creditsRequested: 25,
      negotiatedPricePerCredit: activeListing.pricePerCredit,
    })
  });
  const payData = await payVerifyRes.json();
  console.log('   Purchase status:', payVerifyRes.status, 'Success:', payData.success);

  // 3. Check Buyer portfolio balance
  const buyerBalRes = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${buyerToken}` }
  });
  const buyerBal = await buyerBalRes.json();
  console.log('3️⃣ Buyer Active Credits Owned after purchase:', buyerBal.data.totalCreditsOwned, 'tCO2e in portfolio!');

  // 4. Check Seller balance after purchase (still 0 in hand because remaining credits are still on the marketplace)
  const sellerBalRes2 = await fetch('http://localhost:3000/api/blockchain/balance', {
    headers: { Authorization: `Bearer ${sellerToken}` }
  });
  const sellerBal2 = await sellerBalRes2.json();
  console.log('4️⃣ Seller Active Credits Owned after purchase:', sellerBal2.data.totalCreditsOwned, 'tCO2e (All remaining are in market)');

  process.exit(0);
}

testFullListingAndPurchase().catch(e => { console.error(e); process.exit(1); });
