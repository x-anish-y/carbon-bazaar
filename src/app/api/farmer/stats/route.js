import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import CarbonListing from '@/models/CarbonListing';
import TradeOffer from '@/models/TradeOffer';
import User from '@/models/User';

/**
 * GET /api/farmer/stats
 * Get farmer's earnings and listing data
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

    // Get farmer's user data to fetch totalIncome
    const userData = await User.findById(user.userId);
    const totalEarnings = userData?.totalIncome || 0;

    // Get all listings for this farmer
    const listings = await CarbonListing.find({ sellerId: user.userId }).sort({ createdAt: -1 });

    // Calculate stats
    const totalCreditsListed = listings.reduce((sum, listing) => sum + listing.creditsAmount, 0);
    
    // Get current month's accepted offers
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

    // Get recent listings for "Recent Activity"
    const recentListings = listings.slice(0, 5);

    return Response.json({
      success: true,
      data: {
        totalCreditsListed: Math.round(totalCreditsListed * 100) / 100,
        creditsSoldThisMonth: Math.round(creditsSoldThisMonth * 100) / 100,
        earningsThisMonth: Math.round(earningsThisMonth),
        totalEarnings: Math.round(totalEarnings),
        listingsCount: listings.length,
        activeListings: listings.filter(l => l.status === 'ACTIVE').length,
        soldOutListings: listings.filter(l => l.status === 'SOLD_OUT').length,
        recentListings: recentListings.map(listing => ({
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
    console.error('Error fetching farmer stats:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch farmer statistics' },
      { status: 500 }
    );
  }
}
