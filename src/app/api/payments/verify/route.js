import Razorpay from 'razorpay';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_SCUi9mnsgyxR89',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'csp5J5UDJTLGVaOt8qtOFfFI',
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment and create trade offer
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (!user || authError) {
      return Response.json({ success: false, message: 'Authentication required. Please login and try again.' }, { status: 200 });
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

    // Verify signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'csp5J5UDJTLGVaOt8qtOFfFI')
      .update(body)
      .digest('hex');

    console.log('Verifying payment signature...');
    console.log('Order ID:', razorpayOrderId);
    console.log('Payment ID:', razorpayPaymentId);
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', razorpaySignature);

    if (expectedSignature !== razorpaySignature) {
      console.error('Signature mismatch:', {
        expected: expectedSignature,
        received: razorpaySignature,
        body: body,
      });
      return Response.json(
        { success: false, message: 'Invalid payment signature. Please try again.' },
        { status: 200 }
      );
    }

    // Payment verified - create trade offer
    const listing = await CarbonListing.findById(listingId).populate('sellerId');

    if (!listing) {
      return Response.json({ success: false, message: 'Listing not found. It may have been deleted.' }, { status: 200 });
    }

    if (listing.sellerId._id.toString() === user.userId) {
      return Response.json(
        { success: false, message: 'You cannot trade with yourself' },
        { status: 200 }
      );
    }

    if (listing.status !== 'ACTIVE') {
      return Response.json(
        { success: false, message: `Listing is ${listing.status.toLowerCase()}. It is no longer available.` },
        { status: 200 }
      );
    }

    if (creditsRequested > listing.availableCredits) {
      return Response.json(
        {
          success: false,
          message: `Only ${listing.availableCredits} credits available. Please try with a lower amount.`,
          availableCredits: listing.availableCredits,
        },
        { status: 200 }
      );
    }

    // Check for duplicate active offer
    const existingOffer = await TradeOffer.findOne({
      listingId,
      buyerId: user.userId,
      status: { $in: ['OFFERED', 'COUNTER_OFFERED'] },
    });

    if (existingOffer) {
      return Response.json(
        { success: false, message: 'You already have an active offer for this listing' },
        { status: 200 }
      );
    }

    // Create trade offer
    const tradeOffer = new TradeOffer({
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
    });

    await tradeOffer.save();

    // Update listing availability
    listing.availableCredits -= creditsRequested;
    listing.totalSold = (listing.totalSold || 0) + creditsRequested;

    // Add income to farmer/seller
    const seller = await User.findById(listing.sellerId._id);
    if (seller) {
      const totalPaymentAmount = creditsRequested * negotiatedPricePerCredit;
      seller.totalIncome = (seller.totalIncome || 0) + totalPaymentAmount;
      await seller.save();
      console.log(`Income updated for seller ${listing.sellerId._id}: +${totalPaymentAmount}`);
    }

    // If all credits are sold, mark as SOLD_OUT
    if (listing.availableCredits <= 0) {
      listing.status = 'SOLD_OUT';
      listing.availableCredits = 0;
      console.log(`Listing ${listingId} marked as SOLD_OUT`);
    }

    await listing.save();

    // Populate relations for response
    await tradeOffer.populate('buyerId', 'name email');
    await tradeOffer.populate('sellerId', 'name email');

    return Response.json(
      {
        success: true,
        message: 'Payment verified and offer created',
        data: tradeOffer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return Response.json(
      { success: false, message: 'Payment verification failed: ' + error.message },
      { status: 200 }
    );
  }
}
