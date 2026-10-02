import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import { transferCredits } from '@/lib/blockchain/carbonService';
import { ensureWallet } from '@/lib/blockchain/wallet';
import TradeOffer from '@/models/TradeOffer';
import CarbonListing from '@/models/CarbonListing';
import CarbonBatch from '@/models/CarbonBatch';
import User from '@/models/User';

/**
 * POST /api/blockchain/settle
 * Execute on-chain credit transfer after payment verification.
 *
 * This is called automatically by the payment verify route for tokenized listings,
 * or can be triggered manually for accepted trade offers.
 *
 * Body: { tradeOfferId }
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (authError) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tradeOfferId } = await request.json();

    if (!tradeOfferId) {
      return Response.json(
        { success: false, message: 'tradeOfferId is required' },
        { status: 400 }
      );
    }

    const tradeOffer = await TradeOffer.findById(tradeOfferId);
    if (!tradeOffer) {
      return Response.json(
        { success: false, message: 'Trade offer not found' },
        { status: 404 }
      );
    }

    // Verify the caller is a party to this trade
    const isParty =
      tradeOffer.buyerId.toString() === user.userId ||
      tradeOffer.sellerId.toString() === user.userId ||
      user.role === 'ADMIN';

    if (!isParty) {
      return Response.json(
        { success: false, message: 'Not authorized for this trade' },
        { status: 403 }
      );
    }

    // Check if already settled
    if (tradeOffer.settled) {
      return Response.json(
        {
          success: true,
          message: 'Trade already settled on-chain',
          data: {
            settlementTxHash: tradeOffer.settlementTxHash,
            settled: true,
          },
          duplicate: true,
        },
        { status: 200 }
      );
    }

    // Trade must be ACCEPTED to settle
    if (!['ACCEPTED'].includes(tradeOffer.status)) {
      return Response.json(
        { success: false, message: `Cannot settle trade in status: ${tradeOffer.status}` },
        { status: 409 }
      );
    }

    // Fetch listing and verify it's tokenized
    const listing = await CarbonListing.findById(tradeOffer.listingId);
    if (!listing || !listing.isTokenized) {
      return Response.json(
        { success: false, message: 'Listing is not tokenized. On-chain settlement not available.' },
        { status: 400 }
      );
    }

    // Fetch batch
    const batch = await CarbonBatch.findById(listing.batchId);
    if (!batch || !batch.tokenId) {
      return Response.json(
        { success: false, message: 'Carbon batch not found or not minted' },
        { status: 400 }
      );
    }

    // Ensure both parties have wallets
    const seller = await User.findById(tradeOffer.sellerId).select('+wallet.encryptedPrivateKey');
    const buyer = await User.findById(tradeOffer.buyerId).select('+wallet.encryptedPrivateKey');

    if (!seller || !buyer) {
      return Response.json(
        { success: false, message: 'Seller or buyer not found' },
        { status: 404 }
      );
    }

    const { address: sellerAddress } = await ensureWallet(seller);
    const { address: buyerAddress } = await ensureWallet(buyer);

    // Mark as settling
    tradeOffer.status = 'SETTLING';
    await tradeOffer.save();

    // Execute on-chain transfer
    let settlementResult;
    try {
      settlementResult = await transferCredits({
        fromAddress: sellerAddress,
        toAddress: buyerAddress,
        tokenId: batch.tokenId,
        amount: tradeOffer.creditsRequested,
      });
    } catch (txError) {
      // Revert status on failure
      tradeOffer.status = 'ACCEPTED';
      await tradeOffer.save();

      console.error('On-chain settlement failed:', txError.message);
      return Response.json(
        { success: false, message: 'On-chain settlement failed: ' + txError.message },
        { status: 500 }
      );
    }

    // Update trade offer with settlement data
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        tradeOffer.status = 'SETTLED';
        tradeOffer.settled = true;
        tradeOffer.settlementTxHash = settlementResult.txHash;
        tradeOffer.batchId = batch._id;
        tradeOffer.tokenId = batch.tokenId;
        tradeOffer.completedAt = new Date();
        await tradeOffer.save({ session });

        // Update batch available credits
        batch.availableCredits -= tradeOffer.creditsRequested;
        if (batch.availableCredits <= 0) {
          batch.status = 'FULLY_SOLD';
          batch.availableCredits = 0;
        } else {
          batch.status = 'PARTIALLY_SOLD';
        }
        await batch.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return Response.json(
      {
        success: true,
        message: 'Credits transferred on-chain successfully',
        data: {
          tradeOfferId: tradeOffer._id,
          settlementTxHash: settlementResult.txHash,
          blockNumber: settlementResult.blockNumber,
          tokenId: batch.tokenId,
          contractAddress: batch.contractAddress,
          creditsTransferred: tradeOffer.creditsRequested,
          from: sellerAddress,
          to: buyerAddress,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Settlement error:', error);
    return Response.json(
      { success: false, message: 'Settlement failed: ' + error.message },
      { status: 500 }
    );
  }
}
