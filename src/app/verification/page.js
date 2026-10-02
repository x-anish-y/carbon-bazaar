'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VerificationPendingPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        // Fetch user info
        const userRes = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          const u = await userRes.json();
          setUser(u.data);
        }

        // Fetch verification status
        const response = await fetch('/api/documents/verify?action=status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
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

    fetchStatus();
  }, [router]);

  const dashboardHref =
    user?.role === 'SELLER' || user?.role === 'FARMER'
      ? '/seller/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/buyer/dashboard';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-xs font-semibold text-[#0B1F17]">Checking verification status...</p>
        </div>
      </div>
    );
  }

  // If verified
  if (verificationStatus?.isVerified || user?.verified) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17] flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 max-w-md w-full text-center border border-[#1B4332]/10 space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-800 text-3xl rounded-full flex items-center justify-center mx-auto shadow-sm">
            ✓
          </div>
          <div>
            <span className="eyebrow mb-1">Identity Verified</span>
            <h1 className="font-display text-3xl font-extrabold text-[#0B1F17] mt-1">
              KYC Complete!
            </h1>
            <p className="text-zinc-600 text-xs mt-2 leading-relaxed">
              Your government identity and registration documents have been approved by platform auditors.
            </p>
          </div>

          <Link
            href={dashboardHref}
            className="w-full btn-pill btn-pill-solid text-xs !py-3 font-bold block shadow-md"
          >
            Go to {user?.role === 'SELLER' || user?.role === 'FARMER' ? 'Seller' : 'Buyer'} Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // Show pending/action required status
  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white text-sm">
              🌱
            </div>
            <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
          </Link>

          <Link
            href={dashboardHref}
            className="btn-pill btn-pill-ghost text-xs !py-2 !px-4"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div className="text-center space-y-2">
          <span className="eyebrow mb-1">Verification Status</span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
            Document Review Status
          </h1>
          <p className="text-zinc-600 text-xs max-w-md mx-auto leading-relaxed">
            Monitor the status of your uploaded compliance records or submit updated files.
          </p>
        </div>

        {/* Status Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#1B4332]/10 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F2] border border-[#1B4332]/15 flex items-center justify-center text-2xl shrink-0">
              {verificationStatus?.hasRejected ? '⚠️' : '⏳'}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[#0B1F17]">
                {verificationStatus?.hasRejected
                  ? 'Re-upload Required for Rejected Documents'
                  : verificationStatus?.hasPending
                  ? 'Documents Under Auditor Review'
                  : 'Document Verification Required'}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {verificationStatus?.hasRejected
                  ? 'One or more submitted documents were rejected. Please review auditor comments and submit updated files.'
                  : verificationStatus?.hasPending
                  ? 'Our compliance auditors are currently reviewing your documents. Approvals usually complete within 12–24 hours.'
                  : 'Please upload the required government records to complete KYC verification.'}
              </p>
            </div>
          </div>

          {/* Documents Status List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Submitted Documents ({verificationStatus?.documents?.length || 0})
            </h4>

            {verificationStatus?.documents?.length > 0 ? (
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 overflow-hidden bg-[#FAF8F2]/50">
                {verificationStatus.documents.map((doc) => (
                  <div key={doc._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0B1F17]">
                          {formatDocumentType(doc.documentType)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            doc.verificationStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : doc.verificationStatus === 'REJECTED'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-zinc-500">
                        Number: <strong className="text-zinc-800">{doc.documentNumber}</strong> ({doc.fileName})
                      </p>
                      {doc.rejectionReason && (
                        <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2">
                          <strong>Rejection Reason:</strong> {doc.rejectionReason}
                        </p>
                      )}
                    </div>

                    <span className="text-[11px] text-zinc-400 font-medium shrink-0">
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#FAF8F2] rounded-2xl border border-[#1B4332]/10 text-xs text-zinc-500">
                No documents uploaded yet.
              </div>
            )}
          </div>

          {/* Action CTA */}
          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/verification/upload"
              className="w-full sm:w-auto btn-pill btn-pill-solid text-xs !py-3 !px-8 shadow-sm font-bold text-center"
            >
              📄 Upload / Update Documents
            </Link>
            <Link
              href={dashboardHref}
              className="w-full sm:w-auto btn-pill btn-pill-ghost text-xs !py-3 !px-6 text-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#FAF8F2] border border-[#1B4332]/15 rounded-3xl p-6 shadow-xs text-xs space-y-3">
          <h4 className="font-display font-bold text-[#0B1F17] flex items-center gap-1.5">
            <span>🛡️</span> Security & Compliance Note
          </h4>
          <p className="text-zinc-600 leading-relaxed">
            All submitted identity and land registration records are encrypted and stored in compliance with Indian digital data protection standards. Document hashes are referenced on Polygon for auditable regulatory compliance.
          </p>
        </div>
      </main>
    </div>
  );
}

function formatDocumentType(type) {
  const map = {
    AADHAAR: '🪪 Aadhaar Identity Card',
    LAND_RECORD: '🌾 Land Title / 7/12 Extract',
    PAN: '🏢 Corporate PAN Card',
    GST_CERTIFICATE: '📑 GST Registration Certificate',
  };
  return map[type] || type;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}
