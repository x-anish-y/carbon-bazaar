'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
        const userResponse = await fetch('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!userResponse.ok) {
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();

        if (userData.data.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        setUser(userData.data);

        const verifyResponse = await fetch('/api/documents/verify?status=PENDING', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          setDocuments(verifyData.data || []);
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
          adminNotes: 'Document verified and approved by admin desk',
        }),
      });

      if (response.ok) {
        setDocuments(documents.filter((d) => d._id !== docId));
        setSelectedDoc(null);
        setError('');
        alert('✅ Document approved successfully!');
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
        const foundDoc = data.data.find((d) => d._id === doc._id);
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
            error: 'File preview not available',
            data: null,
          });
        }
      } else {
        setFileModal({
          loading: false,
          doc: doc,
          error: 'Failed to fetch document file',
          data: null,
        });
      }
    } catch (err) {
      setFileModal({
        loading: false,
        doc: doc,
        error: err.message,
        data: null,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading KYC verification desk...</p>
        </div>
      </div>
    );
  }

  // Group documents by user
  const groupedDocs = documents.reduce((acc, doc) => {
    const userId = doc.userId?._id || doc.userId;
    if (!acc[userId]) {
      acc[userId] = {
        userId: userId,
        user: doc.userId,
        documents: [],
      };
    }
    acc[userId].documents.push(doc);
    return acc;
  }, {});

  const sellerGroups = Object.values(groupedDocs).filter((g) => g.user?.role === 'SELLER' || g.user?.role === 'FARMER');
  const buyerGroups = Object.values(groupedDocs).filter((g) => g.user?.role === 'BUYER' || g.user?.role === 'COMPANY');
  const currentGroups = activeTab === 'seller' ? sellerGroups : buyerGroups;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B1F17] flex items-center justify-center text-white">
                <span className="text-sm">🛡️</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              KYC Document Desk
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="btn-pill btn-pill-ghost text-xs !py-2 !px-4">
              ← Admin Dashboard
            </Link>
            <Link href="/admin/land-verifications" className="btn-pill bg-[#1B4332]/10 text-[#1B4332] text-xs !py-2 !px-4 font-semibold">
              Land Queue
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
              User Identity & KYC Verification
            </h1>
            <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
              Review government identity documents (Aadhaar, PAN, Land Records, GST) to authenticate seller and enterprise buyer accounts.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="bg-white rounded-2xl p-1.5 border border-[#1B4332]/10 flex gap-2">
            <button
              onClick={() => {
                setActiveTab('seller');
                setSelectedDoc(null);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'seller'
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              🌾 Sellers ({sellerGroups.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('buyer');
                setSelectedDoc(null);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'buyer'
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              🏢 Buyers ({buyerGroups.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Queue List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F17] pb-3 border-b border-zinc-100">
              Pending KYC ({currentGroups.length})
            </h3>

            {currentGroups.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <span className="text-3xl block mb-2">✨</span>
                No pending documents for this role.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {currentGroups.map((group) => {
                  const isSelected = selectedDoc?.userId === group.userId;
                  return (
                    <button
                      key={group.userId}
                      onClick={() => setSelectedDoc(group)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                          : 'bg-[#FAF8F2] hover:bg-white text-[#0B1F17] border-[#1B4332]/15'
                      }`}
                    >
                      <p className="font-bold text-xs">{group.user?.name || 'Registered User'}</p>
                      <p className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-white/80' : 'text-zinc-600'}`}>
                        {group.user?.email || 'user@email.com'}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px]">
                        <span className={isSelected ? 'text-white/70' : 'text-zinc-500'}>
                          State: {group.user?.state || 'IN'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {group.documents.length} document(s)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Document Review (8 cols) */}
          <div className="lg:col-span-8">
            {selectedDoc ? (
              <motion.div
                key={selectedDoc.userId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm space-y-6"
              >
                {/* User Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
                  <div>
                    <span className="eyebrow mb-1">Applicant Details</span>
                    <h2 className="font-display text-2xl font-bold text-[#0B1F17]">
                      {selectedDoc.user?.name}
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-0.5">
                      {selectedDoc.user?.email} • {selectedDoc.user?.phone || 'No phone'}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                    KYC Status: PENDING
                  </span>
                </div>

                {/* Document Items List */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-bold text-[#0B1F17]">
                    Submitted Documents ({selectedDoc.documents.length})
                  </h3>

                  {selectedDoc.documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="p-5 bg-[#FAF8F2] rounded-2xl border border-[#1B4332]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0B1F17] text-sm">
                            {doc.documentType?.replace('_', ' ') || 'Identity Proof'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B4332]/10 text-[#1B4332]">
                            {doc.verificationStatus}
                          </span>
                        </div>
                        <p className="text-zinc-500 font-mono text-[11px]">
                          Doc Number: <strong>{doc.documentNumber || 'Declared'}</strong>
                        </p>
                        <p className="text-zinc-400 text-[10px]">
                          Uploaded {new Date(doc.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewFile(doc)}
                          className="btn-pill bg-white hover:bg-zinc-50 border border-[#1B4332]/20 text-[#0B1F17] text-xs !py-2 !px-4 font-semibold"
                        >
                          👁️ View File
                        </button>
                        <button
                          onClick={() => handleApprove(doc._id)}
                          disabled={processing}
                          className="btn-pill btn-pill-solid text-xs !py-2 !px-4 font-bold disabled:opacity-50"
                        >
                          ✅ Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reject User Button */}
                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="btn-pill bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs !py-2.5 !px-5 font-bold transition"
                  >
                    ❌ Reject User Verification
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl p-16 text-center border border-[#1B4332]/10 shadow-sm text-zinc-500 text-xs">
                Select an applicant from the left queue to review their KYC documents.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* File Preview Modal */}
      {fileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <h3 className="font-display text-lg font-bold text-[#0B1F17]">
                {fileModal.doc?.documentType?.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setFileModal(null)}
                className="text-zinc-400 hover:text-zinc-800 font-bold"
              >
                ✕
              </button>
            </div>

            {fileModal.loading ? (
              <div className="py-12 text-center text-xs text-zinc-600">
                Loading document payload...
              </div>
            ) : fileModal.error ? (
              <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl text-xs">
                {fileModal.error}
              </div>
            ) : fileModal.data ? (
              <div className="text-center">
                {fileModal.data.startsWith('data:image') ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={fileModal.data} alt="Document preview" className="max-h-[500px] mx-auto rounded-xl shadow-sm" />
                ) : (
                  <iframe src={fileModal.data} className="w-full h-[500px] rounded-xl border border-zinc-200" title="Doc Preview" />
                )}
              </div>
            ) : null}

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setFileModal(null)}
                className="btn-pill btn-pill-solid text-xs !py-2 !px-6"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 space-y-4">
            <h3 className="font-display text-xl font-bold text-red-700">
              Reject KYC Verification
            </h3>
            <p className="text-xs text-zinc-600">
              Provide a clear reason for rejection so the user can re-upload valid documents.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Document image is blurry or PAN name mismatch..."
              rows={3}
              className="w-full px-4 py-3 bg-[#FAF8F2] border border-zinc-300 rounded-2xl text-xs text-[#0B1F17] focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 btn-pill btn-pill-ghost text-xs !py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 btn-pill bg-red-600 text-white hover:bg-red-700 text-xs !py-2.5 font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
