import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import CarbonListing from '@/models/CarbonListing';
import { verifyAuthWithRole } from '@/middleware/auth';
import { errorResponse } from '@/lib/utils/response';

/**
 * PATCH /api/admin/listings/:listingId/disable
 * Delist a listing with an admin reason
 */
export async function PATCH(request, { params }) {
  try {
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode || 403 });
    }

    await dbConnect();

    const listingId = params?.listingId;
    if (!listingId) {
      return NextResponse.json(errorResponse('Listing ID is required', 400), { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = String(body?.reason || '').trim();

    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return NextResponse.json(errorResponse('Listing not found', 404), { status: 404 });
    }

    listing.status = 'DELISTED';
    if (reason) {
      listing.adminNotes = reason;
    }

    listing.adminAction = {
      by: user.userId,
      action: 'DELIST',
      timestamp: new Date(),
    };

    await listing.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Listing disabled successfully',
        data: {
          _id: listing._id,
          status: listing.status,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error disabling listing:', err);
    return NextResponse.json(errorResponse('Failed to disable listing', 500), { status: 500 });
  }
}
