import dbConnect from '@/lib/db/mongodb';
import { verifyAuth, isRoleAllowed } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';
import CarbonListing from '@/models/CarbonListing';
import RetirementRecord from '@/models/RetirementRecord';
import User from '@/models/User';

/**
 * GET /api/buyer/stats
 * Get buyer's carbon credits owned and spending data
 */
export async function GET(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (!user || authError) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    if (!isRoleAllowed(user.role, ['BUYER', 'COMPANY', 'ADMIN'])) {
      return Response.json({ success: false, message: 'Only buyers can access this' }, { status: 403 });
    }

    const tradeOffers = await TradeOffer.find({
      buyerId: user.userId,
      status: { $in: ['ACCEPTED', 'SETTLED', 'COMPLETED'] },
    })
      .populate('sellerId', 'name email')
      .populate('listingId', 'cropType state')
      .sort({ createdAt: -1 });

    const retirements = await RetirementRecord.find({
      retiredBy: user.userId,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    });

    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };

    const totalPurchased = tradeOffers.reduce((sum, offer) => sum + toNumber(offer.creditsRequested), 0);
    const creditsRetired = retirements.reduce((sum, r) => sum + toNumber(r.amount), 0);
    const creditsOwned = Math.max(0, totalPurchased - creditsRetired);
    const totalSpent = tradeOffers.reduce((sum, offer) => sum + toNumber(offer.negotiatedTotalPrice), 0);
    const userDoc = await User.findById(user.userId).lean();
    const creditsRequired = userDoc?.profile?.targetEmissions || userDoc?.profile?.creditsRequired || 5000;

    const rawCompliancePercentage = creditsRequired > 0 ? (creditsRetired / creditsRequired) * 100 : 0;
    const compliancePercentage = Math.max(0, Math.min(100, Math.round(rawCompliancePercentage * 100) / 100));

    return Response.json({
      success: true,
      data: {
        creditsOwned: Math.round(creditsOwned * 100) / 100,
        creditsRetired: Math.round(creditsRetired * 100) / 100,
        totalPurchased: Math.round(totalPurchased * 100) / 100,
        creditsRequired,
        creditsDeficit: Math.max(0, creditsRequired - creditsRetired),
        totalSpent: Math.round(totalSpent),
        compliancePercentage,
        averagePricePerCredit: totalPurchased > 0 ? Math.round((totalSpent / totalPurchased) * 100) / 100 : 0,
        offersCount: tradeOffers.length,
        retirementsCount: retirements.length,
        recentOffers: tradeOffers.slice(0, 5).map((offer) => ({
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
    console.error('Error fetching buyer stats:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch buyer statistics' },
      { status: 500 }
    );
  }
}
