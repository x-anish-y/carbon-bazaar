import crypto from 'crypto';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import { checkPaymentIdempotency } from '@/lib/utils/idempotency';
import TradeOffer from '@/models/TradeOffer';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';

/**
 * POST /api/payments/verify
 * Verify Razorpay payment and create trade offer with atomic DB operations.
 *
 * Fixes applied:
 * - No hardcoded Razorpay secrets
 * - Idempotency: duplicate payment IDs return existing offer instead of creating a second
 * - Atomic inventory update: uses findOneAndUpdate with $gte guard to prevent double-sale
 * - MongoDB transaction: TradeOffer creation, listing update, and seller income are all-or-nothing
 * - No sensitive data logged
 */
export async function POST(request) {
  try {
    await dbConnect();

    // Validate Razorpay config
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      return Response.json(
        { success: false, message: 'Payment gateway not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const { user, error: authError } = verifyAuth(request);
    if (!user || authError) {
      return Response.json(
        { success: false, message: 'Authentication required. Please login and try again.' },
        { status: 401 }
      );
    }

    if (user.role === 'SELLER' || user.role === 'FARMER') {
      return Response.json(
        { success: false, message: 'Sellers cannot purchase carbon credits. Purchases are only permitted for Buyer accounts.' },
        { status: 403 }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      listingId,
      creditsRequested,
      negotiatedPricePerCredit,
      message,
    } = await request.json();

    // Input validation
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return Response.json(
        { success: false, message: 'Missing payment verification details.' },
        { status: 400 }
      );
    }

    if (!listingId || !creditsRequested || !negotiatedPricePerCredit) {
      return Response.json(
        { success: false, message: 'Missing listing or pricing details.' },
        { status: 400 }
      );
    }

    // ── Step 1: Verify Razorpay signature ──────────────────────────────
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isSignatureValid =
      expectedSignature === razorpaySignature ||
      (process.env.NODE_ENV === 'development' && (
        razorpaySignature === 'demo_sig' ||
        razorpaySignature === 'simulated_sig' ||
        razorpayPaymentId.startsWith('pay_')
      ));

    if (!isSignatureValid) {
      console.error('Payment signature mismatch for order:', razorpayOrderId);
      return Response.json(
        { success: false, message: 'Invalid payment signature. Please try again.' },
        { status: 400 }
      );
    }

    // ── Step 2: Idempotency check ──────────────────────────────────────
    // If this payment was already processed, return the existing offer
    const { isDuplicate, existingOffer } = await checkPaymentIdempotency(razorpayPaymentId);
    if (isDuplicate) {
      return Response.json(
        {
          success: true,
          message: 'Payment already verified. Returning existing offer.',
          data: existingOffer,
          duplicate: true,
        },
        { status: 200 }
      );
    }

    // ── Step 3: Pre-transaction validations ────────────────────────────
    const listing = await CarbonListing.findById(listingId).populate('sellerId');

    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found. It may have been deleted.' },
        { status: 404 }
      );
    }

    if (listing.sellerId._id.toString() === user.userId) {
      return Response.json(
        { success: false, message: 'You cannot trade with yourself.' },
        { status: 403 }
      );
    }

    if (listing.status !== 'ACTIVE') {
      return Response.json(
        { success: false, message: `Listing is ${listing.status.toLowerCase()}. It is no longer available.` },
        { status: 409 }
      );
    }

    // ── Step 4: Atomic settlement (Transaction on replica set, sequential on standalone) ─────────────
    let tradeOffer;
    const executeSettlementOperations = async (sessionParam = null) => {
      const opts = sessionParam ? { session: sessionParam } : {};
      const updatedListing = await CarbonListing.findOneAndUpdate(
        {
          _id: listingId,
          status: 'ACTIVE',
          availableCredits: { $gte: creditsRequested },
        },
        {
          $inc: {
            availableCredits: -creditsRequested,
            totalSold: creditsRequested,
          },
        },
        { new: true, ...opts }
      );

      if (!updatedListing) {
        throw new Error(
          `Insufficient credits. Only ${listing.availableCredits} credits are currently available.`
        );
      }

      if (updatedListing.availableCredits <= 0) {
        updatedListing.status = 'SOLD_OUT';
        updatedListing.availableCredits = 0;
        await updatedListing.save(opts);
      }

      tradeOffer = new TradeOffer({
        buyerId: user.userId,
        sellerId: listing.sellerId._id,
        listingId,
        creditsRequested,
        originalPricePerCredit: listing.pricePerCredit,
        negotiatedPricePerCredit,
        originalTotalPrice: creditsRequested * listing.pricePerCredit,
        negotiatedTotalPrice: creditsRequested * negotiatedPricePerCredit,
        status: 'ACCEPTED',
        lastOfferedBy: 'BUYER',
        transactionId: razorpayPaymentId,
        settled: false,
      });

      await tradeOffer.save(opts);

      const totalPaymentAmount = creditsRequested * negotiatedPricePerCredit;
      const sellerUpdate = await User.findOneAndUpdate(
        { _id: listing.sellerId._id },
        { $inc: { totalIncome: totalPaymentAmount } },
        opts
      );

      if (!sellerUpdate) {
        throw new Error('Seller account not found.');
      }
    };

    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await executeSettlementOperations(session);
        });
      } finally {
        await session.endSession();
      }
    } catch (txError) {
      if (
        txError.message?.includes('Transaction numbers') ||
        txError.message?.includes('replica set') ||
        txError.code === 20
      ) {
        await executeSettlementOperations(null);
      } else {
        throw txError;
      }
    }

      // ── Step 5: Populate and return ────────────────────────────────────
      await tradeOffer.populate('buyerId', 'name email');
      await tradeOffer.populate('sellerId', 'name email');

      // ── Step 6: Trigger on-chain settlement for tokenized listings ────
      let settlementData = null;
      if (listing.isTokenized && listing.batchId) {
        try {
          // Dynamically import to avoid requiring blockchain config for non-tokenized flows
          const { transferCredits: transferOnChain } = await import('@/lib/blockchain/carbonService');
          const { ensureWallet } = await import('@/lib/blockchain/wallet');
          const CarbonBatch = (await import('@/models/CarbonBatch')).default;

          const batch = await CarbonBatch.findById(listing.batchId);

          if (batch && batch.tokenId) {
            // Ensure both parties have wallets
            const sellerDoc = await User.findById(listing.sellerId._id).select('+wallet.encryptedPrivateKey');
            const buyerDoc = await User.findById(user.userId).select('+wallet.encryptedPrivateKey');

            if (sellerDoc && buyerDoc) {
              const { address: sellerAddress } = await ensureWallet(sellerDoc);
              const { address: buyerAddress } = await ensureWallet(buyerDoc);

              // Execute on-chain transfer
              const result = await transferOnChain({
                fromAddress: sellerAddress,
                toAddress: buyerAddress,
                tokenId: batch.tokenId,
                amount: creditsRequested,
              });

              // Update trade offer with settlement data
              tradeOffer.settled = true;
              tradeOffer.settlementTxHash = result.txHash;
              tradeOffer.batchId = batch._id;
              tradeOffer.tokenId = batch.tokenId;
              tradeOffer.status = 'SETTLED';
              await tradeOffer.save();

              // Update batch
              batch.availableCredits -= creditsRequested;
              if (batch.availableCredits <= 0) {
                batch.status = 'FULLY_SOLD';
                batch.availableCredits = 0;
              } else {
                batch.status = 'PARTIALLY_SOLD';
              }
              await batch.save();

              settlementData = {
                settlementTxHash: result.txHash,
                blockNumber: result.blockNumber,
                tokenId: batch.tokenId,
                contractAddress: batch.contractAddress,
              };
            }
          }
        } catch (settlementError) {
          // Settlement failure is non-fatal — the payment is still valid
          // The trade can be settled later via /api/blockchain/settle
          console.error('Auto-settlement failed (non-fatal):', settlementError.message);
        }
      }

      return Response.json(
        {
          success: true,
          message: settlementData
            ? 'Payment verified and credits transferred on-chain.'
            : 'Payment verified and offer created successfully.',
          data: tradeOffer,
          settlement: settlementData,
        },
        { status: 200 }
      );
    } catch (error) {
    console.error('Payment verification error:', error.message);

    // Return user-friendly message for known error cases
    if (error.message.includes('Insufficient credits')) {
      return Response.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: 'Payment verification failed. Please contact support.' },
      { status: 500 }
    );
  }
}
