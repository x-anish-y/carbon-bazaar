'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [listings, setListings] = useState([]);
  const [buyRequests, setBuyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    month: '',
    creditsAmount: '',
    pricePerCredit: '',
    cropType: 'OTHER',
    description: '',
    areaInHectares: '',
    methodology: '',
  });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' or 'requests'

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    try {
      // Get user info
      const userResponse = await fetch('/api/auth/verify', {
        credentials: 'include',
      });

      if (!userResponse.ok) {
        router.push('/login');
        return;
      }

      const userData = await userResponse.json();
      setUser(userData.user);
      setUserRole(userData.user.role);

      if (userData.user.role !== 'COMPANY') {
        router.push('/');
        return;
      }

      // Fetch listings and requests
      await fetchListings(userData.user._id);
      await fetchBuyRequests(userData.user._id);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async (userId) => {
    try {
      const response = await fetch(`/api/listings?sellerId=${userId}&sellerType=COMPANY`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    }
  };

  const fetchBuyRequests = async (userId) => {
    try {
      const response = await fetch('/api/buy-requests?type=received', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBuyRequests(data.data);
      }
    } catch (err) {
      console.error('Error fetching buy requests:', err);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      // Validate
      if (!formData.month || !formData.creditsAmount || !formData.pricePerCredit || !formData.description) {
        setFormError('Please fill in all required fields');
        setFormLoading(false);
        return;
      }

      const creditsAmount = parseFloat(formData.creditsAmount);
      const pricePerCredit = parseFloat(formData.pricePerCredit);

      if (creditsAmount <= 0 || creditsAmount > 1000000) {
        setFormError('Credits must be between 0.01 and 1,000,000');
        setFormLoading(false);
        return;
      }

      if (pricePerCredit <= 0 || pricePerCredit > 10000) {
        setFormError('Price must be between ₹1 and ₹10,000');
        setFormLoading(false);
        return;
      }

      const response = await fetch('/api/listings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: formData.month,
          creditsAmount,
          pricePerCredit,
          cropType: formData.cropType,
          description: formData.description,
          areaInHectares: formData.areaInHectares ? parseFloat(formData.areaInHectares) : null,
          methodology: formData.methodology,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setFormError(error.message || 'Failed to create listing');
        setFormLoading(false);
        return;
      }

      const result = await response.json();
      setListings([result.data, ...listings]);
      setShowForm(false);
      setFormData({
        month: '',
        creditsAmount: '',
        pricePerCredit: '',
        cropType: 'OTHER',
        description: '',
        areaInHectares: '',
        methodology: '',
      });
      setFormError(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const response = await fetch(`/api/listings?id=${listingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setListings(listings.filter((l) => l._id !== listingId));
      } else {
        alert('Failed to delete listing');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleBuyRequest = async (requestId, action, sellerResponse = '') => {
    try {
      const response = await fetch(`/api/buy-requests?id=${requestId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sellerResponse,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setBuyRequests(
          buyRequests.map((r) => (r._id === requestId ? result.data : r))
        );
      } else {
        alert('Failed to update request');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'COMPANY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <p className="text-red-600 font-semibold mb-4">Only companies can access this page</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Company Carbon Credits</h1>
          <p className="text-gray-600">Manage your carbon credit listings and purchase requests</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('listings')}
            className={`py-3 px-6 font-semibold border-b-2 transition ${
              activeTab === 'listings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 My Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-6 font-semibold border-b-2 transition ${
              activeTab === 'requests'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📬 Buy Requests ({buyRequests.filter((r) => r.status === 'PENDING').length})
          </button>
        </div>

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div>
            {/* Create Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  + Create New Listing
                </button>
              ) : (
                <form onSubmit={handleCreateListing} className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Create Carbon Credit Listing</h2>

                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Month */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                      <input
                        type="month"
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Credits Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Credits Amount (tCO2e) *</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.creditsAmount}
                        onChange={(e) => setFormData({ ...formData, creditsAmount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.01"
                        required
                      />
                    </div>

                    {/* Price Per Credit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Credit (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pricePerCredit}
                        onChange={(e) => setFormData({ ...formData, pricePerCredit: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Crop Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Crop Type *</label>
                      <select
                        value={formData.cropType}
                        onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
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
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    {/* Area */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Farm Area (hectares)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.areaInHectares}
                        onChange={(e) => setFormData({ ...formData, areaInHectares: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>

                    {/* Methodology */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Methodology</label>
                      <select
                        value={formData.methodology}
                        onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select methodology</option>
                        <option value="REGENERATIVE_AGRICULTURE">Regenerative Agriculture</option>
                        <option value="CROP_ROTATION">Crop Rotation</option>
                        <option value="AGROFORESTRY">Agroforestry</option>
                        <option value="CONSERVATION_TILLAGE">Conservation Tillage</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      placeholder="Describe your carbon credits..."
                      required
                      maxLength="1000"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000</p>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      {formLoading ? 'Creating...' : 'Create Listing'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setFormError(null);
                      }}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Listings Grid */}
            {listings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600 text-lg">No listings yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <ListingCardManage
                    key={listing._id}
                    listing={listing}
                    onDelete={handleDeleteListing}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buy Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            {buyRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600 text-lg">No buy requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {buyRequests.map((request) => (
                  <BuyRequestCard
                    key={request._id}
                    request={request}
                    onApprove={() => handleBuyRequest(request._id, 'approve')}
                    onReject={() => handleBuyRequest(request._id, 'reject')}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Listing Card for Management
 */
function ListingCardManage({ listing, onDelete }) {
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    SOLD_OUT: 'bg-gray-100 text-gray-800',
    DELISTED: 'bg-red-100 text-red-800',
  };

  const totalValue = listing.creditsAmount * listing.pricePerCredit;
  const percentageSold = ((listing.totalSold / listing.creditsAmount) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold">{listing.month}</h3>
            <p className="text-sm text-blue-100">{listing.cropType}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded ${statusColors[listing.status]}`}>
            {listing.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Credits</p>
            <p className="font-bold text-gray-900">{listing.creditsAmount.toLocaleString()} tCO2e</p>
          </div>
          <div>
            <p className="text-gray-600">Price</p>
            <p className="font-bold text-gray-900">₹{listing.pricePerCredit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Available</p>
            <p className="font-bold text-gray-900">{listing.availableCredits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Value</p>
            <p className="font-bold text-gray-900">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Sold</span>
            <span className="font-semibold">{percentageSold}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentageSold}%` }}></div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2">{listing.description}</p>

        {/* Action Buttons */}
        <button
          onClick={() => onDelete(listing._id)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/**
 * Buy Request Card
 */
function BuyRequestCard({ request, onApprove, onReject }) {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const totalPrice = request.creditsRequested * request.pricePerCredit;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{request.listingId?.month}</h3>
          <p className="text-sm text-gray-600">
            From: <span className="font-semibold">{request.buyerId?.name}</span>
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded ${statusColors[request.status]}`}>
          {request.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-600">Credits Requested</p>
          <p className="font-bold text-gray-900">{request.creditsRequested.toLocaleString()} tCO2e</p>
        </div>
        <div>
          <p className="text-gray-600">Price Per Credit</p>
          <p className="font-bold text-gray-900">₹{request.pricePerCredit.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600">Total Price</p>
          <p className="font-bold text-green-600">₹{totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-gray-600">Requested On</p>
          <p className="font-bold text-gray-900">{new Date(request.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {request.buyerMessage && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-xs text-gray-600 font-semibold mb-1">Buyer Message:</p>
          <p className="text-sm text-gray-900">{request.buyerMessage}</p>
        </div>
      )}

      {request.status === 'PENDING' && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            ✓ Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );
}
