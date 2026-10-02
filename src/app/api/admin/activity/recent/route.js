import { NextResponse } from 'next/server';
import { verifyAuthWithRole } from '@/middleware/auth';
import Document from '@/models/Document';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';
import LandVerification from '@/models/LandVerification';
import dbConnect from '@/lib/db/mongodb';

/**
 * GET /api/admin/activity/recent
 * Returns aggregated recent activities (KYC submissions, land verifications, listings, registrations)
 */
export async function GET(request) {
  try {
    const auth = verifyAuthWithRole(request, ['ADMIN']);
    if (auth.error) return auth.error;

    await dbConnect();

    const activities = [];

    // 1. Recent KYC submissions
    const recentDocs = await Document.find()
      .populate('userId', 'name email role')
      .sort({ uploadedAt: -1, createdAt: -1 })
      .limit(5)
      .lean();

    recentDocs.forEach((doc) => {
      activities.push({
        id: doc._id.toString(),
        type: 'KYC_DOCUMENT',
        title: `KYC Document Uploaded: ${doc.documentType}`,
        user: doc.userId?.name || doc.userId?.email || 'User',
        role: doc.userId?.role || 'SELLER',
        status: doc.verificationStatus || 'PENDING',
        timestamp: doc.uploadedAt || doc.createdAt,
        icon: '📑',
      });
    });

    // 2. Recent Land verifications
    const recentLand = await LandVerification.find()
      .populate('userId', 'name email')
      .populate('listingId', 'cropType creditsAmount')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentLand.forEach((lv) => {
      activities.push({
        id: lv._id.toString(),
        type: 'LAND_VERIFICATION',
        title: `Land Declaration: ${lv.listingId?.cropType || 'Crop Batch'} (${lv.farmerDeclaredData?.landRegistryNumber || 'Survey Record'})`,
        user: lv.userId?.name || 'Seller',
        role: 'SELLER',
        status: lv.status || 'PENDING',
        timestamp: lv.createdAt,
        icon: '🌾',
      });
    });

    // 3. Recent Carbon Listings
    const recentListings = await CarbonListing.find()
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentListings.forEach((listing) => {
      activities.push({
        id: listing._id.toString(),
        type: 'LISTING_CREATED',
        title: `Carbon Credit Batch Listed: ${listing.cropType} (${listing.creditsAmount} tCO2e)`,
        user: listing.sellerId?.name || 'Seller',
        role: 'SELLER',
        status: listing.status || 'ACTIVE',
        timestamp: listing.createdAt,
        icon: '🌿',
      });
    });

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({
      success: true,
      data: activities.slice(0, 15),
    });
  } catch (error) {
    console.error('Error fetching recent admin activity:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recent activity', error: error.message },
      { status: 500 }
    );
  }
}
