'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export default function ResubmitDocumentPage() {
  const params = useParams();
  const documentId = params.id;

  const [document, setDocument] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch document details
  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/upload', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      const doc = data.data.find((d) => d._id === documentId);

      if (!doc) {
        setError('Document not found');
        return;
      }

      if (doc.verificationStatus !== 'REJECTED') {
        setError('This document cannot be resubmitted (only rejected documents can be resubmitted)');
        return;
      }

      setDocument(doc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles[0]) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size must be less than 5MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError(`Invalid file type. Only PDF, JPEG, and PNG files are allowed.`);
      return;
    }

    setFile(selectedFile);
    setSuccess(null);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/documents/upload?id=${documentId}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Resubmit failed');
      }

      setSuccess('Document resubmitted successfully! It will be reviewed again.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/verification';
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0-12a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/verification" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
            Back to Verification
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 border border-zinc-300 bg-white px-3 py-1.5 rounded-lg transition hover:bg-zinc-50">
              ← Back to Dashboard
            </Link>
            <Link href="/verification" className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition">
              ← Back to Verification Status
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resubmit Your Document</h1>
          <p className="text-gray-600">Your document was rejected. Please review the reason and submit a corrected version.</p>
        </div>

        {/* Document Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{formatDocumentType(document.documentType)}</h3>
              <p className="text-sm text-gray-600">Document #: {document.documentNumber}</p>
              <p className="text-xs text-gray-500 mt-1">Originally uploaded: {formatDate(document.uploadedAt)}</p>
            </div>
            <span className="text-3xl">❌</span>
          </div>

          {/* Rejection Reason */}
          {document.rejectionReason && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Rejection Reason</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{document.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Document <span className="text-red-500">*</span>
              </label>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  id="fileInput"
                />

                {file ? (
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <FileIcon fileName={file.name} />
                    </div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-4-4m0 0l-4 4m4-4v12"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-gray-900 font-medium">Drag and drop your corrected document</p>
                    <p className="text-gray-600 text-sm">or</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Browse files
                    </button>
                  </>
                )}

                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>✓ Supported formats: PDF, JPEG, PNG</p>
                  <p>✓ Maximum file size: 5 MB</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={uploading || !file}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                  uploading || !file ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⌛</span> Uploading...
                  </span>
                ) : (
                  'Resubmit Document'
                )}
              </button>
              <Link
                href="/verification"
                className="flex-1 py-3 px-4 rounded-lg font-medium text-center border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Tips Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Tips to Avoid Rejection</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>✓ Ensure the document is clear and readable</li>
            <li>✓ All four corners of the document must be visible</li>
            <li>✓ No glare or shadows on the document</li>
            <li>✓ Document number must match the file you're uploading</li>
            <li>✓ Use good lighting when photographing documents</li>
            <li>✓ File size must be under 5MB</li>
            <li>✓ Ensure document is not expired (if applicable)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * File Icon Component
 */
function FileIcon({ fileName }) {
  const ext = fileName.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    return (
      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
        <span className="text-2xl font-bold text-red-600">PDF</span>
      </div>
    );
  }

  if (['jpg', 'jpeg', 'png'].includes(ext)) {
    return (
      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      </svg>
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
