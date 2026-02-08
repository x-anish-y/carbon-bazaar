'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MyListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const statusBadges = {
    ACTIVE: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
    SOLD_OUT: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-800' },
    DELISTED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
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

    // Fetch user and listings
    const fetchData = async () => {
      try {
        // Fetch user profile
        const userResponse = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const userInfo = userData.data;
          setUser(userInfo);

          // Check if email is verified
          if (!userInfo.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          // Check if role is FARMER or COMPANY
          if (userInfo.role !== 'FARMER' && userInfo.role !== 'COMPANY') {
            router.push('/');
            return;
          }

          // Fetch listings for this user only
          const listingsResponse = await fetch(`/api/listings?sellerId=${userInfo._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
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
          'Authorization': `Bearer ${token}`,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading your listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-green-600">🌾</span>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Carbon Bazaar</h1>
                <p className="text-xs text-zinc-600">My Listings</p>
              </div>
            </div>
            <Link
              href={user?.role === 'COMPANY' ? '/company/dashboard' : '/farmer/dashboard'}
              className="text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Title Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">📋 My Carbon Credit Listings</h2>
            <p className="text-zinc-600 mt-2">
              Manage and track your carbon credit listings
            </p>
          </div>
          <Link
            href="/listings/create"
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            ➕ Add New Listing
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
            <p className="text-4xl mb-4">📭</p>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">No listings yet</h3>
            <p className="text-zinc-600 mb-6">
              You haven't created any carbon credit listings yet. Start by adding your first listing!
            </p>
            <Link
              href="/listings/create"
              className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const status = listing.status || 'ACTIVE';
              const statusStyle = statusBadges[status] || statusBadges['ACTIVE'];
              const cropEmoji = cropEmojis[listing.cropType] || '🌾';

              return (
                <div
                  key={listing._id}
                  className={`${statusStyle.bg} border ${statusStyle.border} rounded-lg p-6 transition-all hover:shadow-md`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Section - Main Info */}
                    <div className="lg:col-span-7">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{cropEmoji}</span>
                          <div>
                            <h3 className="text-lg font-bold text-zinc-900">
                              {listing.cropType || 'Carbon Credits'}
                            </h3>
                            <p className="text-sm text-zinc-600">
                              Listed on {new Date(listing.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.badge}`}>
                          {status}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-zinc-700 mb-4">
                        {listing.description || 'No description provided'}
                      </p>

                      {/* Key Details */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-zinc-600 font-medium">Month</p>
                          <p className="text-sm font-bold text-zinc-900">{listing.month}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600 font-medium">Land Size</p>
                          <p className="text-sm font-bold text-zinc-900">
                            {listing.areaInHectares} hectares
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600 font-medium">Status</p>
                          <p className="text-sm font-bold text-zinc-900">
                            {status === 'ACTIVE' && '🟢 Active'}
                            {status === 'SOLD_OUT' && '🔴 Sold Out'}
                            {status === 'DELISTED' && '⚫ Delisted'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Stats & Actions */}
                    <div className="lg:col-span-5">
                      <div className="space-y-4">
                        {/* Credits & Price */}
                        <div className="bg-white rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-zinc-600 font-medium">Total Credits</p>
                              <p className="text-2xl font-bold text-green-600">
                                {listing.creditsAmount?.toFixed(2) || '0'}
                              </p>
                              <p className="text-xs text-zinc-500">tCO₂e</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-600 font-medium">Price/Credit</p>
                              <p className="text-2xl font-bold text-zinc-900">
                                ₹{toNumber(listing.pricePerCredit).toFixed(2)}
                              </p>
                              <p className="text-xs text-zinc-500">per tCO₂e</p>
                            </div>
                          </div>
                          <div className="border-t border-zinc-200 pt-3">
                            <p className="text-xs text-zinc-600 font-medium">Total Value</p>
                            <p className="text-xl font-bold text-zinc-900">
                              ₹{(
                                toNumber(listing.creditsAmount) * toNumber(listing.pricePerCredit)
                              ).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>

                        {/* Trade Requests */}
                        <div className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-zinc-900">Incoming Requests</p>
                            <span className="text-2xl font-bold text-blue-600">
                              {listing.tradeRequestsCount || 0}
                            </span>
                          </div>
                          {listing.tradeRequestsCount > 0 && (
                            <Link
                              href={`/listings/${listing._id}/requests`}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
                            >
                              View requests →
                            </Link>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {status === 'ACTIVE' && (
                            <Link
                              href={`/listings/${listing._id}/edit`}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors text-center"
                            >
                              ✏️ Edit
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(listing._id)}
                            className="flex-1 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        {listings.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-zinc-200 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">{listings.length}</p>
              <p className="text-xs text-zinc-600 font-medium mt-1">Total Listings</p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {listings.filter((l) => (l.status || 'ACTIVE') === 'ACTIVE').length}
              </p>
              <p className="text-xs text-zinc-600 font-medium mt-1">Open Listings</p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {listings.reduce((sum, l) => sum + (l.tradeRequestsCount || 0), 0)}
              </p>
              <p className="text-xs text-zinc-600 font-medium mt-1">Trade Requests</p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">
                ₹{listings
                  .reduce((sum, l) => sum + (toNumber(l.creditsAmount) * toNumber(l.pricePerCredit)), 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-zinc-600 font-medium mt-1">Total Value</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
