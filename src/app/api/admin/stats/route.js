import { NextResponse } from 'next/server';
import { verifyAuthWithRole } from '@/middleware/auth';
import Document from '@/models/Document';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';
import dbConnect from '@/lib/db/mongodb';
import { successResponse, errorResponse } from '@/lib/utils/response';

/**
 * GET /api/admin/stats
 * Fetch dashboard statistics for admin overview
 */
export async function GET(request) {
  try {
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) return error;

    await dbConnect();

    // Get verification stats
    const pendingVerifications = await Document.countDocuments({
      verificationStatus: 'PENDING',
    });
    const approvedVerifications = await Document.countDocuments({
      verificationStatus: 'APPROVED',
    });
    const rejectedVerifications = await Document.countDocuments({
      verificationStatus: 'REJECTED',
    });

    // Get user stats
    const totalUsers = await User.countDocuments();
    const farmerCount = await User.countDocuments({ role: 'FARMER' });
    const companyCount = await User.countDocuments({ role: 'COMPANY' });
    const verifiedUsers = await User.countDocuments({ isDocumentsVerified: true });

    // Get listing stats
    const totalListings = await CarbonListing.countDocuments();
    const activeListings = await CarbonListing.countDocuments({ status: 'ACTIVE' });
    const delistedListings = await CarbonListing.countDocuments({ status: 'DELISTED' });
    const soldOutListings = await CarbonListing.countDocuments({ status: 'SOLD_OUT' });

    // Get recent activity
    const recentPendingDocs = await Document.find({
      verificationStatus: 'PENDING',
    })
      .populate('userId', 'name email')
      .sort({ uploadedAt: -1 })
      .limit(5)
      .lean();

    const recentListings = await CarbonListing.find()
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json(
      successResponse('Dashboard stats fetched successfully', {
        verifications: {
          pending: pendingVerifications,
          approved: approvedVerifications,
          rejected: rejectedVerifications,
        },
        users: {
          total: totalUsers,
          farmers: farmerCount,
          companies: companyCount,
          verified: verifiedUsers,
        },
        listings: {
          total: totalListings,
          active: activeListings,
          delisted: delistedListings,
          soldOut: soldOutListings,
        },
        recentActivity: {
          pendingVerifications: recentPendingDocs,
          recentListings,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch stats', 500),
      { status: 500 }
    );
  }
}
