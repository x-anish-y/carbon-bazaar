import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Document from '@/models/Document';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { errorResponse, successResponse } from '@/lib/utils/response';
import {
  documentUploadSchema,
  validateData,
  formatValidationErrors,
  validateFile,
  getRequiredDocuments,
} from '@/validators/verification';

/**
 * POST - Upload document
 * Requires authentication
 */
export async function POST(request) {
  try {
    await connectDB();

    // Verify authentication
    const { user, error } = verifyAuth(request);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const documentType = formData.get('documentType');
    const documentNumber = formData.get('documentNumber');

    // Validate input
    const { error: validationError, value } = validateData(
      { documentType, documentNumber },
      documentUploadSchema
    );

    if (validationError) {
      const errors = formatValidationErrors(validationError);
      return NextResponse.json(
        errorResponse('Validation failed', 400, errors),
        { status: 400 }
      );
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        errorResponse('File is required', 400),
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const fileValidation = validateFile({
      size: buffer.byteLength,
      type: file.type,
    });

    if (!fileValidation.isValid) {
      return NextResponse.json(
        errorResponse(fileValidation.error, 400),
        { status: 400 }
      );
    }

    // Check if user role matches document type
    const userDoc = await User.findById(user.userId);
    const requiredDocs = getRequiredDocuments(userDoc.role);

    if (!requiredDocs.includes(documentType)) {
      return NextResponse.json(
        errorResponse(`Document type ${documentType} not allowed for ${userDoc.role} users`, 403),
        { status: 403 }
      );
    }

    // Create document
    const document = new Document({
      userId: user.userId,
      documentType: value.documentType,
      documentNumber: value.documentNumber,
      fileName: file.name,
      fileSize: buffer.byteLength,
      mimeType: file.type,
      fileData: Buffer.from(buffer),
      verificationStatus: 'PENDING',
    });

    await document.save();

    return NextResponse.json(
      successResponse(document.toJSON(), 'Document uploaded successfully', 201),
      { status: 201 }
    );
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while uploading document', 500),
      { status: 500 }
    );
  }
}

/**
 * GET - Get user's documents
 * Returns metadata only (not file data)
 */
export async function GET(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuth(request);
    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type');

    // Build query
    const query = { userId: user.userId };
    if (documentType) {
      query.documentType = documentType;
    }

    const documents = await Document.find(query)
      .select('-fileData')
      .sort('-uploadedAt');

    return NextResponse.json(
      successResponse(documents, 'Documents retrieved successfully', 200),
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
 * PUT - Update document (only if rejected)
 */
export async function PUT(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuth(request);
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

    // Find document
    const document = await Document.findById(docId);

    if (!document) {
      return NextResponse.json(
        errorResponse('Document not found', 404),
        { status: 404 }
      );
    }

    // Verify ownership
    if (document.userId.toString() !== user.userId) {
      return NextResponse.json(
        errorResponse('Not authorized to update this document', 403),
        { status: 403 }
      );
    }

    // Can only update rejected documents
    if (document.verificationStatus !== 'REJECTED') {
      return NextResponse.json(
        errorResponse('Can only update rejected documents', 400),
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        errorResponse('File is required', 400),
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const fileValidation = validateFile({
      size: buffer.byteLength,
      type: file.type,
    });

    if (!fileValidation.isValid) {
      return NextResponse.json(
        errorResponse(fileValidation.error, 400),
        { status: 400 }
      );
    }

    // Update document
    document.fileName = file.name;
    document.fileSize = buffer.byteLength;
    document.mimeType = file.type;
    document.fileData = Buffer.from(buffer);
    document.verificationStatus = 'PENDING';
    document.rejectionReason = null;
    document.adminNotes = null;
    document.approvedBy = null;
    document.approvalDate = null;

    await document.save();

    return NextResponse.json(
      successResponse(document.toJSON(), 'Document updated successfully', 200),
      { status: 200 }
    );
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while updating document', 500),
      { status: 500 }
    );
  }
}
