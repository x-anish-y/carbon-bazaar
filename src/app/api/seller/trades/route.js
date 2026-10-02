import dbConnect from '@/lib/db/mongodb';
import { verifyAuth, isRoleAllowed } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';

/**
 * GET /api/seller/trades
 * Get seller's trade offers (sales)
 */
export async function GET(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (!user || authError) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    if (!isRoleAllowed(user.role, ['SELLER', 'ADMIN'])) {
      return Response.json({ success: false, message: 'Only sellers can access this' }, { status: 403 });
    }

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
        trades: tradeOffers.map((trade) => ({
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
    console.error('Error fetching seller trades:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
