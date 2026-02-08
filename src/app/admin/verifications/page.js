'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminVerificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('farmer');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [fileModal, setFileModal] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user profile
        const userResponse = await fetch('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!userResponse.ok) {
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();

        // Check if user is admin
        if (userData.data.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        setUser(userData.data);

        // Fetch pending verifications (documents)
        const verifyResponse = await fetch('/api/documents/verify?status=PENDING', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('Verification response data:', verifyData);
          setDocuments(verifyData.data || []);
        } else {
          console.error('Verification response not ok:', verifyResponse.status);
          const errData = await verifyResponse.json();
          console.error('Error data:', errData);
        }
      } catch (err) {
        console.error('Error fetching verifications:', err);
        setError('Failed to load verifications');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleApprove = async (docId) => {
    const token = localStorage.getItem('token');
    setProcessing(true);

    try {
      const response = await fetch(`/api/documents/verify?id=${docId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationStatus: 'APPROVED',
          adminNotes: 'Document verified and approved',
        }),
      });

      if (response.ok) {
        // Remove from list
        setDocuments(documents.filter((d) => d._id !== docId));
        setSelectedDoc(null);
        setError('');
        alert('Document approved successfully');
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to approve document');
      }
    } catch (err) {
      console.error('Error approving:', err);
      setError('Error approving document');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const token = localStorage.getItem('token');

    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`/api/documents/verify?id=${selectedDoc.documents[0]._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          verificationStatus: 'REJECTED',
          rejectionReason: rejectReason,
          adminNotes: rejectReason,
        }),
      });

      if (response.ok) {
        // Remove from list
        setDocuments(documents.filter((d) => d.userId._id !== selectedDoc.userId));
        setSelectedDoc(null);
        setShowRejectModal(false);
        setRejectReason('');
        setError('');
        alert('Document rejected successfully');
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to reject document');
      }
    } catch (err) {
      console.error('Error rejecting:', err);
      setError('Error rejecting document');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewFile = async (doc) => {
    setFileModal({
      loading: true,
      doc: doc,
      error: null,
      data: null,
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/verify?status=PENDING&includeFile=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const foundDoc = data.data.find(d => d._id === doc._id);
        if (foundDoc && foundDoc.fileData) {
          setFileModal({
            loading: false,
            doc: doc,
            error: null,
            data: foundDoc.fileData,
          });
        } else {
          setFileModal({
            loading: false,
            doc: doc,
            error: 'File data not found',
            data: null,
          });
        }
      } else {
        setFileModal({
          loading: false,
          doc: doc,
          error: 'Failed to load file',
          data: null,
        });
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setFileModal({
        loading: false,
        doc: doc,
        error: 'Error loading file',
        data: null,
      });
    }
  };

  // Group documents by user
  const docsByUser = {};
  documents.forEach((doc) => {
    // Skip documents without userId
    if (!doc.userId) return;
    
    const userId = doc.userId._id;
    if (!docsByUser[userId]) {
      docsByUser[userId] = {
        userId,
        userName: doc.userId.name,
        userEmail: doc.userId.email,
        userRole: doc.userId.role,
        documents: [],
      };
    }
    docsByUser[userId].documents.push(doc);
  });

  const userVerifications = Object.values(docsByUser);
  const filteredVerifications = userVerifications.filter(
    (v) => v.userRole === (activeTab === 'farmer' ? 'FARMER' : 'COMPANY')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading verifications...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-4">Access Denied</p>
          <button onClick={() => router.push('/admin/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded">
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Verify Users</h1>
              <p className="text-gray-600 mt-1">Review KYC documents and approve/reject accounts</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - List */}
          <div className="lg:col-span-1">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 bg-white rounded border border-gray-200">
              <button
                onClick={() => setActiveTab('farmer')}
                className={`flex-1 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'farmer'
                    ? 'border-green-600 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                👨‍🌾 Farmers ({userVerifications.filter((v) => v.userRole === 'FARMER').length})
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`flex-1 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'company'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                🏢 Companies ({userVerifications.filter((v) => v.userRole === 'COMPANY').length})
              </button>
            </div>

            {/* Verification List */}
            <div className="bg-white rounded border border-gray-200">
              {filteredVerifications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-3xl mb-2">✨</p>
                  <p className="text-gray-600">No pending verifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredVerifications.map((verification) => (
                    <button
                      key={verification.userId}
                      onClick={() => setSelectedDoc(verification)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                        selectedDoc?.userId === verification.userId
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-transparent'
                      }`}
                    >
                      <p className="font-bold text-gray-900">{verification.userName}</p>
                      <p className="text-xs text-gray-600">{verification.userEmail}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        📄 {verification.documents.length} document{verification.documents.length !== 1 ? 's' : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2">
            {selectedDoc ? (
              <div className="bg-white rounded border border-gray-200 p-6">
                {/* User Info */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {selectedDoc.userRole === 'FARMER' ? '👨‍🌾' : '🏢'} {selectedDoc.userName}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 font-medium">Email</p>
                      <p className="text-gray-900">{selectedDoc.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">Role</p>
                      <p className="text-gray-900">{selectedDoc.userRole}</p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">Documents for Verification</h3>
                  <div className="space-y-3">
                    {selectedDoc.documents && selectedDoc.documents.length > 0 ? (
                      selectedDoc.documents.map((doc) => (
                        <div key={doc._id} className="p-4 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-gray-900">{doc.documentType}</p>
                              <p className="text-sm text-gray-600">Doc #: {doc.documentNumber}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                📅 Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                              ⏳ Pending
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">File: {doc.fileName}</p>
                          <button
                            onClick={() => handleViewFile(doc)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            👁️ View File
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 text-sm">No documents uploaded</p>
                    )}
                  </div>
                </div>

                {/* Document Requirements Info */}
                <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium mb-2">📋 Required Documents</p>
                  {selectedDoc.userRole === 'FARMER' ? (
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>✓ Aadhaar Card (ID proof)</li>
                      <li>✓ Land Record Document (Ownership proof)</li>
                    </ul>
                  ) : (
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>✓ PAN Certificate (Tax ID)</li>
                      <li>✓ GST Certificate (Business registration)</li>
                    </ul>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedDoc.documents[0]._id)}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {processing ? '⏳ Processing...' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded border border-gray-200 p-12 text-center">
                <p className="text-3xl mb-4">👆</p>
                <p className="text-gray-600">Select a user from the list to review their documents</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject {selectedDoc?.userName}?</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Documents are unclear, Missing required documents, Suspicious activity..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-600 mt-1">This reason will be sent to the user</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-medium"
              >
                {processing ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {fileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                📄 {fileModal.doc.fileName}
              </h3>
              <button
                onClick={() => setFileModal(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {fileModal.loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">Loading file...</p>
              </div>
            ) : fileModal.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">{fileModal.error}</p>
              </div>
            ) : fileModal.data ? (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    File Type: <span className="font-medium">{fileModal.doc.mimeType}</span>
                  </p>
                  {(() => {
                    let base64Data = '';
                    
                    // Handle MongoDB Buffer serialization (comes as {type: 'Buffer', data: [...]})
                    if (typeof fileModal.data === 'object' && fileModal.data.type === 'Buffer' && Array.isArray(fileModal.data.data)) {
                      const bytes = new Uint8Array(fileModal.data.data);
                      const binary = String.fromCharCode.apply(null, bytes);
                      base64Data = btoa(binary);
                    } else if (typeof fileModal.data === 'string') {
                      // Already base64 string
                      base64Data = fileModal.data;
                    } else if (fileModal.data instanceof Uint8Array) {
                      // Binary data as Uint8Array
                      const binary = String.fromCharCode.apply(null, fileModal.data);
                      base64Data = btoa(binary);
                    }
                    
                    const dataUrl = `data:${fileModal.doc.mimeType};base64,${base64Data}`;
                    
                    return fileModal.doc.mimeType.startsWith('image/') ? (
                      <img 
                        src={dataUrl}
                        alt={fileModal.doc.fileName}
                        className="max-w-full h-auto rounded"
                      />
                    ) : (
                      <div className="p-4 bg-white rounded border border-gray-200 text-center">
                        <p className="text-gray-600 mb-3">📎 {fileModal.doc.fileName}</p>
                        <a
                          href={dataUrl}
                          download={fileModal.doc.fileName}
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          ⬇️ Download File
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => setFileModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
