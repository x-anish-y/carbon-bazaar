import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CarbonListing from '@/models/CarbonListing';
import { verifyAuthWithRole } from '@/middleware/auth';
import { errorResponse } from '@/lib/utils/response';

/**
 * PATCH /api/admin/listings/:listingId/enable
 * Reactivate a previously delisted listing
 */
export async function PATCH(request, { params }) {
  try {
    const { error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode || 403 });
    }

    await dbConnect();

    const listingId = params?.listingId;
    if (!listingId) {
      return NextResponse.json(errorResponse('Listing ID is required', 400), { status: 400 });
    }

    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return NextResponse.json(errorResponse('Listing not found', 404), { status: 404 });
    }

    listing.status = 'ACTIVE';
    listing.adminAction = {
      action: 'ACTIVATE',
      timestamp: new Date(),
    };

    await listing.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Listing enabled successfully',
        data: {
          _id: listing._id,
          status: listing.status,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error enabling listing:', err);
    return NextResponse.json(errorResponse('Failed to enable listing', 500), { status: 500 });
  }
}
