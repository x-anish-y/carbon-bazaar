'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function StatusBadge({ status }) {
  const config = {
    PENDING: {
      className: 'bg-yellow-100 text-yellow-800',
      label: 'Pending',
    },
    APPROVED: {
      className: 'bg-green-100 text-green-800',
      label: 'Approved',
    },
    REJECTED: {
      className: 'bg-red-100 text-red-800',
      label: 'Rejected',
    },
  };

  const item = config[status] || config.PENDING;

  return (
    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${item.className}`}>
      {item.label}
    </span>
  );
}

function JsonBlock({ value }) {
  const display = useMemo(() => {
    if (value === undefined || value === null) return '—';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <pre className="w-full overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-900">
      {display}
    </pre>
  );
}

export default function LandVerificationDetailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [verification, setVerification] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = async (token) => {
    setError('');

    const userResponse = await fetch('/api/users/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const userJson = await userResponse.json();
    const currentUser = userJson?.data;
    setUser(currentUser);

    const verificationsResponse = await fetch('/api/land-verifications?page=1&limit=50', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!verificationsResponse.ok) {
      const message = await verificationsResponse.text();
      throw new Error(message || 'Failed to fetch land verifications');
    }

    const verificationsJson = await verificationsResponse.json();
    const verifications = verificationsJson?.data?.verifications || [];

    const myVerifications = verifications.filter((v) => {
      const sellerId = v?.listingId?.sellerId?._id || v?.listingId?.sellerId;
      return sellerId && currentUser?._id && String(sellerId) === String(currentUser._id);
    });

    myVerifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setVerification(myVerifications[0] || null);
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
        await fetchData(token);
      } catch (e) {
        setError(e?.message || 'Failed to load land verification');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleApprove = async () => {
    const token = localStorage.getItem('token');
    if (!token || !verification?._id) return;

    try {
      setUpdating(true);
      setError('');

      const response = await fetch(`/api/land-verifications/${verification._id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to approve verification');
      }

      setVerification(data?.data || verification);
    } catch (e) {
      setError(e?.message || 'Failed to approve verification');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    const token = localStorage.getItem('token');
    if (!token || !verification?._id) return;

    try {
      setUpdating(true);
      setError('');

      const response = await fetch(`/api/land-verifications/${verification._id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Rejected' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reject verification');
      }

      setVerification(data?.data || verification);
    } catch (e) {
      setError(e?.message || 'Failed to reject verification');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50">
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">🌾</span>
            <span className="text-xl font-bold text-zinc-900">Carbon Bazaar</span>
          </Link>
          <Link
            href="/verification-pending"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            ← Back
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-zinc-200">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Land Verification</h1>
              <p className="text-zinc-600 text-sm mt-1">
                {user?.name ? `For ${user.name}` : 'Details'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={verification?.status} />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {!verification ? (
            <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-lg">
              <p className="text-zinc-900 font-medium">No land verification found</p>
              <p className="text-sm text-zinc-600 mt-1">Submit a land verification to see it here.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 mb-3">Farmer input</h2>
                <JsonBlock value={verification.farmerDeclaredData} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-zinc-900 mb-3">AI observed data</h2>
                <JsonBlock value={verification.aiObservedData} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
                  <p className="text-sm text-zinc-600">Match percentage</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">
                    {verification.matchPercentage === null || verification.matchPercentage === undefined
                      ? '—'
                      : `${verification.matchPercentage}%`}
                  </p>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
                  <p className="text-sm text-zinc-600">Status</p>
                  <div className="mt-2">
                    <StatusBadge status={verification.status} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleApprove}
                  disabled={updating || verification.status !== 'PENDING'}
                  className="flex-1 px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={updating || verification.status !== 'PENDING'}
                  className="flex-1 px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
