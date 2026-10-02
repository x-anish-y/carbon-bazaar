import connectDB from '@/lib/db/mongodb';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { LandVerificationRepository } from '@/lib/db/landVerificationRepository';
import { calculateMatchPercentage } from '@/lib/utils/landVerification';

/**
 * GET /api/land-verifications/[id]
 * Fetch a specific land verification
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request);
    if (error) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
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

    const verification = await LandVerificationRepository.findById(id);
    if (!verification) {
      return Response.json(
        { success: false, message: 'Verification not found' },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Verification fetched successfully',
        data: verification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching verification:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch verification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/land-verifications/[id]
 * Update a land verification
 */
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['ADMIN']);
    if (error) {
      return Response.json(
        { success: false, message: 'Only admins can update verifications' },
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

    // Check if verification exists
    const existingVerification = await LandVerificationRepository.findById(id);
    if (!existingVerification) {
      return Response.json(
        { success: false, message: 'Verification not found' },
        { status: 404 }
      );
    }

    // Only allow updating specific fields
    const {
      farmerDeclaredData,
      aiObservedData,
      matchPercentage,
      cropTypeMatch,
      landSizeConfidence,
      farmingPracticeMatch,
    } = body;
    const updateData = {};

    if (farmerDeclaredData !== undefined) updateData.farmerDeclaredData = farmerDeclaredData;
    if (aiObservedData !== undefined) updateData.aiObservedData = aiObservedData;

    const shouldCalculateMatchPercentage =
      cropTypeMatch !== undefined ||
      landSizeConfidence !== undefined ||
      farmingPracticeMatch !== undefined;

    if (shouldCalculateMatchPercentage) {
      updateData.matchPercentage = calculateMatchPercentage({
        cropTypeMatch,
        landSizeConfidence,
        farmingPracticeMatch,
      });
    } else if (matchPercentage !== undefined) {
      updateData.matchPercentage = matchPercentage;
    }

    const updatedVerification = await LandVerificationRepository.updateById(id, updateData);

    return Response.json(
      {
        success: true,
        message: 'Verification updated successfully',
        data: updatedVerification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating verification:', error);
    return Response.json(
      { success: false, message: 'Failed to update verification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/land-verifications/[id]
 * Delete a land verification
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['ADMIN']);
    if (error) {
      return Response.json(
        { success: false, message: 'Only admins can delete verifications' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if verification exists
    const existingVerification = await LandVerificationRepository.findById(id);
    if (!existingVerification) {
      return Response.json(
        { success: false, message: 'Verification not found' },
        { status: 404 }
      );
    }

    const deleted = await LandVerificationRepository.deleteById(id);

    if (!deleted) {
      return Response.json(
        { success: false, message: 'Failed to delete verification' },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Verification deleted successfully',
        data: { id },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting verification:', error);
    return Response.json(
      { success: false, message: 'Failed to delete verification' },
      { status: 500 }
    );
  }
}
