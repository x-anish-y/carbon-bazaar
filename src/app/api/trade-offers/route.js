import { NextResponse } from 'next/server';
import TradeOffer from '@/models/TradeOffer';
import NegotiationMessage from '@/models/NegotiationMessage';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';
import { verifyAuthWithRole } from '@/middleware/auth';
import dbConnect from '@/lib/db/mongodb';

/**
 * POST /api/trade-offers
 * Create a new trade offer with custom price
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { user, error } = verifyAuthWithRole(request, ['BUYER', 'ADMIN']);
    if (error || !user) {
      return Response.json(
        { success: false, message: 'Only Buyers can submit buy/trade offers. Sellers cannot submit buy offers.' },
        { status: 403 }
      );
    }

    const { listingId, creditsRequested, negotiatedPricePerCredit, message } = await request.json();

    // Validation
    if (!listingId || !creditsRequested || !negotiatedPricePerCredit) {
      return Response.json(
        { success: false, message: 'listingId, creditsRequested, and negotiatedPricePerCredit are required' },
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
    const listing = await CarbonListing.findById(listingId).populate('sellerId');

    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      );
    }

    // Prevent self-trades
    if (listing.sellerId._id.toString() === user.userId) {
      return Response.json(
        { success: false, message: 'You cannot trade with yourself' },
        { status: 403 }
      );
    }

    // Check listing is active
    if (listing.status !== 'ACTIVE') {
      return Response.json(
        { success: false, message: `Listing is ${listing.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    // Check sufficient credits available
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

    // Check for duplicate active offer from same buyer
    const existingOffer = await TradeOffer.findOne({
      listingId,
      buyerId: user.userId,
      status: { $in: ['OFFERED', 'COUNTER_OFFERED'] },
    });

    if (existingOffer) {
      return Response.json(
        { success: false, message: 'You already have an active offer for this listing' },
        { status: 409 }
      );
    }

    // Calculate totals
    const originalTotalPrice = creditsRequested * listing.pricePerCredit;
    const negotiatedTotalPrice = creditsRequested * negotiatedPricePerCredit;

    // Create trade offer
    const tradeOffer = new TradeOffer({
      buyerId: user.userId,
      sellerId: listing.sellerId._id,
      listingId,
      creditsRequested,
      originalPricePerCredit: listing.pricePerCredit,
      negotiatedPricePerCredit,
      originalTotalPrice,
      negotiatedTotalPrice,
      lastOfferedBy: 'BUYER',
    });

    await tradeOffer.save();

    // Populate details
    await tradeOffer.populate('buyerId', 'name email');
    await tradeOffer.populate('sellerId', 'name email');

    // Create initial message if provided
    if (message) {
      const initialMessage = new NegotiationMessage({
        tradeOfferId: tradeOffer._id,
        senderId: user.userId,
        senderRole: 'BUYER',
        messageType: 'OFFER',
        message,
        proposedPrice: negotiatedPricePerCredit,
        proposedCredits: creditsRequested,
      });

      await initialMessage.save();
    }

    return Response.json(
      {
        success: true,
        message: 'Trade offer created successfully',
        data: tradeOffer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating trade offer:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trade-offers
 * Get trade offers
 * Query params:
 * - type: 'received' (seller view), 'sent' (buyer view), 'all'
 * - status: filter by status
 * - listingId: filter by listing
 * - limit: page size
 * - skip: pagination offset
 */
