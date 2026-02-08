import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';

/**
 * GET /api/company/stats
 * Get company's carbon credits owned and spending data
 */
export async function GET(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (!user || authError) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    // Only companies can access this
    if (user.role !== 'COMPANY') {
      return Response.json({ success: false, message: 'Only companies can access this' }, { status: 403 });
    }

    // Get all accepted trade offers where this company is the buyer
    const tradeOffers = await TradeOffer.find({
      buyerId: user.userId,
      status: { $in: ['ACCEPTED', 'COMPLETED'] },
    })
      .populate('sellerId', 'name email')
      .populate('listingId', 'cropType state')
      .sort({ createdAt: -1 });

    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    // Calculate stats
    const creditsOwned = tradeOffers.reduce((sum, offer) => sum + toNumber(offer.creditsRequested), 0);
    const totalSpent = tradeOffers.reduce((sum, offer) => sum + toNumber(offer.negotiatedTotalPrice), 0);
    const creditsRequired = 5000; // Default ESG target (can be customized per company)

    const rawCompliancePercentage = creditsRequired > 0 ? (creditsOwned / creditsRequired) * 100 : 0;
    const compliancePercentage = Math.max(0, Math.min(100, Math.round(rawCompliancePercentage * 10) / 10));

    return Response.json({
      success: true,
      data: {
        creditsOwned: Math.round(creditsOwned * 100) / 100,
        creditsRequired,
        creditsDeficit: Math.max(0, creditsRequired - creditsOwned),
        totalSpent: Math.round(totalSpent),
        compliancePercentage,
        averagePricePerCredit: creditsOwned > 0 ? Math.round((totalSpent / creditsOwned) * 100) / 100 : 0,
        offersCount: tradeOffers.length,
        recentOffers: tradeOffers.slice(0, 5).map(offer => ({
          _id: offer._id,
          credits: offer.creditsRequested,
          totalPrice: offer.negotiatedTotalPrice,
          cropType: offer.listingId?.cropType,
          seller: offer.sellerId?.name,
          createdAt: offer.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch company statistics' },
      { status: 500 }
    );
  }
}
