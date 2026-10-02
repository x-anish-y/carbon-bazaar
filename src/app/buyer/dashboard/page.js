'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';

function BuyerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    creditsOwned: 0,
    creditsRetired: 0,
    totalPurchased: 0,
    creditsRequired: 5000,
    creditsDeficit: 5000,
    totalSpent: 0,
    compliancePercentage: 0,
    averagePricePerCredit: 0,
    offersCount: 0,
    recentOffers: [],
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.data;
          setUser(userData);

          if (userData.role !== 'BUYER' && userData.role !== 'COMPANY') {
            if (userData.role === 'SELLER' || userData.role === 'FARMER') {
              router.push('/seller/dashboard');
            } else if (userData.role === 'ADMIN') {
              router.push('/admin/dashboard');
            } else {
              router.push('/');
            }
            return;
          }

          const statsResponse = await fetch('/api/buyer/stats', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData.data);
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
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
          <p className="text-sm font-semibold text-[#0B1F17]">Loading buyer climate portal...</p>
        </div>
      </div>
    );
  }

  const compliancePercent = stats.compliancePercentage !== undefined
    ? stats.compliancePercentage
    : (stats.creditsRequired > 0 ? (stats.creditsRetired / stats.creditsRequired) * 100 : 0);
  const isCompliant = stats.creditsRetired >= stats.creditsRequired && stats.creditsRequired > 0;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white">
                <span className="text-sm">🏢</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              Buyer Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-xs font-semibold text-zinc-600 hover:text-[#1B4332] transition hidden sm:inline">
              Marketplace
            </Link>
            <Link href="/portfolio" className="text-xs font-semibold text-zinc-600 hover:text-[#1B4332] transition hidden sm:inline">
              Portfolio
            </Link>
            <Link href="/retire" className="btn-pill btn-pill-solid text-xs !py-2 !px-4 shadow-sm">
              Retire Credits
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
            <span className="eyebrow mb-1">Buyer Desk</span>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#0B1F17] tracking-tight">
              Welcome, {user?.name || 'Buyer'}!
            </h1>
            <p className="text-zinc-600 text-sm mt-2 max-w-xl leading-relaxed">
              Manage your corporate carbon offset portfolio, monitor ESG regulatory compliance, and execute direct trades.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/marketplace"
              className="btn-pill btn-pill-solid text-xs !py-3 !px-6 shadow-md"
            >
              🛒 Procure Carbon Credits
            </Link>
            <Link
              href="/portfolio"
              className="btn-pill bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/20 font-semibold text-xs !py-3 !px-5"
            >
              📜 View Registry Certificates
            </Link>
          </div>
        </div>

        {/* ESG Compliance Banner */}
        <div className="bg-[#0B1F17] text-white rounded-3xl p-8 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#DDA15E]">
                ESG & BRSR Compliance Tracker
              </span>
              <h2 className="font-display text-3xl font-extrabold text-white">
                {isCompliant
                  ? '100% Climate Target Fulfilled'
                  : `${(stats.creditsDeficit || 0).toLocaleString()} tCO₂e Offset Deficit Remaining`}
              </h2>
              <p className="text-xs text-white/70 leading-relaxed">
                Your annual corporate emissions offset goal is <strong>{(stats.creditsRequired || 5000).toLocaleString()} tCO₂e</strong>. 
                {stats.creditsRetired > 0 && !isCompliant && (
                  <> You have permanently retired <strong>{stats.creditsRetired} tCO₂e</strong> on the official registry.</>
                )}
                {isCompliant
                  ? ' You have met and secured zero-gap carbon neutrality for this reporting period.'
                  : ' Purchase and retire verified credits from regenerative sellers to complete compliance.'}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center shrink-0 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase text-white/60 block mb-1">
                Compliance Rate
              </span>
              <span className="font-display text-4xl font-extrabold text-emerald-400">
                {compliancePercent === 0
                  ? '0%'
                  : compliancePercent < 1
                    ? `${compliancePercent.toFixed(2)}%`
                    : `${Math.round(compliancePercent * 10) / 10}%`}
              </span>
              <span className="text-[11px] text-white/70 block mt-1 font-medium">
                {stats.creditsRetired || 0} / {(stats.creditsRequired || 5000).toLocaleString()} tCO₂e retired
              </span>
              <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(compliancePercent > 0 ? 1 : 0, compliancePercent))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Active Holdings</p>
                <h3 className="font-display text-4xl font-extrabold text-[#0B1F17] mt-1">
                  {stats.creditsOwned}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">tCO₂e active credits</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                🌿
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
              Ready for offset retirement
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Retired Credits</p>
                <h3 className="font-display text-4xl font-extrabold text-[#1B4332] mt-1">
                  {stats.creditsRetired}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">tCO₂e permanently retired</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332]">
                🔥
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-emerald-700 font-semibold">
              Official Registry Verified
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Capital Invested</p>
                <h3 className="font-display text-4xl font-extrabold text-[#0B1F17] mt-1 flex items-baseline">
                  <span className="font-sans text-3xl font-semibold mr-1">₹</span>
                  {(stats.totalSpent || 0).toLocaleString('en-IN')}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">Direct to rural sellers</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#606C38]/10 flex items-center justify-center text-[#606C38]">
                💼
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
              {stats.offersCount || 0} batches acquired
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1">Average Cost</p>
                <h3 className="font-display text-4xl font-extrabold text-[#606C38] mt-1 flex items-baseline">
                  <span className="font-sans text-3xl font-semibold mr-1">₹</span>
                  {(stats.averagePricePerCredit || 1000).toLocaleString('en-IN')}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">per tCO₂e</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#DDA15E]/20 flex items-center justify-center text-[#B87A36]">
                📊
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
              Automated instant settlement
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm">
          <h3 className="font-display text-2xl font-bold text-[#0B1F17] mb-6">
            Buyer Climate Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link
              href="/marketplace"
              className="p-6 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 transition shadow-xs hover:shadow-md block"
            >
              <span className="text-3xl block mb-2">🛒</span>
              <h4 className="font-bold text-[#0B1F17] text-sm">Browse Verified Batches</h4>
              <p className="text-xs text-zinc-500 mt-1">Discover high-integrity carbon credits from Indian regenerative sellers.</p>
            </Link>

            <Link
              href="/portfolio"
              className="p-6 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 transition shadow-xs hover:shadow-md block"
            >
              <span className="text-3xl block mb-2">📜</span>
              <h4 className="font-bold text-[#0B1F17] text-sm">Audit Certificates</h4>
              <p className="text-xs text-zinc-500 mt-1">View official immutable proof of retirement and ESG reporting ledgers.</p>
            </Link>

            <Link
              href="/retire"
              className="p-6 bg-[#FAF8F2] hover:bg-white rounded-2xl border border-[#1B4332]/15 transition shadow-xs hover:shadow-md block"
            >
              <span className="text-3xl block mb-2">🔥</span>
              <h4 className="font-bold text-[#0B1F17] text-sm">Retire & Offset</h4>
              <p className="text-xs text-zinc-500 mt-1">Permanently burn credits on-chain to offset emissions and generate certificates.</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332]"></div>
        </div>
      }
    >
      <BuyerDashboardContent />
    </Suspense>
  );
}
