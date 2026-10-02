import dbConnect from '@/lib/db/mongodb';
import { verifyAuth, isRoleAllowed } from '@/middleware/auth';
import CarbonListing from '@/models/CarbonListing';
import TradeOffer from '@/models/TradeOffer';
import User from '@/models/User';

/**
 * GET /api/seller/stats
 * Get seller's earnings and listing data
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

    const userData = await User.findById(user.userId);
    const totalEarnings = userData?.totalIncome || 0;

    const listings = await CarbonListing.find({ sellerId: user.userId }).sort({ createdAt: -1 });
    const totalCreditsListed = listings.reduce((sum, listing) => sum + listing.creditsAmount, 0);
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlyOffers = await TradeOffer.find({
      sellerId: user.userId,
      status: { $in: ['ACCEPTED', 'COMPLETED'] },
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1),
      },
    });

    const creditsSoldThisMonth = monthlyOffers.reduce((sum, offer) => sum + offer.creditsRequested, 0);
    const earningsThisMonth = monthlyOffers.reduce((sum, offer) => sum + offer.negotiatedTotalPrice, 0);

    const { getSellerCreditBreakdown, ensureSellerInitialCredits } = await import('@/lib/blockchain/sellerCredits');
    await ensureSellerInitialCredits(userData);
    const breakdown = await getSellerCreditBreakdown(user.userId);

    // Calculate current month market benchmark rate
    const activeListingsWithPrice = await CarbonListing.find({ status: 'ACTIVE' }).select('pricePerCredit').lean();
    const avgMarketRate = activeListingsWithPrice.length > 0
      ? Math.round(activeListingsWithPrice.reduce((sum, l) => sum + (l.pricePerCredit || 1200), 0) / activeListingsWithPrice.length)
      : 1200;

    const recentListings = listings.slice(0, 5);

    return Response.json({
      success: true,
      data: {
        totalCreditsListed: Math.round(totalCreditsListed * 100) / 100,
        availableCreditsOwned: breakdown.totalOwnedInHand,
        currentMarketRate: avgMarketRate || 1200,
        creditsSoldThisMonth: Math.round(creditsSoldThisMonth * 100) / 100,
        earningsThisMonth: Math.round(earningsThisMonth),
        totalEarnings: Math.round(totalEarnings),
        listingsCount: listings.length,
        activeListings: listings.filter((l) => l.status === 'ACTIVE').length,
        soldOutListings: listings.filter((l) => l.status === 'SOLD_OUT').length,
        recentListings: recentListings.map((listing) => ({
          _id: listing._id,
          cropType: listing.cropType,
          creditsAmount: listing.creditsAmount,
          availableCredits: listing.availableCredits,
          pricePerCredit: listing.pricePerCredit,
          createdAt: listing.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching seller stats:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch seller statistics' },
      { status: 500 }
    );
  }
}
