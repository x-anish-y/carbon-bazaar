import connectDB from '@/lib/db/mongodb';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { LandVerificationRepository } from '@/lib/db/landVerificationRepository';
import mongoose from 'mongoose';

/**
 * POST /api/land-verifications/[id]/approve
 * Approve a land verification
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['ADMIN']);
    if (error) {
      return Response.json(
        { success: false, message: 'Only admins can approve verifications' },
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
    const { verificationMethod = 'MANUAL_REVIEW', notes = null } = body;

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
        { success: false, message: `Cannot approve a verification with status: ${existingVerification.status}` },
        { status: 400 }
      );
    }

    // Approve the verification
    const approvedVerification = await LandVerificationRepository.approve(
      id,
      mongoose.Types.ObjectId.isValid(user.userId) ? user.userId : null,
      verificationMethod,
      notes
    );

    return Response.json(
      {
        success: true,
        message: 'Verification approved successfully',
        data: approvedVerification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving verification:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to approve verification',
        ...(process.env.NODE_ENV === 'development' ? { details: error?.message || String(error) } : {}),
      },
      { status: 500 }
    );
  }
}
