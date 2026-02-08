import connectDB from '@/lib/db/mongodb';
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

    // Fetch flagged listings
    const flaggedListings = await CarbonListing.find({ flagged: true })
      .populate('sellerId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = flaggedListings.map((l) => {
      const seller = l?.sellerId && typeof l.sellerId === 'object' ? l.sellerId : null;
      return {
        ...l,
        sellerName: seller?.name || '—',
        sellerEmail: seller?.email || '—',
        sellerRole: seller?.role || null,
      };
    });

    return Response.json({ 
      count: mapped.length, 
      data: mapped 
    });
  } catch (error) {
    console.error('Error fetching flagged listings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
