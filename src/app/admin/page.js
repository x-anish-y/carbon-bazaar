'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CROP_TYPES = {
  RICE: 'Rice',
  WHEAT: 'Wheat',
  MAIZE: 'Maize',
  SUGARCANE: 'Sugarcane',
  COTTON: 'Cotton',
  SOYBEAN: 'Soybean',
  PULSES: 'Pulses',
  FRUITS: 'Fruits',
  VEGETABLES: 'Vegetables',
  SPICES: 'Spices',
  FORAGE: 'Forage',
  OTHER: 'Other',
};

const DOCUMENT_TYPES = {
  AADHAAR: 'Aadhaar Card',
  LAND_RECORD: 'Land Record',
  PAN: 'PAN Card',
  GST_CERTIFICATE: 'GST Certificate',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [verifications, setVerifications] = useState([]);
  const [listings, setListings] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState('PENDING');
  const [listingStatus, setListingStatus] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [verificationPage, setVerificationPage] = useState(0);
  const [listingPage, setListingPage] = useState(0);

  // Check admin access on mount
  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const res = await fetch('/api/auth/verify');
      const data = await res.json();

      if (!data.success || data.data.role !== 'ADMIN') {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      fetchStats();
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchVerifications = async (page = 0) => {
    try {
      const params = new URLSearchParams({
        status: verificationStatus,
        limit: pageSize,
        skip: page * pageSize,
      });

      const res = await fetch(`/api/admin/verifications?${params}`);
      const data = await res.json();

      if (data.success) {
        setVerifications(data.data.documents);
        setVerificationPage(page);
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
    }
  };

  const fetchListings = async (page = 0) => {
    try {
      const params = new URLSearchParams({
        limit: pageSize,
        skip: page * pageSize,
      });

      if (listingStatus) {
        params.append('status', listingStatus);
      }

      const res = await fetch(`/api/admin/listings?${params}`);
      const data = await res.json();

      if (data.success) {
        setListings(data.data.listings);
        setListingPage(page);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const handleVerifyDocument = async (documentId, action, reason = '') => {
    try {
      setProcessingId(documentId);

      const res = await fetch('/api/admin/verifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          action,
          rejectionReason: reason,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Document ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
        fetchVerifications(verificationPage);
        fetchStats();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Failed to process verification');
    } finally {
      setProcessingId(null);
    }
  };

  const handleListingAction = async (listingId, action) => {
    try {
      setProcessingId(listingId);

      const res = await fetch('/api/admin/listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          action,
          adminNotes: `Listing ${action === 'DELIST' ? 'delisted' : 'activated'} by admin`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Listing ${action === 'DELIST' ? 'delisted' : 'activated'} successfully`);
        fetchListings(listingPage);
        fetchStats();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing');
    } finally {
      setProcessingId(null);
    }
  };

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'verifications' && verifications.length === 0) {
      fetchVerifications(0);
    } else if (activeTab === 'listings' && listings.length === 0) {
      fetchListings(0);
    }
  }, [activeTab]);

  // Reload verifications when status filter changes
  useEffect(() => {
    if (activeTab === 'verifications') {
      fetchVerifications(0);
    }
  }, [verificationStatus]);

  // Reload listings when status filter changes
  useEffect(() => {
    if (activeTab === 'listings') {
      fetchListings(0);
    }
  }, [listingStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Carbon Bazaar Administration Panel</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {['overview', 'verifications', 'listings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 font-medium text-sm border-b-2 transition ${
                  activeTab === tab
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Verifications Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Verifications</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.verifications.pending}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                </div>
              </div>

              {/* Users Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users.total}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.users.verified} verified
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">👥</span>
                  </div>
                </div>
              </div>

              {/* Listings Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Listings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.listings.total}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.listings.active} active
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🌾</span>
                  </div>
                </div>
              </div>

              {/* Farmers/Companies Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Farmer / Company</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {stats.users.farmers} / {stats.users.companies}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🏭</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Pending Verifications */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recent Pending Verifications
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {stats.recentActivity.pendingVerifications.map((doc) => (
                    <div key={doc._id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{doc.userId.name}</p>
                          <p className="text-sm text-gray-600">{doc.documentType}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                  {stats.recentActivity.pendingVerifications.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No pending verifications
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Listings */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Listings</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {stats.recentActivity.recentListings.map((listing) => (
                    <div key={listing._id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {listing.creditsAmount} tCO2e
                          </p>
                          <p className="text-sm text-gray-600">
                            {CROP_TYPES[listing.cropType]} • {listing.sellerId.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            ₹{listing.pricePerCredit}/credit
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            listing.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : listing.status === 'SOLD_OUT'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Verifications Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Document Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Document Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {verifications.map((doc) => (
                    <tr key={doc._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{doc.userId.name}</p>
                          <p className="text-sm text-gray-600">{doc.userId.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {DOCUMENT_TYPES[doc.documentType]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.documentNumber}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            doc.verificationStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : doc.verificationStatus === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {doc.verificationStatus === 'PENDING' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerifyDocument(doc._id, 'APPROVE')}
                              disabled={processingId === doc._id}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                            >
                              {processingId === doc._id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason:');
                                if (reason) {
                                  handleVerifyDocument(doc._id, 'REJECT', reason);
                                }
                              }}
                              disabled={processingId === doc._id}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">No actions available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {verifications.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No {verificationStatus.toLowerCase()} verifications found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={listingStatus}
                onChange={(e) => setListingStatus(e.target.value)}
                className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SOLD_OUT">Sold Out</option>
                <option value="DELISTED">Delisted</option>
              </select>
            </div>

            {/* Listings Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Credits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Crop Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Price/Credit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Available
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listings.map((listing) => (
                    <tr key={listing._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{listing.sellerId.name}</p>
                          <p className="text-sm text-gray-600">{listing.sellerType}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {listing.creditsAmount} tCO2e
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {CROP_TYPES[listing.cropType]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">₹{listing.pricePerCredit}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {listing.availableCredits} tCO2e
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            listing.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : listing.status === 'SOLD_OUT'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {listing.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleListingAction(listing._id, 'DELIST')}
                            disabled={processingId === listing._id}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                          >
                            {processingId === listing._id ? 'Processing...' : 'Delist'}
                          </button>
                        ) : listing.status === 'DELISTED' ? (
                          <button
                            onClick={() => handleListingAction(listing._id, 'ACTIVATE')}
                            disabled={processingId === listing._id}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                          >
                            {processingId === listing._id ? 'Processing...' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-gray-500 text-xs">No actions available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {listings.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No listings found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
