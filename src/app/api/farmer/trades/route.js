import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';

/**
 * GET /api/farmer/trades
 * Get farmer's trade offers (sales)
 */
export async function GET(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (!user || authError) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Only farmers can access this
    if (user.role !== 'FARMER') {
      return Response.json({ success: false, message: 'Only farmers can access this' }, { status: 403 });
    }

    // Get all accepted/completed trade offers where this farmer is the seller
    const tradeOffers = await TradeOffer.find({
      sellerId: user.userId,
      status: { $in: ['ACCEPTED', 'COMPLETED'] },
    })
      .populate('buyerId', 'name email role')
      .populate('listingId', 'cropType state')
      .sort({ createdAt: -1 })
      .limit(10);

    return Response.json({
      success: true,
      data: {
        trades: tradeOffers.map(trade => ({
          _id: trade._id,
          buyerName: trade.buyerId?.name,
          buyerRole: trade.buyerId?.role,
          cropType: trade.listingId?.cropType,
          creditsRequested: trade.creditsRequested,
          negotiatedPricePerCredit: trade.negotiatedPricePerCredit,
          negotiatedTotalPrice: trade.negotiatedTotalPrice,
          createdAt: trade.createdAt,
          transactionId: trade.transactionId,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching farmer trades:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
