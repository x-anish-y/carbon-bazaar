'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disableReason, setDisableReason] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

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

        // Fetch all listings
        const listingsResponse = await fetch('/api/admin/listings', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          setListings(Array.isArray(listingsData.data) ? listingsData.data : []);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to load listings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const fetchTradeHistory = async (listingId) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/trades`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTradeHistory(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching trade history:', err);
    }
  };

  const handleSelectListing = (listing) => {
    setSelectedListing(listing);
    setTradeHistory([]);
    setDisableReason('');
    fetchTradeHistory(listing._id);
  };

  const handleDisableListing = async () => {
    const token = localStorage.getItem('token');

    if (!disableReason.trim()) {
      setError('Please provide a reason for disabling this listing');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(`/api/admin/listings/${selectedListing._id}/disable`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: disableReason }),
      });

      if (response.ok) {
        // Update listing in list
        setListings(
          listings.map((l) =>
            l._id === selectedListing._id ? { ...l, isDisabled: true } : l
          )
        );
        setSelectedListing({ ...selectedListing, isDisabled: true });
        setShowDisableModal(false);
        setDisableReason('');
        setError('');
      } else {
        setError('Failed to disable listing');
      }
    } catch (err) {
      console.error('Error disabling listing:', err);
      setError('Error disabling listing');
    } finally {
      setProcessing(false);
    }
  };

  const handleEnableListing = async () => {
    const token = localStorage.getItem('token');
    setProcessing(true);

    try {
      const response = await fetch(`/api/admin/listings/${selectedListing._id}/enable`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        // Update listing in list
        setListings(
          listings.map((l) =>
            l._id === selectedListing._id ? { ...l, isDisabled: false } : l
          )
        );
        setSelectedListing({ ...selectedListing, isDisabled: false });
        setError('');
      } else {
        setError('Failed to enable listing');
      }
    } catch (err) {
      console.error('Error enabling listing:', err);
      setError('Error enabling listing');
    } finally {
      setProcessing(false);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.cropType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.sellerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'disabled' && listing.isDisabled) ||
      (statusFilter === 'active' && !listing.isDisabled);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading listings...</p>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Listings Management</h1>
              <p className="text-gray-600 mt-1">Monitor and moderate carbon credit listings</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded p-3 text-sm">
              <p className="text-gray-600 font-medium">Total Listings</p>
              <p className="text-2xl font-bold text-blue-600">{listings.length}</p>
            </div>
            <div className="bg-green-50 rounded p-3 text-sm">
              <p className="text-gray-600 font-medium">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {listings.filter((l) => !l.isDisabled).length}
              </p>
            </div>
            <div className="bg-red-50 rounded p-3 text-sm">
              <p className="text-gray-600 font-medium">Disabled</p>
              <p className="text-2xl font-bold text-red-600">
                {listings.filter((l) => l.isDisabled).length}
              </p>
            </div>
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
          {/* Left Column - Listings List */}
          <div className="lg:col-span-1">
            {/* Filters */}
            <div className="mb-4 space-y-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search seller, crop type..."
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Listings</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>

            {/* Listings List */}
            <div className="bg-white rounded border border-gray-200">
              {filteredListings.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-gray-600">No listings found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {filteredListings.map((listing) => (
                    <button
                      key={listing._id}
                      onClick={() => handleSelectListing(listing)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                        selectedListing?._id === listing._id
                          ? 'border-blue-600 bg-blue-50'
                          : listing.isDisabled
                          ? 'border-red-300'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-bold text-gray-900">
                          {cropEmojis[listing.cropType] || '🌾'} {listing.cropType}
                        </p>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            listing.isDisabled
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {listing.isDisabled ? '⛔ Disabled' : '✓ Active'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{listing.sellerName}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        ₹{listing.pricePerCredit?.toFixed(2)}/credit
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        📊 {(Number(listing.creditsEarned ?? 0)).toLocaleString()} tCO₂e available
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2">
            {selectedListing ? (
              <>
                {/* Listing Details */}
                <div className="bg-white rounded border border-gray-200 p-6 mb-6">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {cropEmojis[selectedListing.cropType] || '🌾'} {selectedListing.cropType}
                      </h2>
                      <p className="text-gray-600">
                        {selectedListing.sellerRole === 'COMPANY' ? '🏢' : '👨‍🌾'} {selectedListing.sellerName}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded font-bold ${
                        selectedListing.isDisabled
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {selectedListing.isDisabled ? '⛔ DISABLED' : '✅ ACTIVE'}
                    </span>
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-600 font-bold">CREDITS AVAILABLE</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(Number(selectedListing.creditsEarned ?? 0)).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">tCO₂e</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-bold">PRICE PER CREDIT</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{selectedListing.pricePerCredit?.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-bold">TOTAL VALUE</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹
                        {(
                          (Number(selectedListing.creditsEarned ?? 0) * Number(selectedListing.pricePerCredit ?? 0))
                        ).toLocaleString(
                          'en-IN',
                          { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-bold">MONTH</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedListing.month}</p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="bg-gray-50 rounded p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 font-medium">Seller Email</p>
                        <p className="text-gray-900">{selectedListing.sellerEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Status</p>
                        <p className="text-gray-900">{selectedListing.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Created</p>
                        <p className="text-gray-900">{new Date(selectedListing.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">Last Updated</p>
                        <p className="text-gray-900">{new Date(selectedListing.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 font-bold mb-2">DESCRIPTION</p>
                    <p className="text-gray-700 text-sm">{selectedListing.description || 'No description'}</p>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {selectedListing.isDisabled ? (
                      <button
                        onClick={handleEnableListing}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {processing ? '⏳ Processing...' : '✅ Re-enable Listing'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowDisableModal(true)}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        ⛔ Disable Listing
                      </button>
                    )}
                  </div>
                </div>

                {/* Trade History */}
                <div className="bg-white rounded border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Trade History</h3>
                  {tradeHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-gray-600">No trades for this listing</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tradeHistory.map((trade, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-gray-900">Buyer: {trade.buyerName}</p>
                              <p className="text-sm text-gray-600">{trade.buyerEmail}</p>
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${
                                trade.status === 'accepted'
                                  ? 'bg-green-100 text-green-800'
                                  : trade.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {trade.status?.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                            <div>
                              <p className="text-gray-600">Credits Offered</p>
                              <p className="font-bold text-gray-900">{trade.creditsRequested}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Price/Credit</p>
                              <p className="font-bold text-gray-900">₹{trade.pricePerCredit?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total</p>
                              <p className="font-bold text-gray-900">
                                ₹{(trade.creditsRequested * trade.pricePerCredit).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(trade.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded border border-gray-200 p-12 text-center">
                <p className="text-3xl mb-4">👆</p>
                <p className="text-gray-600">Select a listing from the left to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Disable "{selectedListing?.cropType}" Listing?
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Disabling
              </label>
              <textarea
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="e.g., Suspicious pricing, Fraudulent documents, Spam listing..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableListing}
                disabled={processing || !disableReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-bold"
              >
                {processing ? 'Disabling...' : 'Disable Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
