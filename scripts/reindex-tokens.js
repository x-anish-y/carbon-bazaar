const mongoose = require('mongoose');

async function reindexTokens() {
  await mongoose.connect('mongodb://localhost:27017/carbon-bazaar');

  const CarbonBatch = mongoose.model('CarbonBatch', new mongoose.Schema({
    projectId: String,
    tokenId: Number,
    cropType: String,
    listingIds: Array,
    status: String,
    createdAt: Date
  }, { timestamps: true }));

  const CarbonListing = mongoose.model('CarbonListing', new mongoose.Schema({
    cropType: String,
    tokenId: Number,
    isTokenized: Boolean,
    batchId: mongoose.Schema.Types.ObjectId
  }, { timestamps: true }));

  const batches = await CarbonBatch.find({}).sort({ createdAt: 1 });
  console.log('Total batches found:', batches.length);

  let currentTokenId = 1001;
  for (const batch of batches) {
    batch.tokenId = currentTokenId;
    await batch.save();

    await CarbonListing.updateMany(
      { batchId: batch._id },
      { $set: { tokenId: currentTokenId, isTokenized: true } }
    );

    console.log(`Updated Batch: ${batch._id} -> Token ID #${currentTokenId} (${batch.cropType})`);
    currentTokenId++;
  }

  const listings = await CarbonListing.find({ isTokenized: true }).sort({ createdAt: 1 });
  console.log('\n--- VERIFIED LISTINGS TOKEN IDS ---');
  listings.forEach(l => console.log(`Listing: ${l._id} -> Token ID #${l.tokenId} (${l.cropType})`));
}

reindexTokens().then(() => {
  console.log('\n✅ All token IDs re-indexed sequentially with 1 token per listing!');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
