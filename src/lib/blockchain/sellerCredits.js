import crypto from 'crypto';
import CarbonBatch from '@/models/CarbonBatch';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';
import TradeOffer from '@/models/TradeOffer';
import RetirementRecord from '@/models/RetirementRecord';
import { ensureWallet } from './wallet';
import { mintCreditBatch } from './carbonService';

export const INITIAL_SELLER_CREDITS = 1000;

/**
 * Ensures a seller has their starting allocation of verified carbon credits.
 * If the seller has no initial batches, a 1,000 tCO2e verified batch is minted and assigned to their wallet.
 */
export async function ensureSellerInitialCredits(userDoc) {
  if (!userDoc || (userDoc.role !== 'SELLER' && userDoc.role !== 'FARMER')) {
    return null;
  }

  const userId = userDoc._id || userDoc.userId;

  // Check if seller already has batches
  const existingBatchCount = await CarbonBatch.countDocuments({ issuerId: userId });
  if (existingBatchCount > 0) {
    return null;
  }

  try {
    const sellerWithWallet = await User.findById(userId).select('+wallet.encryptedPrivateKey');
    const { address: issuerAddress } = await ensureWallet(sellerWithWallet || userDoc);

    // Find next unique sequential tokenId
    const lastBatch = await CarbonBatch.findOne({ tokenId: { $exists: true, $ne: null } })
      .sort({ tokenId: -1 })
      .lean();
    const nextTokenId = (lastBatch && typeof lastBatch.tokenId === 'number' && lastBatch.tokenId >= 1000)
      ? lastBatch.tokenId + 1
      : 1001;

    const projectId = `CB-${new Date().getFullYear()}-${userDoc.state || 'MH'}-INIT-${userId.toString().slice(-4).toUpperCase()}`;
    const metadataURI = `https://api.carbonbazaar.in/metadata/${projectId}`;

    const projectData = JSON.stringify({
      sellerId: userId.toString(),
      creditType: 'PREMIUM',
      creditsAmount: INITIAL_SELLER_CREDITS,
      state: userDoc.state || 'MH',
      vintage: new Date().toISOString().slice(0, 7),
    });
    const projectHash = `sha256:${crypto.createHash('sha256').update(projectData).digest('hex')}`;
    const verificationHash = crypto.createHash('sha256').update(projectId).digest('hex');

    const mintResult = await mintCreditBatch({
      issuerAddress,
      amount: INITIAL_SELLER_CREDITS,
      projectHash,
      metadataURI,
      suggestedTokenId: nextTokenId,
    });

    const initialBatch = await CarbonBatch.create({
      projectId,
      issuerId: userId,
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      mintTxHash: mintResult.txHash,
      mintBlockNumber: mintResult.blockNumber,
      totalCredits: INITIAL_SELLER_CREDITS,
      availableCredits: INITIAL_SELLER_CREDITS,
      creditType: 'PREMIUM',
      methodology: 'REGENERATIVE_AGRICULTURE',
      verificationHash,
      projectHash,
      geography: {
        state: userDoc.state || 'MH',
      },
      vintage: new Date().toISOString().slice(0, 7),
      status: 'MINTED',
      listingIds: [],
      metadataURI,
    });

    return initialBatch;
  } catch (err) {
    console.error('Failed to grant initial seller credits:', err.message);
    return null;
  }
}

/**
 * Calculates complete credit balance breakdown for a seller
 */
export async function getSellerCreditBreakdown(userId) {
  const batches = await CarbonBatch.find({ issuerId: userId }).lean();
  const listings = await CarbonListing.find({ sellerId: userId }).lean();
  const buyerTrades = await TradeOffer.find({
    buyerId: userId,
    status: { $in: ['ACCEPTED', 'SETTLED', 'COMPLETED'] },
  }).lean();
  const retirements = await RetirementRecord.find({
    retiredBy: userId,
    status: { $in: ['PENDING', 'CONFIRMED'] },
  }).lean();

  const activeListings = listings.filter((l) => l.status === 'ACTIVE');
  const totalActiveListed = activeListings.reduce((sum, l) => sum + (Number(l.availableCredits) || 0), 0);
  const totalSold = listings.reduce((sum, l) => sum + (Number(l.totalSold) || 0), 0);
  
  let unlistedHeld = 0;
  for (const batch of batches) {
    const batchIdStr = String(batch._id);
    const activeListedCredits = activeListings
      .filter((l) => String(l.batchId) === batchIdStr || (batch.listingIds && batch.listingIds.some((lid) => String(lid) === String(l._id))))
      .reduce((sum, l) => sum + (Number(l.availableCredits) || 0), 0);

    const batchUnlisted = Math.max(0, Number(batch.availableCredits || 0) - activeListedCredits);
    unlistedHeld += batchUnlisted;
  }

  const creditsFromPurchases = buyerTrades.reduce((sum, t) => sum + (Number(t.creditsRequested) || 0), 0);
  const creditsRetired = retirements.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const totalOwnedInHand = unlistedHeld + creditsFromPurchases - creditsRetired;

  return {
    totalIssued: unlistedHeld + totalActiveListed + totalSold,
    totalActiveListed,
    totalSold,
    unlistedHeld,
    totalOwnedInHand: Math.max(0, Math.round(totalOwnedInHand * 100) / 100),
    activeListingsCount: activeListings.length,
  };
}
