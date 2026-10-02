import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import { getBalance, getBatchInfo, checkBlockchainStatus } from '@/lib/blockchain/carbonService';
import { getWalletAddress, ensureWallet } from '@/lib/blockchain/wallet';
import CarbonBatch from '@/models/CarbonBatch';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';

/**
 * GET /api/blockchain/balance
 * Get a user's on-chain carbon credit balances across all batches.
 *
 * Query params:
 * - userId (optional, admin can query any user; defaults to authenticated user)
 */
export async function GET(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (authError) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');

    // Allow querying other users only for admins
    const targetUserId = (queryUserId && user.role === 'ADMIN') ? queryUserId : user.userId;

    let walletAddress = null;
    let targetUser = null;

    if (mongoose.Types.ObjectId.isValid(targetUserId)) {
      targetUser = await User.findById(targetUserId).select('+wallet.encryptedPrivateKey');
      if (targetUser) {
        const { address } = await ensureWallet(targetUser);
        walletAddress = address;
      }
    } else {
      // System / Admin wallet
      walletAddress = '0x71bE63f330a2f9120E772dE8A83416FfeE005470';
    }

    // If user has no wallet, return empty portfolio
    if (!walletAddress) {
      return Response.json({
        success: true,
        data: {
          walletAddress: null,
          hasWallet: false,
          balances: [],
          totalCreditsOwned: 0,
          totalCreditsRetired: 0,
          blockchainConfigured: false,
        },
      });
    }

    if (targetUser && (targetUser.role === 'SELLER' || targetUser.role === 'FARMER')) {
      try {
        const { ensureSellerInitialCredits } = await import('@/lib/blockchain/sellerCredits');
        await ensureSellerInitialCredits(targetUser);
      } catch (err) {
        console.error('Initial credit check error:', err.message);
      }
    }

    const status = await checkBlockchainStatus();
    const TradeOffer = (await import('@/models/TradeOffer')).default;
    const RetirementRecord = (await import('@/models/RetirementRecord')).default;

    // Find all minted batches
    const batches = await CarbonBatch.find({
      status: { $in: ['MINTED', 'PARTIALLY_SOLD', 'FULLY_SOLD', 'RETIRED'] },
    }).lean();

    // Fetch user trades and retirements
    const userTrades = await TradeOffer.find({
      buyerId: targetUserId,
      status: { $in: ['ACCEPTED', 'SETTLED', 'COMPLETED'] },
    }).lean();

    const userRetirements = await RetirementRecord.find({
      retiredBy: targetUserId,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    }).lean();

    // Fetch active listings for this seller to separate listed market credits from in-hand portfolio
    const activeMarketListings = await CarbonListing.find({
      sellerId: targetUserId,
      status: 'ACTIVE',
    }).lean();

    const balances = [];
    let totalCreditsOwned = 0;
    let totalCreditsRetired = userRetirements.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    for (const batch of batches) {
      const batchIdStr = String(batch._id);
      const isIssuer = String(batch.issuerId) === String(targetUserId);

      // Credits from trades where this user was the buyer
      const creditsFromTrades = userTrades
        .filter((t) => String(t.batchId) === batchIdStr || (batch.listingIds && batch.listingIds.some((lid) => String(lid) === String(t.listingId))))
        .reduce((sum, t) => sum + (Number(t.creditsRequested) || 0), 0);

      // Credits retired from this batch by this user
      const creditsRetiredFromBatch = userRetirements
        .filter((r) => String(r.batchId) === batchIdStr)
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      // Credits actively listed on marketplace (held in market escrow for sale)
      const activeListedCredits = activeMarketListings
        .filter((l) => String(l.batchId) === batchIdStr || (batch.listingIds && batch.listingIds.some((lid) => String(lid) === String(l._id))))
        .reduce((sum, l) => sum + (Number(l.availableCredits) || 0), 0);

      let netBalance = 0;
      if (isIssuer) {
        // Unlisted credits = batch.availableCredits minus active marketplace listings for this batch
        const unlistedHeldCredits = Math.max(0, Number(batch.availableCredits || 0) - activeListedCredits);
        netBalance += unlistedHeldCredits;
      }
      netBalance += creditsFromTrades - creditsRetiredFromBatch;

      if (netBalance > 0) {
        balances.push({
          batchId: batch._id,
          projectId: batch.projectId,
          tokenId: batch.tokenId || 1001,
          contractAddress: batch.contractAddress || '0x71bE63f330a2f9120E772dE8A83416FfeE005470',
          balance: Math.round(netBalance * 100) / 100,
          creditType: batch.creditType || 'BASELINE',
          cropType: batch.cropType,
          methodology: batch.methodology,
          vintage: batch.vintage,
          geography: batch.geography,
        });

        totalCreditsOwned += netBalance;
      }
    }

    return Response.json({
      success: true,
      data: {
        walletAddress,
        hasWallet: true,
        balances,
        totalCreditsOwned: Math.round(totalCreditsOwned * 100) / 100,
        totalCreditsRetired: Math.round(totalCreditsRetired * 100) / 100,
        blockchainConfigured: true,
        contractAddress: status.contractAddress || '0x71bE63f330a2f9120E772dE8A83416FfeE005470',
      },
    });
  } catch (error) {
    console.error('Balance error:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch balances: ' + error.message },
      { status: 500 }
    );
  }
}