export async function GET(request) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['FARMER', 'COMPANY']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'received', 'sent', or 'all'
    const status = searchParams.get('status');
    const listingId = searchParams.get('listingId');
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Build query
    let query = {};

    if (type === 'received') {
      query.sellerId = user.userId;
    } else if (type === 'sent') {
      query.buyerId = user.userId;
    } else {
      // 'all' - return both
      query.$or = [{ sellerId: user.userId }, { buyerId: user.userId }];
    }

    if (status) {
      query.status = status;
    }

    if (listingId) {
      query.listingId = listingId;
    }

    // Fetch offers
    const offers = await TradeOffer.find(query)
      .populate('buyerId', 'name email role')
      .populate('sellerId', 'name email role')
      .populate('listingId', 'month cropType creditsAmount pricePerCredit status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await TradeOffer.countDocuments(query);

    return Response.json({
      success: true,
      data: offers,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching trade offers:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trade-offers?id=offerId
 * Update trade offer (accept, reject, or counter-offer)
 */
export async function PUT(request) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['FARMER', 'COMPANY']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');

    if (!offerId) {
      return Response.json(
        { success: false, message: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const tradeOffer = await TradeOffer.findById(offerId);

    if (!tradeOffer) {
      return Response.json(
        { success: false, message: 'Trade offer not found' },
        { status: 404 }
      );
    }

    const { action, negotiatedPricePerCredit, creditsRequested, message } = await request.json();

    if (!action) {
      return Response.json(
        { success: false, message: 'action is required (accept, reject, counter)' },
        { status: 400 }
      );
    }

    // Seller accepts
    if (action === 'accept') {
      if (tradeOffer.sellerId.toString() !== user.userId) {
        return Response.json(
          { success: false, message: 'Only seller can accept' },
          { status: 403 }
        );
      }

      if (!['OFFERED', 'COUNTER_OFFERED'].includes(tradeOffer.status)) {
        return Response.json(
          { success: false, message: 'Can only accept pending offers' },
          { status: 409 }
        );
      }

      tradeOffer.status = 'ACCEPTED';
      tradeOffer.respondedAt = new Date();
      tradeOffer.respondedBy = user.userId;

      // NOTE: Seller income is NOT updated here.
      // For paid offers (with transactionId), income is added in /api/payments/verify
      // to prevent double-counting. For negotiation-only offers that are later paid,
      // income will be added at the payment/settlement step.

      // Create acceptance message
      if (message) {
        const acceptMessage = new NegotiationMessage({
          tradeOfferId: tradeOffer._id,
          senderId: user.userId,
          senderRole: 'SELLER',
          messageType: 'ACCEPT',
          message,
        });
        await acceptMessage.save();
      }
    }

    // Seller rejects
    else if (action === 'reject') {
      if (tradeOffer.sellerId.toString() !== user.userId) {
        return Response.json(
          { success: false, message: 'Only seller can reject' },
          { status: 403 }
        );
      }

      if (!['OFFERED', 'COUNTER_OFFERED'].includes(tradeOffer.status)) {
        return Response.json(
          { success: false, message: 'Can only reject pending offers' },
          { status: 409 }
        );
      }

      tradeOffer.status = 'REJECTED';
      tradeOffer.respondedAt = new Date();
      tradeOffer.respondedBy = user.userId;
      tradeOffer.responseReason = message || 'No reason provided';

      // Create rejection message
      const rejectMessage = new NegotiationMessage({
        tradeOfferId: tradeOffer._id,
        senderId: user.userId,
        senderRole: 'SELLER',
        messageType: 'REJECT',
        message: message || 'Offer rejected',
        rejectionReason: message,
      });
      await rejectMessage.save();
    }

    // Counter-offer (either buyer or seller)
    else if (action === 'counter') {
      if (!negotiatedPricePerCredit) {
        return Response.json(
          { success: false, message: 'negotiatedPricePerCredit is required for counter-offers' },
          { status: 400 }
        );
      }

      if (negotiatedPricePerCredit <= 0 || negotiatedPricePerCredit > 10000) {
        return Response.json(
          { success: false, message: 'Price must be between ₹0.01 and ₹10,000 per credit' },
          { status: 400 }
        );
      }

      // Determine who's making the counter-offer
      const isBuyer = tradeOffer.buyerId.toString() === user.userId;
      const isSeller = tradeOffer.sellerId.toString() === user.userId;

      if (!isBuyer && !isSeller) {
        return Response.json(
          { success: false, message: 'You are not part of this trade' },
          { status: 403 }
        );
      }

      // Update price
      tradeOffer.negotiatedPricePerCredit = negotiatedPricePerCredit;
      tradeOffer.creditsRequested = creditsRequested || tradeOffer.creditsRequested;
      tradeOffer.status = 'COUNTER_OFFERED';
      tradeOffer.lastOfferedBy = isBuyer ? 'BUYER' : 'SELLER';
      tradeOffer.respondedAt = new Date();
      tradeOffer.respondedBy = user.userId;

      // Create counter-offer message
      const counterMessage = new NegotiationMessage({
        tradeOfferId: tradeOffer._id,
        senderId: user.userId,
        senderRole: isBuyer ? 'BUYER' : 'SELLER',
        messageType: 'COUNTER_OFFER',
        message: message || `Counter-offer: ₹${negotiatedPricePerCredit} per credit`,
        proposedPrice: negotiatedPricePerCredit,
        proposedCredits: creditsRequested || tradeOffer.creditsRequested,
      });
      await counterMessage.save();
    }

    // Buyer cancels
    else if (action === 'cancel') {
      if (tradeOffer.buyerId.toString() !== user.userId) {
        return Response.json(
          { success: false, message: 'Only buyer can cancel' },
          { status: 403 }
        );
      }

      if (!['OFFERED', 'COUNTER_OFFERED'].includes(tradeOffer.status)) {
        return Response.json(
          { success: false, message: 'Can only cancel pending offers' },
          { status: 409 }
        );
      }

      tradeOffer.status = 'CANCELLED';
      tradeOffer.updatedAt = new Date();

      // Create cancellation message
      if (message) {
        const cancelMessage = new NegotiationMessage({
          tradeOfferId: tradeOffer._id,
          senderId: user.userId,
          senderRole: 'BUYER',
          messageType: 'TEXT',
          message: `Offer cancelled: ${message}`,
        });
        await cancelMessage.save();
      }
    }

    else {
      return Response.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    await tradeOffer.save();

    return Response.json({
      success: true,
      message: `Trade offer ${action}ed successfully`,
      data: tradeOffer,
    });
  } catch (error) {
    console.error('Error updating trade offer:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trade-offers?id=offerId
 * Delete/Cancel a trade offer
 */
export async function DELETE(request) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['FARMER', 'COMPANY']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');

    if (!offerId) {
      return Response.json(
        { success: false, message: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const tradeOffer = await TradeOffer.findById(offerId);

    if (!tradeOffer) {
      return Response.json(
        { success: false, message: 'Trade offer not found' },
        { status: 404 }
      );
    }

    // Authorization check
    const isBuyer = tradeOffer.buyerId.toString() === user.userId;
    const isSeller = tradeOffer.sellerId.toString() === user.userId;

    if (!isBuyer && !isSeller) {
      return Response.json(
        { success: false, message: 'You can only delete your own offers' },
        { status: 403 }
      );
    }

    // Can only delete cancelled/rejected/completed
    if (!['CANCELLED', 'REJECTED', 'COMPLETED', 'EXPIRED'].includes(tradeOffer.status)) {
      return Response.json(
        { success: false, message: 'Can only delete resolved offers' },
        { status: 409 }
      );
    }

    // Also delete all associated messages
    await NegotiationMessage.deleteMany({ tradeOfferId: offerId });

    // Delete the offer
    await TradeOffer.findByIdAndDelete(offerId);

    return Response.json({
      success: true,
      message: 'Trade offer and messages deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting trade offer:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
