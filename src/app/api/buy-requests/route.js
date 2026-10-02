import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import BuyRequest from '@/models/BuyRequest';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';
import { verifyAuthWithRole } from '@/middleware/auth';
import dbConnect from '@/lib/db/mongodb';

/**
 * POST /api/buy-requests
 * Create a new buy request for a carbon credit listing
 * Any authenticated user (FARMER or COMPANY) can submit a buy request
 */
export async function POST(request) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['BUYER', 'COMPANY', 'ADMIN']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Only Buyers can submit buy requests. Sellers cannot submit buy requests.' },
        { status: 403 }
      );
    }

    const { listingId, creditsRequested, buyerMessage } = await request.json();

    // Validation
    if (!listingId || !creditsRequested) {
      return Response.json(
        { success: false, message: 'listingId and creditsRequested are required' },
        { status: 400 }
      );
    }

    if (creditsRequested <= 0 || creditsRequested > 1000000) {
      return Response.json(
        { success: false, message: 'Credits requested must be between 0.01 and 1,000,000' },
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

    // Prevent self-purchases
    if (listing.sellerId._id.toString() === user.userId) {
      return Response.json(
        { success: false, message: 'You cannot buy from yourself' },
        { status: 403 }
      );
    }

    // Check if listing is active
    if (listing.status !== 'ACTIVE') {
      return Response.json(
        { success: false, message: `Listing is ${listing.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    // Check if enough credits available
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

    // Check for duplicate pending request from same buyer
    const existingRequest = await BuyRequest.findOne({
      listingId,
      buyerId: user.userId,
      status: { $in: ['PENDING', 'APPROVED'] },
    });

    if (existingRequest) {
      return Response.json(
        { success: false, message: 'You already have a pending or approved request for this listing' },
        { status: 409 }
      );
    }

    // Create buy request
    const totalPrice = creditsRequested * listing.pricePerCredit;

    const buyRequest = new BuyRequest({
      buyerId: user.userId,
      listingId,
      sellerId: listing.sellerId._id,
      sellerType: listing.sellerType,
      creditsRequested,
      pricePerCredit: listing.pricePerCredit,
      totalPrice,
      buyerMessage: buyerMessage || '',
    });

    await buyRequest.save();

    // Populate buyer info
    await buyRequest.populate('buyerId', 'name email');

    return Response.json(
      {
        success: true,
        message: 'Buy request created successfully',
        data: buyRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating buy request:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/buy-requests
 * Get buy requests
 * Query params:
 * - type: 'received' (for seller), 'sent' (for buyer), 'all' (default based on role)
 * - status: filter by status (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED)
 * - limit: results per page (default 20)
 * - skip: pagination offset (default 0)
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
    const type = searchParams.get('type') || 'received'; // 'received', 'sent', or 'all'
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Build query
    let query = {};

    if (type === 'received') {
      query.sellerId = user.userId;
    } else if (type === 'sent') {
      query.buyerId = user.userId;
    } else {
      // 'all' - return both sent and received
      query.$or = [{ sellerId: user.userId }, { buyerId: user.userId }];
    }

    if (status) {
      query.status = status;
    }

    // Fetch requests
    const requests = await BuyRequest.find(query)
      .populate('buyerId', 'name email role')
      .populate('sellerId', 'name email role')
      .populate('listingId', 'month cropType creditsAmount pricePerCredit status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await BuyRequest.countDocuments(query);

    return Response.json({
      success: true,
      data: requests,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching buy requests:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/buy-requests?id=requestId
 * Update buy request (approve, reject, cancel)
 * Only seller can approve/reject, only buyer can cancel
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
    const requestId = searchParams.get('id');

    if (!requestId) {
      return Response.json(
        { success: false, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    const buyRequest = await BuyRequest.findById(requestId);

    if (!buyRequest) {
      return Response.json(
        { success: false, message: 'Buy request not found' },
        { status: 404 }
      );
    }

    const { action, sellerResponse, transactionId } = await request.json();

    if (!action) {
      return Response.json(
        { success: false, message: 'action is required (approve, reject, cancel)' },
        { status: 400 }
      );
    }

    // Seller actions: approve, reject
    if (['approve', 'reject'].includes(action)) {
      if (buyRequest.sellerId.toString() !== user.userId) {
        return Response.json(
          { success: false, message: 'Only seller can approve or reject' },
          { status: 403 }
        );
      }

      if (buyRequest.status !== 'PENDING') {
        return Response.json(
          { success: false, message: 'Can only respond to pending requests' },
          { status: 409 }
        );
      }

      if (action === 'approve') {
        buyRequest.status = 'APPROVED';
        buyRequest.sellerResponse = sellerResponse || 'Approved';
      } else {
        buyRequest.status = 'REJECTED';
        buyRequest.sellerResponse = sellerResponse || 'Rejected';
      }

      buyRequest.respondedAt = new Date();
      await buyRequest.save();

      return Response.json({
        success: true,
        message: `Request ${action}d successfully`,
        data: buyRequest,
      });
    }

    // Buyer action: cancel
    if (action === 'cancel') {
      if (buyRequest.buyerId.toString() !== user.userId) {
        return Response.json(
          { success: false, message: 'Only buyer can cancel' },
          { status: 403 }
        );
      }

      if (!['PENDING', 'APPROVED'].includes(buyRequest.status)) {
        return Response.json(
          { success: false, message: 'Can only cancel pending or approved requests' },
          { status: 409 }
        );
      }

      buyRequest.status = 'CANCELLED';
      buyRequest.updatedAt = new Date();
      await buyRequest.save();

      return Response.json({
        success: true,
        message: 'Request cancelled successfully',
        data: buyRequest,
      });
    }

    // Complete (when payment is done)
    if (action === 'complete') {
      if (buyRequest.status !== 'APPROVED') {
        return Response.json(
          { success: false, message: 'Only approved requests can be completed' },
          { status: 409 }
        );
      }

      // Use a MongoDB session for atomicity
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Atomic inventory update with concurrency guard
          const updatedListing = await CarbonListing.findOneAndUpdate(
            {
              _id: buyRequest.listingId,
              availableCredits: { $gte: buyRequest.creditsRequested },
            },
            {
              $inc: {
                availableCredits: -buyRequest.creditsRequested,
                totalSold: buyRequest.creditsRequested,
              },
            },
            { new: true, session }
          );

          if (!updatedListing) {
            throw new Error('Insufficient credits available for this listing.');
          }

          // Mark listing as sold out if all credits consumed
          if (updatedListing.availableCredits <= 0) {
            updatedListing.status = 'SOLD_OUT';
            updatedListing.availableCredits = 0;
            await updatedListing.save({ session });
          }

          buyRequest.status = 'COMPLETED';
          buyRequest.completedAt = new Date();
          if (transactionId) {
            buyRequest.transactionId = transactionId;
          }
          await buyRequest.save({ session });
        });

        return Response.json({
          success: true,
          message: 'Request completed successfully',
          data: buyRequest,
        });
      } catch (txError) {
        console.error('Complete transaction error:', txError.message);
        return Response.json(
          { success: false, message: txError.message || 'Failed to complete request' },
          { status: 409 }
        );
      } finally {
        await session.endSession();
      }
    }

    return Response.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating buy request:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/buy-requests?id=requestId
 * Delete a buy request (buyer can delete cancelled/rejected, seller can delete any)
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
    const requestId = searchParams.get('id');

    if (!requestId) {
      return Response.json(
        { success: false, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    const buyRequest = await BuyRequest.findById(requestId);

    if (!buyRequest) {
      return Response.json(
        { success: false, message: 'Buy request not found' },
        { status: 404 }
      );
    }

    // Authorization check
    const isSeller = buyRequest.sellerId.toString() === user.userId;
    const isBuyer = buyRequest.buyerId.toString() === user.userId;

    if (!isSeller && !isBuyer) {
      return Response.json(
        { success: false, message: 'You can only delete your own requests' },
        { status: 403 }
      );
    }

    // Buyer can only delete cancelled/rejected/completed
    if (isBuyer && !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(buyRequest.status)) {
      return Response.json(
        { success: false, message: 'Can only delete cancelled, rejected, or completed requests' },
        { status: 409 }
      );
    }

    await BuyRequest.findByIdAndDelete(requestId);

    return Response.json({
      success: true,
      message: 'Buy request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting buy request:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
