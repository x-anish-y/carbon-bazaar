import Razorpay from 'razorpay';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import CarbonListing from '@/models/CarbonListing';

// Fail fast if Razorpay credentials are missing
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables.');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/payments
 * Create a Razorpay order for carbon credit purchase
 */
export async function POST(request) {
  try {
    await dbConnect();

    // Validate Razorpay config at request time (in case env wasn't loaded at module init)
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return Response.json(
        { success: false, message: 'Payment gateway not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const { user, error: authError } = verifyAuth(request);
    if (authError) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    if (user.role === 'SELLER' || user.role === 'FARMER') {
      return Response.json(
        { success: false, message: 'Sellers cannot purchase carbon credits. Purchases are only permitted for Buyer accounts.' },
        { status: 403 }
      );
    }

    const { listingId, creditsRequested, negotiatedPricePerCredit } = await request.json();

    // Validation
    if (!listingId || !creditsRequested || !negotiatedPricePerCredit) {
      return Response.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (creditsRequested <= 0 || creditsRequested > 1000000) {
      return Response.json(
        { success: false, message: 'Credits requested must be between 0.01 and 1,000,000' },
        { status: 400 }
      );
    }

    if (negotiatedPricePerCredit <= 0 || negotiatedPricePerCredit > 10000) {
      return Response.json(
        { success: false, message: 'Price must be between ₹0.01 and ₹10,000 per credit' },
        { status: 400 }
      );
    }

    // Fetch listing
    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return Response.json({ success: false, message: 'Listing not found' }, { status: 404 });
    }

    // Check listing is active
    if (listing.status !== 'ACTIVE') {
      return Response.json(
        { success: false, message: `Listing is ${listing.status.toLowerCase()}. It is no longer available.` },
        { status: 409 }
      );
    }

    // Check sufficient credits
    if (creditsRequested > listing.availableCredits) {
      return Response.json(
        {
          success: false,
          message: `Only ${listing.availableCredits} credits available`,
          availableCredits: listing.availableCredits,
        },
        { status: 409 }
      );
    }

    // Prevent self-purchase
    if (listing.sellerId.toString() === user.userId) {
      return Response.json(
        { success: false, message: 'You cannot buy from yourself' },
        { status: 403 }
      );
    }

    // Calculate amount in paise (Razorpay works with smallest currency unit)
    const amount = Math.round(creditsRequested * negotiatedPricePerCredit * 100);

    if (amount < 100) {
      return Response.json(
        { success: false, message: 'Order amount must be at least ₹1' },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${user.userId.slice(-6)}`,
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
          key: process.env.RAZORPAY_KEY_ID,
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
