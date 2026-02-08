'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminFlaggedListingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listings, setListings] = useState([]);

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
        if (userJson?.data?.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        const flaggedResponse = await fetch('/api/admin/listings/flagged', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const flaggedJson = await flaggedResponse.json().catch(() => null);
        if (!flaggedResponse.ok) {
          throw new Error(flaggedJson?.error || flaggedJson?.message || 'Failed to load flagged listings');
        }

        const raw = flaggedJson?.data || [];
        setListings(Array.isArray(raw) ? raw : []);
      } catch (e) {
        setError(e?.message || 'Failed to load flagged listings');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading flagged listings...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Flagged Listings</h1>
              <p className="text-gray-600 mt-1">Review listings marked for moderation</p>
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

        <div className="bg-white rounded border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <p className="font-bold text-gray-900">Flagged ({listings.length})</p>
            <button
              onClick={() => router.push('/admin/listings')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Listings →
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-gray-600">No flagged listings</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {listings.map((l) => (
                <div key={l._id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{l.cropType || 'Carbon Credits'}</p>
                      <p className="text-xs text-gray-600 mt-1 truncate">Listing ID: {String(l._id)}</p>
                      <p className="text-xs text-gray-500 mt-1">Created: {l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-600">Status</p>
                      <p className="font-bold text-gray-900">{l.status || '—'}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-600">Available Credits</p>
                      <p className="font-bold text-gray-900">{Number(l.availableCredits ?? 0).toFixed(2)} tCO₂e</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-600">Price/Credit</p>
                      <p className="font-bold text-gray-900">₹{Number(l.pricePerCredit ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-xs text-gray-600">Total Value</p>
                      <p className="font-bold text-gray-900">₹{(Number(l.availableCredits ?? 0) * Number(l.pricePerCredit ?? 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
