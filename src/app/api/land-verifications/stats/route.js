import connectDB from '@/lib/db/mongodb';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { LandVerificationRepository } from '@/lib/db/landVerificationRepository';

/**
 * GET /api/land-verifications/stats
 * Get verification statistics
 */
export async function GET(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['ADMIN']);
    if (error) {
      return Response.json(
        { success: false, message: 'Only admins can view statistics' },
        { status: 403 }
      );
    }

    const stats = await LandVerificationRepository.getStatistics();

    return Response.json(
      {
        success: true,
        message: 'Verification statistics fetched successfully',
        data: stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
