import { NextResponse } from 'next/server';
import { verifyAuthWithRole } from '@/middleware/auth';
import Document from '@/models/Document';
import User from '@/models/User';
import dbConnect from '@/lib/db/mongodb';
import { successResponse, errorResponse } from '@/lib/utils/response';

/**
 * GET /api/admin/verifications
 * Fetch all pending document verifications for admin review
 * Query params: status (PENDING/APPROVED/REJECTED), limit, skip
 */
export async function GET(request) {
  try {
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) return error;

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Fetch documents with user details
    const documents = await Document.find({ verificationStatus: status })
      .populate('userId', 'name email role profile')
      .populate('approvedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Document.countDocuments({ verificationStatus: status });

    return NextResponse.json(
      successResponse('Verifications fetched successfully', {
        documents,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch verifications', 500),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/verifications
 * Approve or reject a document verification
 * Body: { documentId, action ('APPROVE' or 'REJECT'), adminNotes, rejectionReason }
 */
export async function PUT(request) {
  try {
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) return error;

    await dbConnect();

    const body = await request.json();
    const { documentId, action, adminNotes, rejectionReason } = body;

    // Validate inputs
    if (!documentId || !action) {
      return NextResponse.json(
        errorResponse('Document ID and action are required', 400),
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        errorResponse('Action must be APPROVE or REJECT', 400),
        { status: 400 }
      );
    }

    // Find document
    const document = await Document.findById(documentId);
    if (!document) {
      return NextResponse.json(
        errorResponse('Document not found', 404),
        { status: 404 }
      );
    }

    // Check if already verified
    if (document.verificationStatus !== 'PENDING') {
      return NextResponse.json(
        errorResponse(`Document already ${document.verificationStatus.toLowerCase()}`, 409),
        { status: 409 }
      );
    }

    // Update document
    if (action === 'APPROVE') {
      document.verificationStatus = 'APPROVED';
      document.approvedBy = user.userId;
      document.approvalDate = new Date();
    } else {
      document.verificationStatus = 'REJECTED';
      document.rejectionReason = rejectionReason || 'Rejected by admin';
    }

    if (adminNotes) {
      document.adminNotes = adminNotes;
    }

    await document.save();

    // If all documents approved for user, mark user as verified
    if (action === 'APPROVE') {
      const userDoc = await User.findById(document.userId);
      const pendingDocs = await Document.countDocuments({
        userId: document.userId,
        verificationStatus: 'PENDING',
      });

      if (pendingDocs === 0) {
        userDoc.isDocumentsVerified = true;
        await userDoc.save();
      }
    }

    return NextResponse.json(
      successResponse(
        `Document ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
        document
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating verification:', error);
    return NextResponse.json(
      errorResponse('Failed to update verification', 500),
      { status: 500 }
    );
  }
}
