import Razorpay from 'razorpay';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';
import CarbonListing from '@/models/CarbonListing';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_SCUi9mnsgyxR89',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'csp5J5UDJTLGVaOt8qtOFfFI',
});

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for carbon credit purchase
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (authError) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { listingId, creditsRequested, negotiatedPricePerCredit } = await request.json();

    // Validation
    if (!listingId || !creditsRequested || !negotiatedPricePerCredit) {
      return Response.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch listing
    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return Response.json({ success: false, message: 'Listing not found' }, { status: 404 });
    }

    // Calculate amount in paise (Razorpay works with smallest currency unit)
    const amount = Math.round(creditsRequested * negotiatedPricePerCredit * 100);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        listingId: listingId.toString(),
        buyerId: user.userId,
        sellerId: listing.sellerId.toString(),
        creditsRequested: creditsRequested.toString(),
        pricePerCredit: negotiatedPricePerCredit.toString(),
      },
    });

    return Response.json(
      {
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: amount,
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID || 'rzp_test_SCUi9mnsgyxR89',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    return Response.json(
      { success: false, message: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
