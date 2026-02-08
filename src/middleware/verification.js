import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Document from '@/models/Document';
import User from '@/models/User';
import { areAllDocumentsVerified, getRequiredDocuments } from '@/validators/verification';

/**
 * Check if user is verified
 * @param {String} userId - User ID
 * @returns {Object} { isVerified, hasPending, hasRejected, documents }
 */
export async function checkUserVerification(userId) {
  try {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return { isVerified: false, hasPending: false, hasRejected: false, documents: [] };
    }

    // ADMIN users are always verified
    if (user.role === 'ADMIN') {
      return { isVerified: true, hasPending: false, hasRejected: false, documents: [] };
    }

    const requiredDocs = getRequiredDocuments(user.role);
    const documents = await Document.find({ userId: userId }).select('-fileData').sort('-uploadedAt');

    // Check if user has all required documents
    const hasAllRequired = documents.length === requiredDocs.length;
    if (!hasAllRequired) {
      return {
        isVerified: false,
        hasPending: true,
        hasRejected: false,
        missingDocuments: requiredDocs.filter(
          (doc) => !documents.some((d) => d.documentType === doc)
        ),
        documents: documents.map((d) => d.toJSON()),
      };
    }

    // Check if all are approved
    const isVerified = areAllDocumentsVerified(documents);
    const hasRejected = documents.some((d) => d.verificationStatus === 'REJECTED');
    const hasPending = documents.some((d) => d.verificationStatus === 'PENDING');

    return {
      isVerified,
      hasPending,
      hasRejected,
      documents: documents.map((d) => d.toJSON()),
    };
  } catch (error) {
    console.error('Verification check error:', error);
    return { isVerified: false, hasPending: false, hasRejected: false, documents: [] };
  }
}

/**
 * Middleware to check verification status on protected routes
 * Can be used with middleware.js
 */
export async function checkVerificationStatus(request, requiredVerification = true) {
  // Extract user from token (you would need to implement token extraction)
  // This is a helper function that can be used in your protected routes

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { verified: false, blocked: false };
  }

  // Token extraction would happen here
  // For now, returning structure
  return { verified: true, blocked: false };
}
