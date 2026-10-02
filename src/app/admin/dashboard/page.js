'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
        const userResponse = await fetch('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!userResponse.ok) {
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();

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
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading administrator oversight portal...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center bg-white p-10 rounded-3xl shadow-lg border border-red-200">
          <p className="font-display text-2xl font-bold text-red-700 mb-2">Access Denied</p>
          <p className="text-zinc-600 text-xs mb-6">Administrator privileges required.</p>
          <Link href="/" className="btn-pill btn-pill-solid text-xs !py-2.5 !px-6">
            Back to Home
          </Link>
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
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B1F17] flex items-center justify-center text-white">
                <span className="text-sm">🛡️</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-red-100 text-red-900 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
              Platform Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-600 hidden sm:inline font-mono">
              admin: {user.name || user.email}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                document.cookie = 'authToken=; path=/; max-age=0;';
                router.push('/login');
              }}
              className="btn-pill btn-pill-ghost text-xs !py-1.5 !px-4"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#0B1F17] tracking-tight">
              Platform Registry & Verification Desk
            </h1>
            <p className="text-zinc-600 text-sm mt-2 max-w-xl leading-relaxed">
              Oversee seller KYC documentation, verified carbon credit listings catalog, smart contract batch minting, and platform risk.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/admin/verifications"
              className="btn-pill btn-pill-solid text-xs !py-3 !px-6 shadow-md"
            >
              📑 KYC Queue ({stats.pendingVerifications})
            </Link>
            <Link
              href="/admin/listings"
              className="btn-pill bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/20 font-semibold text-xs !py-3 !px-5"
            >
              📦 Listings Catalog ({stats.totalListings})
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Stats Grid - Clean 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pending KYC */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Pending KYC</p>
                <h3 className="font-display text-4xl font-extrabold text-[#6B4226] mt-1">
                  {stats.pendingVerifications}
                </h3>
              </div>
              <span className="text-2xl">📋</span>
            </div>
            <Link
              href="/admin/verifications"
              className="text-xs text-[#1B4332] font-bold hover:underline mt-4 pt-3 border-t border-zinc-100 block"
            >
              Review Documents →
            </Link>
          </div>

          {/* Total Users */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Total Users</p>
                <h3 className="font-display text-4xl font-extrabold text-[#0B1F17] mt-1">
                  {stats.totalUsers.toLocaleString()}
                </h3>
              </div>
              <span className="text-2xl">👥</span>
            </div>
            <Link
              href="/admin/users"
              className="text-xs text-[#1B4332] font-bold hover:underline mt-4 pt-3 border-t border-zinc-100 block"
            >
              Manage Users →
            </Link>
          </div>

          {/* Total Listings */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Total Listings</p>
                <h3 className="font-display text-4xl font-extrabold text-[#1B4332] mt-1">
                  {stats.totalListings.toLocaleString()}
                </h3>
              </div>
              <span className="text-2xl">🌿</span>
            </div>
            <Link
              href="/admin/listings"
              className="text-xs text-[#1B4332] font-bold hover:underline mt-4 pt-3 border-t border-zinc-100 block"
            >
              Audit Listings →
            </Link>
          </div>

          {/* Flagged */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Flagged Items</p>
                <h3 className="font-display text-4xl font-extrabold text-red-600 mt-1">
                  {stats.flaggedListings}
                </h3>
              </div>
              <span className="text-2xl">⚠️</span>
            </div>
            <Link
              href="/admin/flagged"
              className="text-xs text-red-600 font-bold hover:underline mt-4 pt-3 border-t border-zinc-100 block"
            >
              Inspect Flagged →
            </Link>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm">
          <h2 className="font-display text-xl font-bold text-[#0B1F17] mb-6">
            Administrator Oversight Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/admin/verifications')}
              className="p-5 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 text-left transition shadow-xs hover:shadow-md"
            >
              <span className="text-2xl block mb-2">📑</span>
              <p className="font-bold text-[#0B1F17] text-sm">Process KYC Queue</p>
              <p className="text-xs text-zinc-500 mt-1">Review pending identity & registration documents</p>
            </button>

            <button
              onClick={() => router.push('/admin/listings')}
              className="p-5 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 text-left transition shadow-xs hover:shadow-md"
            >
              <span className="text-2xl block mb-2">🌿</span>
              <p className="font-bold text-[#0B1F17] text-sm">Listings Audit & Mint</p>
              <p className="text-xs text-zinc-500 mt-1">Audit active credit listings & manage tokenization</p>
            </button>

            <button
              onClick={() => router.push('/admin/reports')}
              className="p-5 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 text-left transition shadow-xs hover:shadow-md"
            >
              <span className="text-2xl block mb-2">📊</span>
              <p className="font-bold text-[#0B1F17] text-sm">Registry Reports</p>
              <p className="text-xs text-zinc-500 mt-1">Export transaction & offset audit ledgers</p>
            </button>

            <button
              onClick={() => router.push('/admin/settings')}
              className="p-5 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 text-left transition shadow-xs hover:shadow-md"
            >
              <span className="text-2xl block mb-2">⚙️</span>
              <p className="font-bold text-[#0B1F17] text-sm">Smart Contract Controls</p>
              <p className="text-xs text-zinc-500 mt-1">Polygon RPC, registry parameters, & wallets</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
