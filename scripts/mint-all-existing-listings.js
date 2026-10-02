import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/db/mongodb.js';
import CarbonListing from '../src/models/CarbonListing.js';
import CarbonBatch from '../src/models/CarbonBatch.js';
import User from '../src/models/User.js';
import { ensureWallet } from '../src/lib/blockchain/wallet.js';
import { mintCreditBatch } from '../src/lib/blockchain/carbonService.js';

async function mintAllExistingListings() {
  await connectDB();
  console.log('Connected to MongoDB');

  const listings = await CarbonListing.find({
    $or: [{ isTokenized: false }, { tokenId: null }, { isTokenized: { $exists: false } }]
  });

  console.log(`Found ${listings.length} listings to tokenize and mint.`);

  let lastBatch = await CarbonBatch.findOne({ tokenId: { $exists: true, $ne: null } })
    .sort({ tokenId: -1 })
    .lean();
  let currentTokenId = (lastBatch && typeof lastBatch.tokenId === 'number' && lastBatch.tokenId >= 1000)
    ? lastBatch.tokenId + 1
    : 1001;

  for (const listing of listings) {
    try {
      const sellerId = listing.sellerId || listing.farmerId;
      const sellerWithWallet = await User.findById(sellerId).select('+wallet.encryptedPrivateKey');
      
      let issuerAddress = '0x71bE63f330a2f9120E772dE8A83416FfeE005470';
      if (sellerWithWallet) {
        const walletResult = await ensureWallet(sellerWithWallet);
        issuerAddress = walletResult.address;
      }

      const finalCreditType = listing.creditType || 'BASELINE';
      const numCredits = listing.creditsAmount || 100;

      const verificationData = JSON.stringify({
        listingId: listing._id.toString(),
        sellerId: sellerId?.toString(),
        creditType: finalCreditType,
        creditsAmount: numCredits,
        verifiedAt: new Date().toISOString(),
      });
      const verificationHash = crypto.createHash('sha256').update(verificationData).digest('hex');

      const projectData = JSON.stringify({
        sellerId: sellerId?.toString(),
        creditType: finalCreditType,
        cropType: listing.cropType || undefined,
        state: listing.state || 'MH',
        month: listing.month,
        methodology: listing.methodology || 'OTHER',
        creditsAmount: numCredits,
        areaInHectares: listing.areaInHectares || undefined,
      });
      const projectHash = `sha256:${crypto.createHash('sha256').update(projectData).digest('hex')}`;

      const projectId = `CB-${new Date().getFullYear()}-${listing.state || 'MH'}-${listing._id.toString().slice(-6).toUpperCase()}`;
      const metadataURI = `https://api.carbonbazaar.in/metadata/${projectId}`;

      const mintResult = await mintCreditBatch({
        issuerAddress,
        amount: numCredits,
        projectHash,
        metadataURI,
        suggestedTokenId: currentTokenId,
      });

      const batch = await CarbonBatch.create({
        projectId,
        issuerId: sellerId,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        mintTxHash: mintResult.txHash,
        mintBlockNumber: mintResult.blockNumber,
        totalCredits: numCredits,
        availableCredits: numCredits,
        creditType: finalCreditType,
        cropType: listing.cropType || undefined,
        methodology: listing.methodology || 'OTHER',
        verificationHash,
        projectHash,
        geography: {
          state: listing.state || 'MH',
        },
        vintage: listing.month,
        status: 'MINTED',
        listingIds: [listing._id],
        metadataURI,
      });

      listing.batchId = batch._id;
      listing.tokenId = mintResult.tokenId;
      listing.contractAddress = mintResult.contractAddress;
      listing.isTokenized = true;
      await listing.save();

      console.log(`✅ Minted listing ${listing._id} -> Token #${mintResult.tokenId}`);
      currentTokenId = mintResult.tokenId + 1;
    } catch (err) {
      console.error(`Failed to mint listing ${listing._id}:`, err.message);
    }
  }

  console.log('🎉 Finished tokenizing all existing listings!');
  process.exit(0);
}

mintAllExistingListings().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
