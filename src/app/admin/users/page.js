'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm);

    let matchesRole = filterRole === 'ALL';
    if (filterRole === 'SELLER') {
      matchesRole = u.role === 'SELLER' || u.role === 'FARMER';
    } else if (filterRole === 'BUYER') {
      matchesRole = u.role === 'BUYER' || u.role === 'COMPANY';
    } else if (filterRole === 'ADMIN') {
      matchesRole = u.role === 'ADMIN';
    }

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-900 border-red-200';
      case 'SELLER':
      case 'FARMER':
        return 'bg-[#1B4332]/10 text-[#1B4332] border-[#1B4332]/20';
      case 'BUYER':
      case 'COMPANY':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading user directory...</p>
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
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              User Directory
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
              Platform Registered Users
            </h1>
            <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
              Browse all seller producers, enterprise buyers, and platform administrators.
            </p>
          </div>

          <span className="text-xs font-bold px-4 py-2 bg-white rounded-2xl border border-[#1B4332]/20 text-[#1B4332]">
            Total Users: {users.length}
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {['ALL', 'SELLER', 'BUYER', 'ADMIN'].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterRole === role
                    ? 'bg-[#1B4332] text-white shadow-sm'
                    : 'bg-[#FAF8F2] text-zinc-600 hover:bg-zinc-100 border border-[#1B4332]/10'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F2] text-[#0B1F17] uppercase font-bold text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="p-4 rounded-l-2xl">User Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">State</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right rounded-r-2xl">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-zinc-50/80 transition">
                    <td className="p-4 font-bold text-[#0B1F17]">
                      {u.name || 'Unnamed User'}
                    </td>
                    <td className="p-4 font-mono text-zinc-700">
                      {u.email}
                    </td>
                    <td className="p-4 text-zinc-600">
                      {u.phone || '—'}
                    </td>
                    <td className="p-4 font-semibold text-zinc-800">
                      {u.state || 'India'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
