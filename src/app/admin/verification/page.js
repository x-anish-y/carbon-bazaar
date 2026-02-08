'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminVerificationDashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [filterRole, setFilterRole] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus, filterRole]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let url = `/api/documents/verify?status=${filterStatus}`;
      if (filterRole) url += `&role=${filterRole}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId) => {
    if (!confirm('Approve this document?')) return;

    try {
      setProcessingId(docId);
      const response = await fetch(`/api/documents/verify?id=${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: 'APPROVED',
          adminNotes: selectedDoc?.adminNotes || '',
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to approve document');

      setDocuments(documents.filter((d) => d._id !== docId));
      setSelectedDoc(null);
      alert('Document approved successfully');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (docId) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    try {
      setProcessingId(docId);
      const response = await fetch(`/api/documents/verify?id=${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: 'REJECTED',
          rejectionReason,
          adminNotes: selectedDoc?.adminNotes || '',
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to reject document');

      setDocuments(documents.filter((d) => d._id !== docId));
      setSelectedDoc(null);
      alert('Document rejected successfully');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Document Verification Dashboard</h1>
          <p className="text-gray-600 mt-1">Review and approve user documents</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="FARMER">Farmer</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documents List */}
          <div className="lg:col-span-2 space-y-4">
            {documents.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 text-lg">No documents found</p>
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  document={doc}
                  isSelected={selectedDoc?._id === doc._id}
                  onSelect={setSelectedDoc}
                />
              ))
            )}
          </div>

          {/* Detail Panel */}
          {selectedDoc && (
            <div className="lg:col-span-1">
              <DocumentDetailPanel
                document={selectedDoc}
                onApprove={() => handleApprove(selectedDoc._id)}
                onReject={() => handleReject(selectedDoc._id)}
                isProcessing={processingId === selectedDoc._id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Document Card Component
 */
function DocumentCard({ document, isSelected, onSelect }) {
  const statusConfig = {
    PENDING: { color: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-800', badge: '⏳ Pending' },
    APPROVED: { color: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800', badge: '✓ Approved' },
    REJECTED: { color: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-800', badge: '✕ Rejected' },
  };

  const config = statusConfig[document.verificationStatus] || statusConfig.PENDING;

  return (
    <div
      onClick={() => onSelect(document)}
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition border-2 ${
        isSelected ? `border-blue-500 ${config.color}` : `border-transparent hover:shadow-lg`
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{formatDocumentType(document.documentType)}</h3>
          <p className="text-sm text-gray-600 mt-1">Document #: {document.documentNumber}</p>
        </div>
        <span className={`text-xs font-semibold ${config.textColor} bg-white px-3 py-1 rounded-full border`}>
          {config.badge}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <p>
          <span className="font-medium">User:</span> {document.userId?.name} ({document.userId?.role})
        </p>
        <p>
          <span className="font-medium">Email:</span> {document.userId?.email}
        </p>
        <p>
          <span className="font-medium">Uploaded:</span> {formatDate(document.uploadedAt)}
        </p>
      </div>
    </div>
  );
}

/**
 * Document Detail Panel Component
 */
function DocumentDetailPanel({ document, onApprove, onReject, isProcessing }) {
  const [adminNotes, setAdminNotes] = useState(document.adminNotes || '');

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Details</h3>

      {/* User Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">User:</span>
        </p>
        <p className="font-medium text-gray-900">{document.userId?.name}</p>
        <p className="text-sm text-gray-600">{document.userId?.email}</p>
        <p className="text-sm text-gray-600">Role: {document.userId?.role}</p>
      </div>

      {/* Document Details */}
      <div className="space-y-3 mb-6">
        <DetailItem label="Document Type" value={formatDocumentType(document.documentType)} />
        <DetailItem label="Document Number" value={document.documentNumber} />
        <DetailItem label="Status" value={document.verificationStatus} />
        <DetailItem label="Uploaded" value={formatDate(document.uploadedAt)} />
        {document.approvalDate && <DetailItem label="Approved" value={formatDate(document.approvalDate)} />}
        {document.approvedBy && <DetailItem label="Approved By" value={document.approvedBy?.name} />}
      </div>

      {/* Rejection Reason */}
      {document.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-medium text-red-800 mb-1">REJECTION REASON</p>
          <p className="text-sm text-red-700">{document.rejectionReason}</p>
        </div>
      )}

      {/* Admin Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add notes about this verification..."
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          rows="3"
        />
        <p className="text-xs text-gray-500 mt-1">{adminNotes.length}/500</p>
      </div>

      {/* Action Buttons */}
      {document.verificationStatus === 'PENDING' && (
        <div className="space-y-3">
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {isProcessing ? 'Processing...' : '✓ Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {isProcessing ? 'Processing...' : '✕ Reject'}
          </button>
        </div>
      )}

      {document.verificationStatus !== 'PENDING' && (
        <div className="bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg text-center">
          This document has been {document.verificationStatus.toLowerCase()}
        </div>
      )}

      {/* File Preview Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-3">Uploaded File: {document.fileName}</p>
        <p className="text-xs text-gray-500">{(document.fileSize / 1024).toFixed(2)} KB</p>
      </div>
    </div>
  );
}

/**
 * Detail Item Component
 */
function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-600 font-medium">{label}</p>
      <p className="text-sm text-gray-900">{value || 'N/A'}</p>
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
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
