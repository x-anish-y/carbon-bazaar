'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [tokenizedListings, setTokenizedListings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedWallet, setCopiedWallet] = useState(false);

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
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();
        const userInfo = userData.data;

        // Check if user is SELLER / FARMER
        if (userInfo.role !== 'SELLER' && userInfo.role !== 'FARMER') {
          if (userInfo.role === 'BUYER' || userInfo.role === 'COMPANY') {
            router.push('/buyer/dashboard');
          } else if (userInfo.role === 'ADMIN') {
            router.push('/admin/dashboard');
          } else {
            router.push('/');
          }
          return;
        }

        setUser(userInfo);

        // Fetch seller stats
        const statsResponse = await fetch('/api/seller/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.data);
        }

        // Fetch seller listings
        const listingsResponse = await fetch(`/api/listings?sellerId=${userInfo._id || userInfo.userId}&limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          const allListings = Array.isArray(listingsData.data) ? listingsData.data : [];
          setListings(allListings);

          const tokenized = allListings.filter(
            (l) => l.tokenId || l.batchId?.tokenId || l.batchId?.mintTxHash
          );
          setTokenizedListings(tokenized);
        }

        // Fetch seller trades
        const tradesResponse = await fetch('/api/seller/trades', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          setTrades(tradesData.data?.trades || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load seller dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const copyWalletAddress = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading your seller dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white">
                <span className="text-sm">🌾</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              Seller Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-xs font-semibold text-zinc-600 hover:text-[#1B4332] transition hidden sm:inline">
              Marketplace
            </Link>
            <Link
              href="/listings/create"
              className="btn-pill btn-pill-solid text-xs !py-2 !px-5 shadow-sm"
            >
              + List New Credits
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                document.cookie = 'authToken=; path=/; max-age=0;';
                router.push('/login');
              }}
              className="btn-pill btn-pill-ghost text-xs !py-2 !px-4"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="eyebrow mb-1">Seller Desk</span>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#0B1F17] tracking-tight">
              Namaste, {user?.name?.split(' ')[0] || 'Seller'}!
            </h1>
            <p className="text-zinc-600 text-sm mt-2 max-w-xl leading-relaxed">
              Track your agricultural carbon generation, verified credit batches, and earnings.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/listings/create"
              className="btn-pill btn-pill-solid text-xs !py-3 !px-6 shadow-md"
            >
              + List Carbon Credits
            </Link>
            <Link
              href="/seller/trades"
              className="btn-pill bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/20 font-semibold text-xs !py-3 !px-5"
            >
              🤝 Trade Offers ({trades.length})
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Climate Registry Status Bar */}
        {user?.wallet?.address && (
          <div className="bg-[#FAF8F2] rounded-2xl p-4 border border-[#1B4332]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-[#0B1F17]">Climate Registry Account:</span>
              <span className="font-mono text-zinc-700 bg-white px-2 py-0.5 rounded border border-[#1B4332]/15 font-medium">
                {user.wallet.address ? `${user.wallet.address.substring(0, 10)}...${user.wallet.address.substring(34)}` : 'Active'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/40">
              ✓ Verified Seller Status
            </span>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Credits Listed */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Total Listed</p>
                <h3 className="font-display text-4xl font-extrabold text-[#0B1F17] mt-1">
                  {stats?.totalCreditsListed || 0}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">tCO₂e generated</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                🌾
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
              <span>{stats?.activeListings || 0} Active Batches</span>
              <span className="text-emerald-700 font-semibold">{stats?.soldOutListings || 0} Sold</span>
            </div>
          </div>

          {/* Card 2: Total Earnings All Time */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Total Revenue</p>
                <h3 className="font-display text-4xl font-extrabold text-[#1B4332] mt-1 flex items-baseline">
                  <span className="font-sans text-3xl font-semibold mr-1">₹</span>
                  {(stats?.totalEarnings || 0).toLocaleString('en-IN')}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">All-time settled</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                💰
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
              Direct to Seller account
            </div>
          </div>

          {/* Card 3: In-Wallet Owned Credits */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">In-Wallet Balance</p>
                <h3 className="font-display text-4xl font-extrabold text-[#1B4332] mt-1">
                  {stats?.availableCreditsOwned ?? 0}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">tCO₂e in wallet</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-2xl">
                🌿
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
              <Link href="/portfolio" className="text-[#1B4332] font-bold hover:underline">
                Manage Portfolio →
              </Link>
              <Link href="/listings/create" className="text-emerald-700 font-semibold hover:underline">
                + List
              </Link>
            </div>
          </div>

          {/* Card 4: Current Month Market Rate */}
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Market Rate</p>
                <h3 className="font-display text-4xl font-extrabold text-[#606C38] mt-1 flex items-baseline">
                  <span className="font-sans text-3xl font-semibold mr-1">₹</span>
                  {(stats?.currentMarketRate || 1200).toLocaleString('en-IN')}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">/ tCO₂e ({new Date().toLocaleString('en-US', { month: 'short' })} {new Date().getFullYear()})</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#606C38]/10 flex items-center justify-center text-xl">
                📈
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
              <span className="text-emerald-700 font-semibold">+8.4% MoM Trend</span>
              <span className="text-zinc-400">National Index</span>
            </div>
          </div>
        </div>

        {/* On-Chain Tokenized Batches Table */}
        <div className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-bold text-[#0B1F17]">
                Verified Carbon Batches
              </h3>
              <p className="text-zinc-500 text-xs mt-0.5">
                Certified carbon credits recorded on the official registry
              </p>
            </div>

            <Link
              href="/listings/create"
              className="btn-pill btn-pill-ghost text-xs !py-2 !px-4"
            >
              + Add Batch
            </Link>
          </div>

          {tokenizedListings.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              <span className="text-3xl block mb-2">📜</span>
              No verified batches yet. Once certified and listed, your batches will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F2] text-[#0B1F17] uppercase font-bold text-[10px] tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Batch ID</th>
                    <th className="p-3.5">Credit Type & Vintage</th>
                    <th className="p-3.5">Total Issued</th>
                    <th className="p-3.5">Available</th>
                    <th className="p-3.5">Sold</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right rounded-r-xl">Registry Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {tokenizedListings.map((l) => (
                    <tr key={l._id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-extrabold text-[#1B4332]">
                        #{l.tokenId || l.batchId?.tokenId || '—'}
                      </td>
                      <td className="p-3.5 font-semibold text-[#0B1F17]">
                        {l.creditType === 'PREMIUM' ? '⭐ Premium' : l.creditType === 'MEDIUM' ? '🌿 Medium' : '🛡️ Baseline'} ({l.month})
                      </td>
                      <td className="p-3.5 font-bold text-zinc-900">{l.creditsAmount} tCO₂e</td>
                      <td className="p-3.5 font-bold text-[#1B4332]">{l.availableCredits} tCO₂e</td>
                      <td className="p-3.5 text-zinc-600">{l.totalSold || 0} tCO₂e</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1B4332]/10 text-[#1B4332] border border-[#1B4332]/20">
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {l.batchId?.mintTxHash ? (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(l.batchId.mintTxHash);
                              alert('Mint transaction hash copied to clipboard!');
                            }}
                            className="font-mono text-[11px] text-[#1B4332] hover:underline"
                            title={l.batchId.mintTxHash}
                          >
                            {l.batchId.mintTxHash.slice(0, 8)}...{l.batchId.mintTxHash.slice(-6)} ↗
                          </button>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
