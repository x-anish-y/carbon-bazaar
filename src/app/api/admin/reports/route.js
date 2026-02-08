import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import Document from '@/models/Document';
import CarbonListing from '@/models/CarbonListing';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'ADMIN') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get all statistics
    const totalUsers = await User.countDocuments();
    const farmerCount = await User.countDocuments({ role: 'FARMER' });
    const buyerCount = await User.countDocuments({ role: 'BUYER' });
    const companyCount = await User.countDocuments({ role: 'COMPANY' });
    const verifiedUsers = await User.countDocuments({ verified: true });

    const totalListings = await CarbonListing.countDocuments();
    const activeListings = await CarbonListing.countDocuments({ status: 'ACTIVE' });
    const soldListings = await CarbonListing.countDocuments({ status: 'SOLD_OUT' });
    const flaggedListings = await CarbonListing.countDocuments({ flagged: true });

    const totalDocuments = await Document.countDocuments();
    const pendingDocuments = await Document.countDocuments({ verificationStatus: 'PENDING' });
    const approvedDocuments = await Document.countDocuments({ verificationStatus: 'APPROVED' });
    const rejectedDocuments = await Document.countDocuments({ verificationStatus: 'REJECTED' });

    // Get document type breakdown
    const documentsByType = await Document.aggregate([
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get listings by crop type
    const listingsByCrop = await CarbonListing.aggregate([
      {
        $group: {
          _id: '$cropType',
          count: { $sum: 1 },
          totalCredits: { $sum: '$creditsAmount' },
          averagePrice: { $avg: '$pricePerCredit' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get monthly signup trend (last 12 months)
    const monthlySignups = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    // Get total credits available
    const creditsStats = await CarbonListing.aggregate([
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$creditsAmount' },
          availableCredits: { $sum: '$availableCredits' },
          soldCredits: {
            $sum: {
              $subtract: ['$creditsAmount', '$availableCredits'],
            },
          },
        },
      },
    ]);

    const credits = creditsStats[0] || { totalCredits: 0, availableCredits: 0, soldCredits: 0 };

    return Response.json({
      data: {
        summary: {
          totalUsers,
          farmerCount,
          buyerCount,
          companyCount,
          verifiedUsers,
          verificationPercentage: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
        },
        listings: {
          totalListings,
          activeListings,
          soldListings,
          flaggedListings,
        },
        documents: {
          totalDocuments,
          pendingDocuments,
          approvedDocuments,
          rejectedDocuments,
          documentsByType,
        },
        credits: {
          totalCredits: credits.totalCredits || 0,
          availableCredits: credits.availableCredits || 0,
          soldCredits: credits.soldCredits || 0,
        },
        listingsByCrop,
        monthlySignups: monthlySignups.reverse(),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
