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

    // Count total listings
    const count = await CarbonListing.countDocuments();

    return Response.json({ count, data: count });
  } catch (error) {
    console.error('Error fetching listings count:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
