'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading flagged listings desk...</p>
        </div>
      </div>
    );
  }

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
            <span className="text-xs bg-red-100 text-red-900 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              Moderation Desk
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="btn-pill btn-pill-ghost text-xs !py-2 !px-4">
              ← Admin Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
            Flagged Listings & Moderation
          </h1>
          <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
            Review listings flagged by buyers or automated risk scoring for quality or provenance disputes.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {listings.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-[#1B4332]/10 shadow-sm">
            <span className="text-4xl block mb-2">✨</span>
            <h3 className="font-display text-2xl font-bold text-[#0B1F17]">
              No Flagged Listings
            </h3>
            <p className="text-zinc-500 text-xs mt-1">
              All marketplace carbon batches meet platform compliance and provenance standards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listings.map((item) => (
              <div key={item._id} className="bg-white rounded-3xl p-6 border border-red-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0B1F17]">
                      {item.cropType} ({item.month})
                    </h3>
                    <p className="text-xs text-zinc-500">Seller: {item.sellerId?.name || item.sellerId?.email}</p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full">
                    Flagged
                  </span>
                </div>

                <div className="p-4 bg-red-50 rounded-2xl text-xs text-red-900 border border-red-100">
                  <p className="font-bold">Flag Reason:</p>
                  <p className="mt-0.5">{item.flagReason || 'Requires manual admin verification review'}</p>
                </div>

                <div className="flex justify-between text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                  <span>Credits: <strong>{item.creditsAmount} tCO2e</strong></span>
                  <span>Price: <strong>₹{item.pricePerCredit}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
