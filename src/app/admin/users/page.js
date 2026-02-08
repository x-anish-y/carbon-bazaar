'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [router]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesRole = filterRole === 'ALL' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'FARMER':
        return 'bg-green-100 text-green-800';
      case 'BUYER':
        return 'bg-blue-100 text-blue-800';
      case 'COMPANY':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrustBadge = (user) => {
    const status = user?.trustStatus;

    if (status === 'CONFLICTED') {
      return { className: 'bg-red-50 text-red-700', label: 'Not trustworthy' };
    }

    if (status === 'TRUSTED') {
      return { className: 'bg-green-50 text-green-700', label: 'Trustworthy' };
    }

    return { className: 'bg-yellow-50 text-yellow-700', label: 'Pending verification' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading users...</p>
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
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-sm mb-2 font-medium"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
              <p className="text-gray-600 mt-1">
                Total Users: <span className="font-bold text-blue-600">{filteredUsers.length}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name, Email, or Phone
              </label>
              <input
                type="text"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="FARMER">Farmer</option>
                <option value="BUYER">Buyer</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No users found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Listings</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Trust</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.phone || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.state && user.district ? `${user.district}, ${user.state}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-center">
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                            {user.stats?.documents || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-center">
                          <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded text-sm font-medium">
                            {user.stats?.listings || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-center">
                          {(() => {
                            const badge = getTrustBadge(user);
                            return (
                              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          {filteredUsers.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Documents</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredUsers.reduce((sum, u) => sum + (u.stats?.documents || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total Listings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredUsers.reduce((sum, u) => sum + (u.stats?.listings || 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Verified Docs</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {filteredUsers.reduce((sum, u) => sum + (u.stats?.verifiedDocuments || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
