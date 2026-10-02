const mongoose = require('mongoose');

async function syncListings() {
  await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');
  const CarbonListing = mongoose.model('CarbonListing', new mongoose.Schema({
    cropType: String,
    creditsAmount: Number,
    availableCredits: Number,
    totalSold: Number,
    status: String,
    sellerId: mongoose.Schema.Types.ObjectId,
    sellerType: String
  }, { timestamps: true }));

  // Auto-correct any zero or negative available credits to SOLD_OUT
  const updated = await CarbonListing.updateMany(
    { availableCredits: { $lte: 0 }, status: 'ACTIVE' },
    { $set: { status: 'SOLD_OUT', availableCredits: 0 } }
  );
  console.log('Updated listings to SOLD_OUT:', updated.modifiedCount);

  // List summary
  const total = await CarbonListing.countDocuments({});
  const active = await CarbonListing.countDocuments({ status: 'ACTIVE' });
  const soldOut = await CarbonListing.countDocuments({ status: 'SOLD_OUT' });
  console.log(`Total: ${total} | Active: ${active} | Sold Out: ${soldOut}`);
}

syncListings().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
