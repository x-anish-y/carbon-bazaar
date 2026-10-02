'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MyListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'SOLD_OUT' | 'PARTIAL'

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const statusBadges = {
    ACTIVE: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
      label: '🟢 Active & Listed',
    },
    SOLD_OUT: {
      bg: 'bg-zinc-50',
      border: 'border-zinc-300',
      text: 'text-zinc-700',
      badge: 'bg-zinc-200 text-zinc-800 border-zinc-300',
      dot: 'bg-zinc-500',
      label: '🔴 100% Sold Out',
    },
    DELISTED: {
      bg: 'bg-rose-50/70',
      border: 'border-rose-200',
      text: 'text-rose-800',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
      label: '⚫ Delisted',
    },
  };

  const cropEmojis = {
    RICE: '🍚',
    WHEAT: '🌾',
    SUGARCANE: '🎋',
    PULSES: '🫘',
    MAIZE: '🌽',
    COTTON: '🧵',
    SOYBEAN: '🌱',
    FRUITS: '🍎',
    VEGETABLES: '🥬',
    SPICES: '🌶️',
    FORAGE: '🌿',
    OTHER: '🌾',
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const userResponse = await fetch('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const userInfo = userData.data;
          setUser(userInfo);

          if (!userInfo.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          if (userInfo.role !== 'FARMER' && userInfo.role !== 'COMPANY') {
            router.push('/');
            return;
          }

          // Fetch ALL listings for this user including SOLD_OUT
          const listingsResponse = await fetch(`/api/listings?sellerId=${userInfo._id}&status=ALL`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (listingsResponse.ok) {
            const listingsData = await listingsResponse.json();
            setListings(listingsData.data || []);
          } else {
            setError('Failed to load listings');
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleDelete = async (listingId) => {
    if (!confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setListings((prev) => prev.filter((l) => l._id !== listingId));
      } else {
        alert('Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('An error occurred while deleting');
    }
  };

  const filteredListings = useMemo(() => {
    if (filterStatus === 'ACTIVE') {
      return listings.filter((l) => (l.status || 'ACTIVE') === 'ACTIVE');
    }
    if (filterStatus === 'SOLD_OUT') {
      return listings.filter((l) => l.status === 'SOLD_OUT' || (l.availableCredits === 0 && l.totalSold > 0));
    }
    if (filterStatus === 'PARTIAL') {
      return listings.filter(
        (l) => (l.status || 'ACTIVE') === 'ACTIVE' && (l.totalSold || 0) > 0 && (l.availableCredits || 0) > 0
      );
    }
    return listings;
  }, [listings, filterStatus]);

  const stats = useMemo(() => {
    const totalListings = listings.length;
    const activeListings = listings.filter((l) => (l.status || 'ACTIVE') === 'ACTIVE').length;
    const soldOutListings = listings.filter(
      (l) => l.status === 'SOLD_OUT' || (l.availableCredits === 0 && l.totalSold > 0)
    ).length;
    const totalCreditsMinted = listings.reduce((sum, l) => sum + toNumber(l.creditsAmount), 0);
    const totalCreditsSold = listings.reduce((sum, l) => sum + toNumber(l.totalSold), 0);
    const totalCreditsAvailable = listings.reduce((sum, l) => sum + toNumber(l.availableCredits), 0);
    const totalEarned = listings.reduce((sum, l) => sum + toNumber(l.totalSold) * toNumber(l.pricePerCredit), 0);

    return {
      totalListings,
      activeListings,
      soldOutListings,
      totalCreditsMinted,
      totalCreditsSold,
      totalCreditsAvailable,
      totalEarned,
    };
  }, [listings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50/40 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-zinc-600 font-medium">Loading your listings inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4fbf7] text-zinc-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌾</span>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Carbon Bazaar</h1>
                <p className="text-xs text-zinc-500">Seller Inventory & Listing Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/marketplace"
                className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition"
              >
                🛒 View Public Marketplace
              </Link>
              <Link
                href={user?.role === 'BUYER' || user?.role === 'COMPANY' ? '/buyer/dashboard' : '/seller/dashboard'}
                className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 border border-zinc-200 px-3.5 py-2 rounded-xl hover:bg-zinc-50 transition"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Title Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                Seller Portal
              </span>
              {user?.name && <span className="text-xs text-zinc-500 font-medium">Logged in as {user.name}</span>}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-1">
              📋 My Carbon Credit Inventory
            </h2>
            <p className="text-zinc-600 text-sm mt-1">
              Real-time breakdown of your minted, available, and purchased carbon credits.
            </p>
          </div>
          <Link
            href="/listings/create"
            className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 text-sm shrink-0"
          >
            <span>➕</span> Add New Listing
          </Link>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Total Minted Credits</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">
              {stats.totalCreditsMinted.toLocaleString()} <span className="text-sm font-bold text-zinc-500">tCO2e</span>
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{stats.totalListings} total batches created</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/50">
            <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Available on Market</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {stats.totalCreditsAvailable.toLocaleString()} <span className="text-sm font-bold text-emerald-600">tCO2e</span>
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">{stats.activeListings} open active listings</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/50">
            <p className="text-xs text-blue-800 font-semibold uppercase tracking-wider">Purchased & Settled</p>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {stats.totalCreditsSold.toLocaleString()} <span className="text-sm font-bold text-blue-600">tCO2e</span>
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5">{stats.soldOutListings} sold out batches</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Total Revenue Earned</p>
            <p className="text-2xl font-black text-zinc-900 mt-1">
              ₹{stats.totalEarned.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">from direct company purchases</p>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-zinc-200 mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'ALL'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <span>📁 All Listings</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${filterStatus === 'ALL' ? 'bg-emerald-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
              {listings.length}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <span>🟢 Active in Marketplace</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${filterStatus === 'ACTIVE' ? 'bg-emerald-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
              {stats.activeListings}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('SOLD_OUT')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'SOLD_OUT'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <span>🔴 100% Sold Out</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${filterStatus === 'SOLD_OUT' ? 'bg-emerald-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
              {stats.soldOutListings}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('PARTIAL')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filterStatus === 'PARTIAL'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <span>⚡ Partially Sold</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${filterStatus === 'PARTIAL' ? 'bg-emerald-800 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
              {listings.filter((l) => (l.status || 'ACTIVE') === 'ACTIVE' && (l.totalSold || 0) > 0).length}
            </span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-sm">
            <p className="text-4xl mb-3">📭</p>
            <h3 className="text-lg font-bold text-zinc-900 mb-1">No listings found for this filter</h3>
            <p className="text-zinc-500 text-xs mb-6">
              Try selecting "All Listings" or create a new carbon credit batch.
            </p>
            <Link
              href="/listings/create"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-xs"
            >
              Create New Listing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => {
              const isSoldOut = listing.status === 'SOLD_OUT' || (listing.availableCredits === 0 && (listing.totalSold || 0) > 0);
              const status = isSoldOut ? 'SOLD_OUT' : (listing.status || 'ACTIVE');
              const statusStyle = statusBadges[status] || statusBadges.ACTIVE;
              const cropEmoji = cropEmojis[listing.cropType] || '🌾';

              const totalCredits = toNumber(listing.creditsAmount, 0);
              const availableCredits = toNumber(listing.availableCredits, isSoldOut ? 0 : totalCredits);
              const totalSold = toNumber(listing.totalSold, 0);
              const pricePerCredit = toNumber(listing.pricePerCredit, 0);
              const percentageSold = totalCredits > 0 ? Math.min(100, (totalSold / totalCredits) * 100) : 0;
              const tokenId = listing.tokenId || listing.batchId?.tokenId;

              const tierIcon = listing.creditType === 'PREMIUM' ? '⭐' : listing.creditType === 'MEDIUM' ? '🌿' : '🛡️';
              const tierLabel = listing.creditType === 'PREMIUM' ? 'Premium-Quality Credits' : listing.creditType === 'MEDIUM' ? 'Medium-Quality Credits' : 'Baseline Credits';

              return (
                <div
                  key={listing._id}
                  className={`bg-white border ${isSoldOut ? 'border-zinc-200 opacity-90' : 'border-zinc-200/90 hover:border-emerald-300'} rounded-3xl p-6 transition-all hover:shadow-md`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left Section - Main Info */}
                    <div className="lg:col-span-7">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl">
                            {tierIcon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-zinc-900">
                                {tierLabel}
                              </h3>
                              {tokenId && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                                  ⛓️ Token #{tokenId} (ERC-1155)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">
                              Vintage: {listing.month} • State: {listing.state || 'MH'} • Listed on {new Date(listing.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.badge} flex items-center gap-1.5`}>
                          <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`}></span>
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-600 mb-4 line-clamp-2">
                        {listing.description || 'Verified agricultural regenerative carbon credit batch.'}
                      </p>

                      {/* Inventory Progress Bar */}
                      <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 mb-2">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-zinc-700">
                            Sold: <strong className="text-blue-700">{totalSold} tCO2e</strong> ({percentageSold.toFixed(0)}%)
                          </span>
                          <span className="font-semibold text-zinc-700">
                            Available: <strong className="text-emerald-700">{availableCredits} tCO2e</strong>
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500"
                            style={{ width: `${percentageSold}%` }}
                            title={`Sold: ${totalSold} tCO2e`}
                          ></div>
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500"
                            style={{ width: `${100 - percentageSold}%` }}
                            title={`Available: ${availableCredits} tCO2e`}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                          <span>0 tCO2e</span>
                          <span>Total Batch: {totalCredits} tCO2e</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Stats & Actions */}
                    <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-zinc-100 lg:pl-6">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200/70">
                          <p className="text-[10px] uppercase font-bold text-zinc-400">Price / Credit</p>
                          <p className="text-lg font-black text-zinc-900 mt-0.5">₹{pricePerCredit.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-zinc-500">per tCO2e</p>
                        </div>

                        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/70">
                          <p className="text-[10px] uppercase font-bold text-emerald-700">Total Batch Value</p>
                          <p className="text-lg font-black text-emerald-900 mt-0.5">
                            ₹{(totalCredits * pricePerCredit).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-emerald-600">
                            Earned: ₹{(totalSold * pricePerCredit).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {status === 'ACTIVE' && (
                          <Link
                            href={`/listings/${listing._id}/edit`}
                            className="flex-1 py-2.5 px-3 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold rounded-xl transition text-center shadow-sm"
                          >
                            ✏️ Edit Details
                          </Link>
                        )}
                        {status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleDelete(listing._id)}
                            className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition"
                          >
                            🗑️ Delist
                          </button>
                        ) : (
                          <span className="w-full text-center py-2 text-xs font-bold text-zinc-400 bg-zinc-100 rounded-xl">
                            ✅ Fully Settled & Sold
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
