'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function BuyerTradesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [trades, setTrades] = useState({
    active: [],
    completed: [],
    rejected: [],
  });

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

        if (userData.data.role !== 'BUYER' && userData.data.role !== 'COMPANY') {
          router.push('/');
          return;
        }

        setUser(userData.data);

        const activeResponse = await fetch('/api/trade-offers?status=pending', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (activeResponse.ok) {
          const activeData = await activeResponse.json();
          setTrades((prev) => ({
            ...prev,
            active: activeData.data || [],
          }));
        }

        const completedResponse = await fetch('/api/trade-offers?status=accepted', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (completedResponse.ok) {
          const completedData = await completedResponse.json();
          setTrades((prev) => ({
            ...prev,
            completed: completedData.data || [],
          }));
        }
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError('Failed to load trade negotiations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading your trade offers...</p>
        </div>
      </div>
    );
  }

  const currentList = trades[activeTab] || [];

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/buyer/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white">
                <span className="text-sm">🏢</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              Buyer Trade Negotiations
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/buyer/dashboard" className="btn-pill btn-pill-ghost text-xs !py-2 !px-4">
              ← Buyer Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
              Carbon Credit Negotiations & Offers
            </h1>
            <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
              Track active price negotiations and volume bids submitted to rural sellers.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-1.5 border border-[#1B4332]/10 flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'active'
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Active ({trades.active.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'completed'
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Settled ({trades.completed.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {currentList.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-[#1B4332]/10 shadow-sm text-zinc-500 text-xs">
            <span className="text-3xl block mb-2">💬</span>
            No {activeTab} negotiations. Explore the marketplace to make offers to verified sellers.
            <div className="mt-4">
              <Link href="/marketplace" className="btn-pill btn-pill-solid text-xs !py-2.5 !px-6">
                Browse Marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentList.map((t) => (
              <div key={t._id} className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0B1F17]">
                      {t.listingId?.cropType || 'Carbon Batch'}
                    </h3>
                    <p className="text-xs text-zinc-500">Seller: {t.sellerId?.name || t.sellerId?.email}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                    {t.status}
                  </span>
                </div>

                <div className="p-4 bg-[#FAF8F2] rounded-2xl text-xs space-y-1.5 border border-[#1B4332]/10">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Volume:</span>
                    <span className="font-bold text-[#0B1F17]">{t.creditsRequested} tCO₂e</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Offered Price:</span>
                    <span className="font-bold text-[#1B4332]">₹{t.negotiatedPricePerCredit} / credit</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-1.5">
                    <span className="text-zinc-600 font-bold">Total Consideration:</span>
                    <span className="font-display text-base font-extrabold text-[#0B1F17]">
                      ₹{(t.negotiatedTotalPrice || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Link
                    href={`/listings/${t.listingId?._id || t.listingId}/negotiate`}
                    className="btn-pill btn-pill-solid text-xs !py-2 !px-4"
                  >
                    Open Negotiation Thread →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
