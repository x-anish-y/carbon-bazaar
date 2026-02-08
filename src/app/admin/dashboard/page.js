'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    pendingLandVerifications: 0,
    totalUsers: 0,
    totalListings: 0,
    flaggedListings: 0,
  });
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);

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

        // Fetch pending verifications
        const verifyResponse = await fetch('/api/documents/verify?status=PENDING', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          setStats((prev) => ({
            ...prev,
            pendingVerifications: verifyData.data?.length || 0,
          }));
        }

        // Fetch pending land verifications
        const landStatsResponse = await fetch('/api/land-verifications/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (landStatsResponse.ok) {
          const landStatsData = await landStatsResponse.json();
          setStats((prev) => ({
            ...prev,
            pendingLandVerifications: landStatsData?.data?.pending || 0,
          }));
        }

        // Fetch total users
        const usersResponse = await fetch('/api/admin/users?action=count', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setStats((prev) => ({
            ...prev,
            totalUsers: usersData.count || usersData.data || 0,
          }));
        }

        // Fetch total listings
        const listingsResponse = await fetch('/api/admin/listings/count', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          setStats((prev) => ({
            ...prev,
            totalListings: listingsData.count || listingsData.data || 0,
          }));
        }

        // Fetch flagged listings
        const flaggedResponse = await fetch('/api/admin/listings/flagged', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (flaggedResponse.ok) {
          const flaggedData = await flaggedResponse.json();
          setStats((prev) => ({
            ...prev,
            flaggedListings: flaggedData.count || flaggedData.data?.length || 0,
          }));
        }

        // Fetch recent activity
        const activityResponse = await fetch('/api/admin/activity/recent', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setRecentActivity(activityData.data || []);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-4">Access Denied</p>
          <p className="text-gray-600 mb-4">You don't have permission to access this page</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Home
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Carbon Bazaar Platform Management</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Logged in as: {user.name || user.email}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  router.push('/login');
                }}
                className="px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Pending Verifications */}
          <div className="bg-white rounded border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">PENDING VERIFICATIONS</h3>
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-2">
              {stats.pendingVerifications}
            </p>
            <button
              onClick={() => router.push('/admin/verifications')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View Pending →
            </button>
          </div>

          {/* Pending Land Verifications */}
          <div className="bg-white rounded border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">PENDING LAND VERIFICATIONS</h3>
              <span className="text-2xl">🌾</span>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-2">
              {stats.pendingLandVerifications}
            </p>
            <button
              onClick={() => router.push('/admin/land-verifications')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Review Pending →
            </button>
          </div>

          {/* Total Users */}
          <div className="bg-white rounded border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">TOTAL USERS</h3>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              {stats.totalUsers.toLocaleString()}
            </p>
            <button
              onClick={() => router.push('/admin/users')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View Users →
            </button>
          </div>

          {/* Total Listings */}
          <div className="bg-white rounded border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">TOTAL LISTINGS</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-2">
              {stats.totalListings.toLocaleString()}
            </p>
            <button
              onClick={() => router.push('/admin/listings')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View Listings →
            </button>
          </div>

          {/* Flagged Listings */}
          <div className="bg-white rounded border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">FLAGGED LISTINGS</h3>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-3xl font-bold text-red-600 mb-2">
              {stats.flaggedListings}
            </p>
            <button
              onClick={() => router.push('/admin/flagged')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Review Flagged →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/verifications')}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 text-left"
            >
              <p className="font-bold text-gray-900">Process Verifications</p>
              <p className="text-sm text-gray-600">Review pending KYC documents</p>
            </button>
            <button
              onClick={() => router.push('/admin/land-verifications')}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 text-left"
            >
              <p className="font-bold text-gray-900">Review Land Verifications</p>
              <p className="text-sm text-gray-600">Approve/reject land match results</p>
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 text-left"
            >
              <p className="font-bold text-gray-900">Generate Reports</p>
              <p className="text-sm text-gray-600">Export platform statistics</p>
            </button>
            <button
              onClick={() => router.push('/admin/settings')}
              className="p-4 border border-gray-300 rounded hover:bg-gray-50 text-left"
            >
              <p className="font-bold text-gray-900">Platform Settings</p>
              <p className="text-sm text-gray-600">Manage system configurations</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between pb-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">{activity.details}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded border border-gray-300">
          <p className="text-xs text-gray-700">
            <strong>Admin Dashboard v1.0</strong> · Last updated: {new Date().toLocaleString()} · Internal Use Only
          </p>
        </div>
      </main>
    </div>
  );
}
