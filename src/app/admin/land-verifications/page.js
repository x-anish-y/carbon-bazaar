'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

function StatusBadge({ status }) {
  const config = {
    PENDING: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    APPROVED: { className: 'bg-green-100 text-green-800', label: 'Approved' },
    REJECTED: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
  };

  const item = config[status] || config.PENDING;

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${item.className}`}>
      {item.label}
    </span>
  );
}

function JsonBlock({ value }) {
  const sanitize = (input) => {
    if (!input || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(sanitize);

    const result = {};
    for (const [key, raw] of Object.entries(input)) {
      if (key === 'error' || key === 'provider') continue;

      if ((key === 'geocoding' || key === 'satellite' || key === 'openaiVision') && raw && typeof raw === 'object') {
        // Hide provider sections if they are not successful
        if (raw.success !== true) continue;
      }

      result[key] = sanitize(raw);
    }
    return result;
  };

  const display = useMemo(() => {
    if (value === undefined || value === null) return '—';
    try {
      return JSON.stringify(sanitize(value), null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <pre className="w-full overflow-auto rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-900">
      {display}
    </pre>
  );
}

export default function AdminLandVerificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifications, setVerifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPending = async (token) => {
    const response = await fetch('/api/land-verifications?status=PENDING&page=1&limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || 'Failed to fetch land verifications');
    }

    const list = data?.data?.verifications || [];
    setVerifications(list);

    // Keep selection stable if possible
    if (selected?._id) {
      const stillExists = list.find((v) => String(v._id) === String(selected._id));
      if (stillExists) setSelected(stillExists);
      else setSelected(list[0] || null);
    } else {
      setSelected(list[0] || null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError('');

        const userResponse = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userResponse.ok) {
          router.push('/login');
          return;
        }

        const userJson = await userResponse.json();
        const currentUser = userJson?.data;

        if (currentUser?.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        setUser(currentUser);
        await fetchPending(token);
      } catch (e) {
        setError(e?.message || 'Failed to load land verifications');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleApprove = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selected?._id) return;

    try {
      setUpdating(true);
      setError('');

      const response = await fetch(`/api/land-verifications/${selected._id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to approve verification');
      }

      // Remove approved item from pending list
      const remaining = verifications.filter((v) => String(v._id) !== String(selected._id));
      setVerifications(remaining);
      setSelected(remaining[0] || null);
    } catch (e) {
      setError(e?.message || 'Failed to approve verification');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selected?._id) return;

    try {
      setUpdating(true);
      setError('');

      const response = await fetch(`/api/land-verifications/${selected._id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reject verification');
      }

      const remaining = verifications.filter((v) => String(v._id) !== String(selected._id));
      setVerifications(remaining);
      setSelected(remaining[0] || null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (e) {
      setError(e?.message || 'Failed to reject verification');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading land verifications...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-4">Access Denied</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Land Verifications</h1>
              <p className="text-gray-600 mt-1">Review match percentage and approve/reject</p>
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
          <div className="lg:col-span-1">
            <div className="bg-white rounded border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <p className="font-bold text-gray-900">Pending ({verifications.length})</p>
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    try {
                      setLoading(true);
                      await fetchPending(token);
                    } catch (e) {
                      setError(e?.message || 'Failed to refresh');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Refresh
                </button>
              </div>

              {verifications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-3xl mb-2">✨</p>
                  <p className="text-gray-600">No pending land verifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {verifications.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => setSelected(v)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                        selected?._id === v._id ? 'border-orange-600 bg-orange-50' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">Verification #{String(v._id).slice(-6)}</p>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            Listing: {v?.listingId?._id ? String(v.listingId._id) : String(v.listingId || '—')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {v?.createdAt ? new Date(v.createdAt).toLocaleString() : '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-600">Match</p>
                          <p className="font-bold text-gray-900">
                            {v.matchPercentage === null || v.matchPercentage === undefined ? '—' : `${v.matchPercentage}%`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-white rounded border border-gray-200 p-6">
                <p className="text-gray-900 font-bold">Select a verification</p>
                <p className="text-gray-600 text-sm mt-1">Choose a pending item from the list to review details.</p>
              </div>
            ) : (
              <div className="bg-white rounded border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Land Verification</h2>
                    <p className="text-sm text-gray-600 mt-1">ID: {selected._id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-xs text-gray-600">Listing</p>
                    <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                      {selected?.listingId?._id ? String(selected.listingId._id) : String(selected.listingId || '—')}
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-xs text-gray-600">Match percentage</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selected.matchPercentage === null || selected.matchPercentage === undefined
                        ? '—'
                        : `${selected.matchPercentage}%`}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Farmer input</h3>
                    <JsonBlock value={selected.farmerDeclaredData} />
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">AI observed data</h3>
                    <JsonBlock value={selected.aiObservedData} />
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={updating || selected.status !== 'PENDING'}
                    className="flex-1 px-6 py-3 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setRejectReason('');
                      setShowRejectModal(true);
                    }}
                    disabled={updating || selected.status !== 'PENDING'}
                    className="flex-1 px-6 py-3 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-white rounded border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900">Reject verification</h3>
            <p className="text-sm text-gray-600 mt-1">Provide a reason (optional).</p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded border border-gray-300 p-3 text-sm text-gray-900"
              placeholder="Reason"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={updating}
                className="flex-1 px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={updating}
                className="flex-1 px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:bg-gray-400"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
