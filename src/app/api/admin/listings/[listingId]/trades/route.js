import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuthWithRole } from '@/middleware/auth';
import TradeOffer from '@/models/TradeOffer';
import User from '@/models/User';
import { errorResponse } from '@/lib/utils/response';

/**
 * GET /api/admin/listings/:listingId/trades
 * Trade history for a listing
 */
export async function GET(request, { params }) {
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

    const trades = await TradeOffer.find({ listingId })
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const mapped = trades.map((t) => ({
      buyerName: t?.buyerId?.name || '—',
      buyerEmail: t?.buyerId?.email || '—',
      status: String(t?.status || '').toLowerCase(),
      creditsRequested: t?.creditsRequested || 0,
      pricePerCredit: t?.negotiatedPricePerCredit || t?.originalPricePerCredit || 0,
      createdAt: t?.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        message: 'Trades fetched successfully',
        data: mapped,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error fetching listing trades:', err);
    return NextResponse.json(errorResponse('Failed to fetch trades', 500), { status: 500 });
  }
}
