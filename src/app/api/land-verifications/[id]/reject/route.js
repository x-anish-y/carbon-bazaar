import connectDB from '@/lib/db/mongodb';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { LandVerificationRepository } from '@/lib/db/landVerificationRepository';
import mongoose from 'mongoose';

/**
 * POST /api/land-verifications/[id]/reject
 * Reject a land verification
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['ADMIN']);
    if (error) {
      return Response.json(
        { success: false, message: 'Only admins can reject verifications' },
        { status: 403 }
      );
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams || {};

    if (!id) {
      return Response.json(
        { success: false, message: 'Verification id is required' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { reason, verificationMethod = 'MANUAL_REVIEW', notes = null } = body;
    const finalReason = reason && reason.trim() ? reason.trim() : 'Rejected';

    // Check if verification exists
    const existingVerification = await LandVerificationRepository.findById(id);
    if (!existingVerification) {
      return Response.json(
        { success: false, message: 'Verification not found' },
        { status: 404 }
      );
    }

    // Check if already approved or rejected
    if (existingVerification.status !== 'PENDING') {
      return Response.json(
        { success: false, message: `Cannot reject a verification with status: ${existingVerification.status}` },
        { status: 400 }
      );
    }

    // Reject the verification
    const rejectedVerification = await LandVerificationRepository.reject(
      id,
      finalReason,
      mongoose.Types.ObjectId.isValid(user.userId) ? user.userId : null,
      verificationMethod,
      notes
    );

    return Response.json(
      {
        success: true,
        message: 'Verification rejected successfully',
        data: rejectedVerification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to reject verification',
        ...(process.env.NODE_ENV === 'development' ? { details: error?.message || String(error) } : {}),
      },
      { status: 500 }
    );
  }
}
