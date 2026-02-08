'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ListingsMarketplacePage() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [filterCrop, setFilterCrop] = useState('');
  const [filterSellerType, setFilterSellerType] = useState(''); // FARMER, COMPANY, or empty for all
  const [filterMonth, setFilterMonth] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Negotiation modal state
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [negotiateData, setNegotiateData] = useState({
    creditsRequested: '',
    negotiatedPrice: '',
    message: '',
  });
  const [negotiateError, setNegotiateError] = useState(null);
  const [negotiateLoading, setNegotiateLoading] = useState(false);

  useEffect(() => {
    checkUser();
    fetchListings();
  }, [filterStatus, filterCrop, filterSellerType, filterMonth, minPrice, maxPrice, sortBy]);

  const checkUser = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error checking user:', err);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      let url = `/api/listings?status=${filterStatus}&sortBy=${sortBy}`;
      if (filterCrop) url += `&cropType=${filterCrop}`;
      if (filterSellerType) url += `&sellerType=${filterSellerType}`;
      if (filterMonth) url += `&month=${filterMonth}`;
      if (minPrice) url += `&minPrice=${minPrice}`;
      if (maxPrice) url += `&maxPrice=${maxPrice}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNegotiateModal = (listing) => {
    setSelectedListing(listing);
    setNegotiateData({
      creditsRequested: '',
      negotiatedPrice: listing.pricePerCredit,
      message: '',
    });
    setNegotiateError(null);
    setShowNegotiateModal(true);
  };

  const handleSendOffer = async () => {
    setNegotiateError(null);
    setNegotiateLoading(true);

    try {
      if (!negotiateData.creditsRequested || !negotiateData.negotiatedPrice) {
        setNegotiateError('Please fill in all fields');
        setNegotiateLoading(false);
        return;
      }

      const creditsRequested = parseFloat(negotiateData.creditsRequested);
      const price = parseFloat(negotiateData.negotiatedPrice);

      if (creditsRequested <= 0 || creditsRequested > selectedListing.availableCredits) {
        setNegotiateError(`Credits must be between 0.01 and ${selectedListing.availableCredits}`);
        setNegotiateLoading(false);
        return;
      }

      if (price <= 0 || price > 10000) {
        setNegotiateError('Price must be between ₹0.01 and ₹10,000');
        setNegotiateLoading(false);
        return;
      }

      const response = await fetch('/api/trade-offers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: selectedListing._id,
          creditsRequested,
          negotiatedPricePerCredit: price,
          message: negotiateData.message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setNegotiateError(error.message);
        setNegotiateLoading(false);
        return;
      }

      alert('Offer sent successfully! The seller will review it soon.');
      setShowNegotiateModal(false);
      setNegotiateData({
        creditsRequested: '',
        negotiatedPrice: '',
        message: '',
      });
    } catch (err) {
      setNegotiateError(err.message);
    } finally {
      setNegotiateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Carbon Credits Marketplace</h1>
              <p className="text-gray-600 mt-2">Buy carbon credits directly from verified farmers</p>
            </div>
            <Link
              href="/listings"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              My Listings
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="SOLD_OUT">Sold Out</option>
                <option value="ALL">All</option>
              </select>
            </div>

            {/* Seller Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seller Type</label>
              <select
                value={filterSellerType}
                onChange={(e) => setFilterSellerType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Sellers</option>
                <option value="FARMER">🌾 Farmers</option>
                <option value="COMPANY">🏢 Companies</option>
              </select>
            </div>

            {/* Crop Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Crop Type</label>
              <select
                value={filterCrop}
                onChange={(e) => setFilterCrop(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Crops</option>
                <option value="RICE">Rice</option>
                <option value="WHEAT">Wheat</option>
                <option value="MAIZE">Maize</option>
                <option value="SUGARCANE">Sugarcane</option>
                <option value="COTTON">Cotton</option>
                <option value="SOYBEAN">Soybean</option>
                <option value="PULSES">Pulses</option>
                <option value="FRUITS">Fruits</option>
                <option value="VEGETABLES">Vegetables</option>
                <option value="SPICES">Spices</option>
                <option value="FORAGE">Forage</option>
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Min Price Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Price (₹)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                step="0.01"
              />
            </div>

            {/* Max Price Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (₹)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                step="0.01"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="newest">Newest</option>
                <option value="cheapest">Cheapest Price</option>
                <option value="expensive">Most Expensive</option>
                <option value="mostAvailable">Most Available</option>
                <option value="mostSold">Most Sold</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {/* Listings */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No listings found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                onNegotiate={user ? () => openNegotiateModal(listing) : null}
                currentUserId={user?._id}
              />
            ))}
          </div>
        )}

        {/* Stats Bar */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{listings.length}</p>
              <p className="text-gray-600">Active Listings</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                {listings.reduce((sum, l) => sum + l.creditsAmount, 0).toLocaleString()}
              </p>
              <p className="text-gray-600">Total tCO2e Available</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                ₹{listings.reduce((sum, l) => sum + l.pricePerCredit * l.creditsAmount, 0).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-gray-600">Total Value</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{new Set(listings.map((l) => l.sellerId?._id)).size}</p>
              <p className="text-gray-600">Sellers</p>
            </div>
          </div>
        </div>

        {/* Negotiation Modal */}
        {showNegotiateModal && selectedListing && (
          <NegotiationModal
            listing={selectedListing}
            onClose={() => setShowNegotiateModal(false)}
            onSubmit={handleSendOffer}
            negotiateData={negotiateData}
            setNegotiateData={setNegotiateData}
            negotiateError={negotiateError}
            negotiateLoading={negotiateLoading}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Listing Card Component
 */
function ListingCard({ listing, onNegotiate, currentUserId }) {
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-300',
    SOLD_OUT: 'bg-gray-100 text-gray-800 border-gray-300',
    DELISTED: 'bg-red-100 text-red-800 border-red-300',
  };

  const getDeterministicIndex = (seed) => {
    const str = String(seed || '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) % 2147483647;
    }
    return Math.abs(hash);
  };

  const getTrustBadge = () => {
    const status = listing?.sellerId?.trustStatus || listing?.sellerTrustStatus;
    if (status === 'TRUSTED') {
      return { label: 'Trustworthy', className: 'bg-green-100 text-green-800 border-green-300' };
    }
    if (status === 'CONFLICTED') {
      return { label: 'Not trustworthy', className: 'bg-red-100 text-red-800 border-red-300' };
    }
    if (status === 'PENDING') {
      return { label: 'Pending verification', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    }

    const seed = listing?.sellerId?._id || listing?.sellerId || listing?._id;
    const variants = [
      { label: 'Pending verification', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      { label: 'Pending verification', className: 'bg-green-100 text-green-800 border-green-300' },
      { label: 'Pending verification', className: 'bg-red-100 text-red-800 border-red-300' },
    ];
    return variants[getDeterministicIndex(seed) % variants.length];
  };

  const sellerTypeBadges = {
    FARMER: {
      label: '🌾 Farmer',
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-200',
    },
    COMPANY: {
      label: '🏢 Company',
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      border: 'border-blue-200',
    },
  };

  const sellerBadge = sellerTypeBadges[listing.sellerType] || sellerTypeBadges.FARMER;

  const totalValue = listing.creditsAmount * listing.pricePerCredit;
  const percentageSold = ((listing.totalSold / listing.creditsAmount) * 100).toFixed(1);
  
  // Check if user is the seller
  const isSeller = currentUserId && listing.sellerId?._id === currentUserId;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {/* Header */}
      <div className="bg-linear-to-r from-green-600 to-emerald-600 text-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold">{formatCropType(listing.cropType)}</h3>
            <p className="text-sm text-green-100">{formatMonth(listing.month)}</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span
              className={`text-xs font-bold px-3 py-1 rounded border ${statusColors[listing.status]}`}
            >
              {listing.status}
            </span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded border ${sellerBadge.bg} ${sellerBadge.text} ${sellerBadge.border}`}
            >
              {sellerBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Seller Info */}
        <div className="border-b pb-3">
          <p className="text-xs text-gray-500">Seller</p>
          <p className="font-semibold text-gray-900">{listing.sellerId?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-600">{listing.sellerId?.email || ''}</p>
          {listing?.sellerId?._id && (
            <div className="mt-2">
              <span className={`inline-block text-[11px] font-bold px-2 py-1 rounded border ${getTrustBadge().className}`}>
                {getTrustBadge().label}
              </span>
            </div>
          )}
        </div>

        {/* Price Box */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">Price per Credit</p>
              <p className="text-2xl font-bold text-green-600">₹{listing.pricePerCredit.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Total Value</p>
              <p className="text-lg font-bold text-gray-900">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-sm text-gray-600 line-clamp-3">{listing.description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded text-center">
            <p className="text-gray-500 font-semibold">Available</p>
            <p className="text-gray-900 font-bold">{listing.availableCredits.toLocaleString()} tCO2e</p>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <p className="text-gray-500 font-semibold">Total</p>
            <p className="text-gray-900 font-bold">{listing.creditsAmount.toLocaleString()} tCO2e</p>
          </div>
          <div className="bg-gray-50 p-2 rounded text-center">
            <p className="text-gray-500 font-semibold">Sold</p>
            <p className="text-gray-900 font-bold">{percentageSold}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-600 h-2 rounded-full transition" style={{ width: `${percentageSold}%` }}></div>
        </div>

        {/* Details Grid */}
        {listing.areaInHectares && (
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
            <div>
              <p className="text-gray-500">Farm Area</p>
              <p className="font-semibold text-gray-900">{listing.areaInHectares} hectares</p>
            </div>
            <div>
              <p className="text-gray-500">Rating</p>
              <p className="font-semibold text-gray-900">
                ⭐ {listing.averageRating.toFixed(1)} ({listing.totalReviews})
              </p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {!isSeller && onNegotiate ? (
          <button
            onClick={onNegotiate}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition mt-4"
          >
            💬 Send Offer & Negotiate
          </button>
        ) : isSeller ? (
          <div className="text-center py-2 text-sm text-gray-600 mt-4">Your listing</div>
        ) : (
          <button
            disabled
            className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded-lg mt-4"
          >
            Login to Offer
          </button>
        )}
      </div>
    </div>
  );
}

function formatCropType(cropType) {
  const labels = {
    RICE: '🌾 Rice',
    WHEAT: '🌾 Wheat',
    MAIZE: '🌽 Maize',
    SUGARCANE: '🌾 Sugarcane',
    COTTON: '🤍 Cotton',
    SOYBEAN: '🌱 Soybean',
    PULSES: '🫘 Pulses',
    FRUITS: '🍎 Fruits',
    VEGETABLES: '🥬 Vegetables',
    SPICES: '🌶️ Spices',
    FORAGE: '🌾 Forage',
    OTHER: '📋 Other',
  };
  return labels[cropType] || cropType;
}

/**
 * Negotiation Modal Component
 */
function NegotiationModal({
  listing,
  onClose,
  onSubmit,
  negotiateData,
  setNegotiateData,
  negotiateError,
  negotiateLoading,
}) {
  const totalPrice = (
    parseFloat(negotiateData.creditsRequested) * parseFloat(negotiateData.negotiatedPrice)
  ).toFixed(2);

  const discount =
    negotiateData.negotiatedPrice < listing.pricePerCredit
      ? (
          ((listing.pricePerCredit - negotiateData.negotiatedPrice) / listing.pricePerCredit) *
          100
        ).toFixed(1)
      : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 sticky top-0">
          <h2 className="text-2xl font-bold">Send Offer</h2>
          <p className="text-green-100 text-sm mt-1">{listing.month} - {formatCropType(listing.cropType)}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {negotiateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {negotiateError}
            </div>
          )}

          {/* Credits Requested */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credits Requested (tCO2e) *
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.01"
              max={listing.availableCredits}
              value={negotiateData.creditsRequested}
              onChange={(e) =>
                setNegotiateData({ ...negotiateData, creditsRequested: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {listing.availableCredits.toLocaleString()} tCO2e
            </p>
          </div>

          {/* Price Per Credit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offered Price (₹ per credit) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="10000"
              value={negotiateData.negotiatedPrice}
              onChange={(e) =>
                setNegotiateData({ ...negotiateData, negotiatedPrice: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="e.g., 50"
            />
            <p className="text-xs text-gray-500 mt-1">
              List price: ₹{listing.pricePerCredit.toFixed(2)}
              {discount > 0 && (
                <span className="text-green-600 font-semibold ml-2">
                  {discount}% discount
                </span>
              )}
            </p>
          </div>

          {/* Total Price */}
          {negotiateData.creditsRequested && negotiateData.negotiatedPrice && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Offer:</span>
                <span className="font-bold text-green-600">₹{parseFloat(totalPrice).toLocaleString('en-IN')}</span>
              </div>
              {negotiateData.negotiatedPrice < listing.pricePerCredit && (
                <p className="text-xs text-green-600 mt-1">
                  You're offering ₹{(parseFloat(negotiateData.negotiatedPrice) * parseFloat(negotiateData.creditsRequested)).toFixed(2)} less than list price
                </p>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optional Message
            </label>
            <textarea
              value={negotiateData.message}
              onChange={(e) => setNegotiateData({ ...negotiateData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              rows="3"
              placeholder="Add a message to your offer..."
              maxLength="500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {negotiateData.message.length}/500
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={negotiateLoading}
              className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={negotiateLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {negotiateLoading ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
