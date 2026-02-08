import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get count of all users
    if (action === 'count') {
      const count = await User.countDocuments();
      return Response.json({ count, data: count });
    }

    // Get all users with stats
    const users = await User.find()
      .select('name email role createdAt phone state district verified')
      .sort({ createdAt: -1 })
      .lean();

    // Optionally add user stats (verification status, listings, etc)
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const Document = (await import('@/models/Document')).default;
        const CarbonListing = (await import('@/models/CarbonListing')).default;

        const docCount = await Document.countDocuments({ userId: user._id });
        const listingCount = await CarbonListing.countDocuments({ sellerId: user._id });

        const approvedDocs = await Document.countDocuments({ userId: user._id, verificationStatus: 'APPROVED' });
        const pendingDocs = await Document.countDocuments({ userId: user._id, verificationStatus: 'PENDING' });
        const rejectedDocs = await Document.countDocuments({ userId: user._id, verificationStatus: 'REJECTED' });

        let trustStatus = 'PENDING';
        if (rejectedDocs > 0) trustStatus = 'CONFLICTED';
        else if (user.verified === true || (docCount > 0 && pendingDocs === 0 && approvedDocs === docCount)) {
          trustStatus = 'TRUSTED';
        }

        return {
          ...user,
          stats: {
            documents: docCount,
            verifiedDocuments: approvedDocs,
            pendingDocuments: pendingDocs,
            rejectedDocuments: rejectedDocs,
            listings: listingCount,
          },
          trustStatus,
        };
      })
    );

    return Response.json({ data: usersWithStats });
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
