import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import crypto from 'crypto';
import connectDB from '../src/lib/db/mongodb.js';
import User from '../src/models/User.js';
import CarbonBatch from '../src/models/CarbonBatch.js';
import { ensureWallet } from '../src/lib/blockchain/wallet.js';
import { mintCreditBatch } from '../src/lib/blockchain/carbonService.js';

async function grantToExistingSellers() {
  await connectDB();
  const allUsers = await User.find({});
  console.log('All users in DB:', allUsers.map(u => ({ id: u._id, email: u.email, role: u.role })));
  const sellers = allUsers.filter(u => u.role === 'SELLER' || u.role === 'FARMER');
  console.log(`Found ${sellers.length} sellers.`);

  let lastBatch = await CarbonBatch.findOne({ tokenId: { $exists: true, $ne: null } })
    .sort({ tokenId: -1 })
    .lean();
  let currentTokenId = (lastBatch && typeof lastBatch.tokenId === 'number' && lastBatch.tokenId >= 1000)
    ? lastBatch.tokenId + 1
    : 1001;

  for (const seller of sellers) {
    // Check if seller has any unlisted batch
    const unlistedBatch = await CarbonBatch.findOne({
      issuerId: seller._id,
      listingIds: { $size: 0 }
    });

    if (!unlistedBatch) {
      const sellerWithWallet = await User.findById(seller._id).select('+wallet.encryptedPrivateKey');
      const { address: issuerAddress } = await ensureWallet(sellerWithWallet || seller);

      const initialCredits = 1000;
      const projectId = `CB-${new Date().getFullYear()}-${seller.state || 'MH'}-INIT-${seller._id.toString().slice(-4).toUpperCase()}`;
      const metadataURI = `https://api.carbonbazaar.in/metadata/${projectId}`;

      const projectData = JSON.stringify({
        sellerId: seller._id.toString(),
        creditType: 'PREMIUM',
        creditsAmount: initialCredits,
        state: seller.state || 'MH',
        vintage: new Date().toISOString().slice(0, 7),
      });
      const projectHash = `sha256:${crypto.createHash('sha256').update(projectData).digest('hex')}`;
      const verificationHash = crypto.createHash('sha256').update(projectId).digest('hex');

      const mintResult = await mintCreditBatch({
        issuerAddress,
        amount: initialCredits,
        projectHash,
        metadataURI,
        suggestedTokenId: currentTokenId,
      });

      await CarbonBatch.create({
        projectId,
        issuerId: seller._id,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        mintTxHash: mintResult.txHash,
        mintBlockNumber: mintResult.blockNumber,
        totalCredits: initialCredits,
        availableCredits: initialCredits,
        creditType: 'PREMIUM',
        methodology: 'REGENERATIVE_AGRICULTURE',
        verificationHash,
        projectHash,
        geography: {
          state: seller.state || 'MH',
        },
        vintage: new Date().toISOString().slice(0, 7),
        status: 'MINTED',
        listingIds: [],
        metadataURI,
      });

      console.log(`✅ Granted 1,000 tCO2e to seller ${seller.email} -> Token #${mintResult.tokenId}`);
      currentTokenId = mintResult.tokenId + 1;
    } else {
      console.log(`ℹ️ Seller ${seller.email} already has unlisted batch: ${unlistedBatch.projectId}`);
    }
  }

  console.log('🎉 Finished granting initial credits to existing sellers!');
  process.exit(0);
}

grantToExistingSellers().catch(e => { console.error(e); process.exit(1); });
