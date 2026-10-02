import { NextResponse } from 'next/server';
import { verifyAuthWithRole } from '@/middleware/auth';
import CarbonListing from '@/models/CarbonListing';
import User from '@/models/User';
import dbConnect from '@/lib/db/mongodb';
import { errorResponse } from '@/lib/utils/response';

/**
 * GET /api/admin/listings
 * Fetch all listings for admin review
 * Query params: status (ACTIVE/SOLD_OUT/DELISTED), sellerType, limit, skip
 */
export async function GET(request) {
  try {
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode || 403 });
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const sellerType = searchParams.get('sellerType');
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (sellerType) filter.sellerType = sellerType;

    // Fetch listings with seller details
    const listings = await CarbonListing.find(filter)
      .populate('sellerId', 'name email role profile')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await CarbonListing.countDocuments(filter);

    const mapped = listings.map((l) => {
      const seller = l?.sellerId && typeof l.sellerId === 'object' ? l.sellerId : null;
      const availableCredits = Number(l?.availableCredits ?? 0);
      return {
        ...l,
        sellerName: seller?.name || '—',
        sellerEmail: seller?.email || '—',
        sellerRole: seller?.role || null,
        isDisabled: String(l?.status || '').toUpperCase() === 'DELISTED',
        // Back-compat for existing admin UI label
        creditsEarned: Number.isFinite(availableCredits) ? availableCredits : 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Listings fetched successfully',
        data: mapped,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch listings', 500),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/listings
 * Update listing status (disable/enable) or add admin notes
 * Body: { listingId, action ('DELIST' or 'ACTIVATE'), adminNotes }
 */
export async function PUT(request) {
  try {
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode || 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { listingId, action, adminNotes } = body;

    // Validate inputs
    if (!listingId || !action) {
      return NextResponse.json(
        errorResponse('Listing ID and action are required', 400),
        { status: 400 }
      );
    }

    if (!['DELIST', 'ACTIVATE'].includes(action)) {
      return NextResponse.json(
        errorResponse('Action must be DELIST or ACTIVATE', 400),
        { status: 400 }
      );
    }

    // Find listing
    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return NextResponse.json(
        errorResponse('Listing not found', 404),
        { status: 404 }
      );
    }

    // Update status
    if (action === 'DELIST') {
      if (listing.status === 'DELISTED') {
        return NextResponse.json(
          errorResponse('Listing is already delisted', 409),
          { status: 409 }
        );
      }
      listing.status = 'DELISTED';
    } else {
      if (listing.status === 'ACTIVE') {
        return NextResponse.json(
          errorResponse('Listing is already active', 409),
          { status: 409 }
        );
      }
      listing.status = 'ACTIVE';
    }

    // Add admin notes if provided
    if (adminNotes) {
      listing.adminNotes = adminNotes;
      listing.adminAction = {
        by: user.userId,
        action,
        timestamp: new Date(),
      };
    }

    await listing.save();

    return NextResponse.json(
      {
        success: true,
        message: `Listing ${action === 'DELIST' ? 'delisted' : 'activated'} successfully`,
        data: listing,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      errorResponse('Failed to update listing', 500),
      { status: 500 }
    );
  }
}
