import { NextResponse } from 'next/server';
import NegotiationMessage from '@/models/NegotiationMessage';
import TradeOffer from '@/models/TradeOffer';
import { verifyAuthWithRole } from '@/middleware/auth';
import dbConnect from '@/lib/db/mongodb';

/**
 * POST /api/trade-offers/[id]/messages
 * Send a negotiation message
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['FARMER', 'COMPANY']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: offerId } = params;
    const { message, messageType, proposedPrice, rejectionReason } = await request.json();

    if (!message) {
      return Response.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    // Fetch trade offer
    const tradeOffer = await TradeOffer.findById(offerId);

    if (!tradeOffer) {
      return Response.json(
        { success: false, message: 'Trade offer not found' },
        { status: 404 }
      );
    }

    // Check user is part of this trade
    const isBuyer = tradeOffer.buyerId.toString() === user.userId;
    const isSeller = tradeOffer.sellerId.toString() === user.userId;

    if (!isBuyer && !isSeller) {
      return Response.json(
        { success: false, message: 'You are not part of this trade' },
        { status: 403 }
      );
    }

    // Don't allow messages on completed/rejected trades
    if (['REJECTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(tradeOffer.status)) {
      return Response.json(
        { success: false, message: `Cannot message on ${tradeOffer.status.toLowerCase()} offers` },
        { status: 409 }
      );
    }

    // Create message
    const negotiationMessage = new NegotiationMessage({
      tradeOfferId: offerId,
      senderId: user.userId,
      senderRole: isBuyer ? 'BUYER' : 'SELLER',
      messageType: messageType || 'TEXT',
      message,
      proposedPrice: proposedPrice || null,
      rejectionReason: rejectionReason || null,
    });

    await negotiationMessage.save();

    // Populate sender info
    await negotiationMessage.populate('senderId', 'name email role');

    return Response.json(
      {
        success: true,
        message: 'Message sent successfully',
        data: negotiationMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending negotiation message:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trade-offers/[id]/messages
 * Get all messages for a trade negotiation
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['FARMER', 'COMPANY']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: offerId } = params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 200);
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Fetch trade offer to verify access
    const tradeOffer = await TradeOffer.findById(offerId);

    if (!tradeOffer) {
      return Response.json(
        { success: false, message: 'Trade offer not found' },
        { status: 404 }
      );
    }

    // Check user is part of this trade
    const isBuyer = tradeOffer.buyerId.toString() === user.userId;
    const isSeller = tradeOffer.sellerId.toString() === user.userId;

    if (!isBuyer && !isSeller) {
      return Response.json(
        { success: false, message: 'You are not part of this trade' },
        { status: 403 }
      );
    }

    // Fetch messages
    const messages = await NegotiationMessage.find({ tradeOfferId: offerId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 })
      .limit(limit)
      .skip(skip);

    const total = await NegotiationMessage.countDocuments({ tradeOfferId: offerId });

    // Mark messages as read for the current user
    await NegotiationMessage.updateMany(
      {
        tradeOfferId: offerId,
        senderId: { $ne: user.userId },
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return Response.json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching negotiation messages:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trade-offers/[id]/messages?messageId=msgId
 * Delete a message (only by sender, and only if not too old)
 */
export async function DELETE(request, { params }) {
  try {
    await dbConnect();

    const user = await verifyAuthWithRole(request, ['FARMER', 'COMPANY']);
    if (!user.success) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: offerId } = params;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return Response.json(
        { success: false, message: 'messageId is required' },
        { status: 400 }
      );
    }

    // Fetch message
    const message = await NegotiationMessage.findById(messageId);

    if (!message) {
      return Response.json(
        { success: false, message: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify message belongs to this trade
    if (message.tradeOfferId.toString() !== offerId) {
      return Response.json(
        { success: false, message: 'Message does not belong to this trade' },
        { status: 400 }
      );
    }

    // Only sender can delete
    if (message.senderId.toString() !== user.userId) {
      return Response.json(
        { success: false, message: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Can only delete within 5 minutes
    const createdTime = new Date(message.createdAt).getTime();
    const now = new Date().getTime();
    const ageInMinutes = (now - createdTime) / (1000 * 60);

    if (ageInMinutes > 5) {
      return Response.json(
        { success: false, message: 'Can only delete messages within 5 minutes of sending' },
        { status: 409 }
      );
    }

    await NegotiationMessage.findByIdAndDelete(messageId);

    return Response.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting negotiation message:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
