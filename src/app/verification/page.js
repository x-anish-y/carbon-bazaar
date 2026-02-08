'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VerificationPendingPage() {
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/verify?action=status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }

      const data = await response.json();
      setVerificationStatus(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Verification status error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  // If verified, redirect to dashboard
  if (verificationStatus?.isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Complete!</h1>
          <p className="text-gray-600 mb-6">Your documents have been verified. You can now access the full platform.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Show pending/rejected status
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Verification Required</h1>
          <p className="text-gray-600">Please upload your government documents to continue</p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-6 mb-8">
          {/* Overall Status */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Verification Status</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {verificationStatus?.hasPending
                    ? '⏳ Your documents are pending review'
                    : '⚠️ Some documents are rejected. Please resubmit.'}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Status */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Your Documents</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {verificationStatus?.documents?.length > 0 ? (
                verificationStatus.documents.map((doc) => (
                  <DocumentStatusRow key={doc._id} document={doc} />
                ))
              ) : (
                <div className="px-6 py-4 text-center text-gray-500">No documents uploaded</div>
              )}
            </div>
          </div>

          {/* Missing Documents Alert */}
          {verificationStatus?.missingDocuments && verificationStatus.missingDocuments.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <h3 className="text-sm font-medium text-red-800 mb-2">Missing Required Documents:</h3>
              <ul className="list-disc list-inside text-sm text-red-700">
                {verificationStatus.missingDocuments.map((doc) => (
                  <li key={doc}>{formatDocumentType(doc)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex justify-center">
          <Link
            href="/verification/upload"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition shadow-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Documents
          </Link>
        </div>

        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How Verification Works</h3>
          <ol className="text-sm text-blue-800 space-y-2">
            <li>
              <span className="font-semibold">1. Upload:</span> Upload your required documents
            </li>
            <li>
              <span className="font-semibold">2. Review:</span> Our team reviews your documents (usually within 24-48 hours)
            </li>
            <li>
              <span className="font-semibold">3. Approval:</span> Once approved, you can access all features
            </li>
          </ol>
          <p className="text-xs text-blue-700 mt-4">
            * If a document is rejected, you can resubmit an updated version. Check your email for the rejection reason.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Document Status Row Component
 */
function DocumentStatusRow({ document }) {
  const statusConfig = {
    PENDING: { color: 'bg-yellow-50', textColor: 'text-yellow-800', badge: '⏳ Pending', icon: '🔄' },
    APPROVED: { color: 'bg-green-50', textColor: 'text-green-800', badge: '✓ Approved', icon: '✅' },
    REJECTED: { color: 'bg-red-50', textColor: 'text-red-800', badge: '✕ Rejected', icon: '❌' },
  };

  const config = statusConfig[document.verificationStatus] || statusConfig.PENDING;

  return (
    <div className={`px-6 py-4 ${config.color}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{config.icon}</span>
            <h4 className="font-medium text-gray-900">{formatDocumentType(document.documentType)}</h4>
            <span className={`text-xs font-semibold ${config.textColor} bg-white px-2 py-1 rounded`}>
              {config.badge}
            </span>
          </div>
          <p className="text-sm text-gray-600">Document #: {document.documentNumber}</p>
          <p className="text-xs text-gray-500 mt-1">Uploaded: {formatDate(document.uploadedAt)}</p>

          {document.rejectionReason && (
            <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
              <span className="font-semibold">Rejection Reason: </span>
              {document.rejectionReason}
            </div>
          )}

          {document.adminNotes && (
            <div className="mt-2 p-3 bg-blue-100 border border-blue-300 rounded text-sm text-blue-700">
              <span className="font-semibold">Admin Notes: </span>
              {document.adminNotes}
            </div>
          )}
        </div>

        {document.verificationStatus === 'REJECTED' && (
          <button
            onClick={() => {
              // Handle resubmit
              window.location.href = `/verification/resubmit/${document._id}`;
            }}
            className="ml-4 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition flex-shrink-0"
          >
            Resubmit
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Format document type for display
 */
function formatDocumentType(type) {
  const typeMap = {
    AADHAAR: 'Aadhaar Card',
    LAND_RECORD: 'Land Record',
    PAN: 'PAN Certificate',
    GST_CERTIFICATE: 'GST Certificate',
  };
  return typeMap[type] || type;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}
