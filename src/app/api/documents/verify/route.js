import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Document from '@/models/Document';
import User from '@/models/User';
import { verifyAuthWithRole, verifyAuth } from '@/middleware/auth';
import { errorResponse, successResponse } from '@/lib/utils/response';
import {
  adminVerificationSchema,
  validateData,
  formatValidationErrors,
} from '@/validators/verification';

/**
 * GET - Get documents for verification (admin) or verification status (user)
 */
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Check if user is requesting their own verification status
    if (action === 'status') {
      const { user, error } = verifyAuth(request);
      if (error) {
        return NextResponse.json(error, { status: error.statusCode });
      }

      // Get user's verification status
      const documents = await Document.find({ userId: user.userId })
        .select('-fileData')
        .sort('-uploadedAt');

      const allApproved = documents.length > 0 && documents.every((d) => d.verificationStatus === 'APPROVED');
      const hasRejected = documents.some((d) => d.verificationStatus === 'REJECTED');
      const hasPending = documents.some((d) => d.verificationStatus === 'PENDING');

      return NextResponse.json(
        successResponse(
          {
            isVerified: allApproved,
            hasPending,
            hasRejected,
            documents: documents.map((d) => d.toJSON()),
          },
          'Verification status retrieved',
          200
        ),
        { status: 200 }
      );
    }

    // Admin only: Get all pending documents for verification
    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    const status = searchParams.get('status') || 'PENDING';
    const role = searchParams.get('role');
    const includeFile = searchParams.get('includeFile') === 'true';

    // Build query
    const query = { verificationStatus: status };

    // Get documents (with or without file data)
    let documents = await Document.find(query)
      .select(includeFile ? '' : '-fileData')
      .sort('-uploadedAt')
      .lean();

    console.log('Documents found (raw):', documents.length);
    
    // Manually populate userId by fetching user data
    const documentsWithUser = [];
    for (const doc of documents) {
      try {
        let userInfo = null;
        if (doc.userId) {
          userInfo = await User.findById(doc.userId).select('name email role').lean();
          console.log('Fetched user for doc:', doc._id, 'user:', userInfo);
        }
        documentsWithUser.push({
          ...doc,
          userId: userInfo,
        });
      } catch (err) {
        console.error('Error populating user for doc:', doc._id, err.message);
        documentsWithUser.push(doc);
      }
    }

    console.log('Documents with user populated:', documentsWithUser.length);
    
    // Filter by role if specified
    let filtered = documentsWithUser;
    if (role) {
      filtered = documentsWithUser.filter((doc) => doc.userId && doc.userId.role === role);
      console.log('Documents after role filter:', filtered.length);
    }

    return NextResponse.json(
      successResponse(filtered, 'Pending documents retrieved successfully', 200),
      { status: 200 }
    );
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while fetching documents', 500),
      { status: 500 }
    );
  }
}

/**
 * POST - Verify/approve a document (admin only)
 */
export async function POST(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRole(request, ['ADMIN']);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');

    if (!docId) {
      return NextResponse.json(
        errorResponse('Document ID is required', 400),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { error: validationError, value } = validateData(body, adminVerificationSchema);

    if (validationError) {
      const errors = formatValidationErrors(validationError);
      return NextResponse.json(
        errorResponse('Validation failed', 400, errors),
        { status: 400 }
      );
    }

    // Find document
    const document = await Document.findById(docId);

    if (!document) {
      return NextResponse.json(
        errorResponse('Document not found', 404),
        { status: 404 }
      );
    }

    // Can only verify pending documents
    if (document.verificationStatus !== 'PENDING') {
      return NextResponse.json(
        errorResponse('Only pending documents can be verified', 400),
        { status: 400 }
      );
    }

    // Update document
    document.verificationStatus = value.verificationStatus;
    document.adminNotes = value.adminNotes || null;
    // Only set approvedBy if user is not admin (admin users have userId as 'admin' string, not ObjectId)
    if (user.userId !== 'admin') {
      document.approvedBy = user.userId;
    }
    document.approvalDate = new Date();

    if (value.verificationStatus === 'REJECTED') {
      document.rejectionReason = value.rejectionReason;
    }

    await document.save();

    // Check if all documents for this user are now approved
    if (value.verificationStatus === 'APPROVED') {
      const allUserDocs = await Document.find({ userId: document.userId });
      const allApproved = allUserDocs.every((d) => d.verificationStatus === 'APPROVED');
      
      if (allApproved) {
        // Mark user as verified
        await User.findByIdAndUpdate(document.userId, { verified: true });
        console.log('User verified:', document.userId);
      }
    }

    // Fetch updated document with populated references
    const updatedDoc = await Document.findById(docId).select('-fileData').lean();
    
    // Manually populate userId and approvedBy
    if (updatedDoc.userId) {
      updatedDoc.userId = await User.findById(updatedDoc.userId).select('name email role').lean();
    }
    if (updatedDoc.approvedBy) {
      updatedDoc.approvedBy = await User.findById(updatedDoc.approvedBy).select('name email').lean();
    }

    return NextResponse.json(
      successResponse(
        updatedDoc,
        `Document ${value.verificationStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully`,
        200
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Document verification error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while verifying document', 500),
      { status: 500 }
    );
  }
}
