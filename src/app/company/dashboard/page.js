'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompanyDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    creditsOwned: 0,
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

    // Fetch user and stats
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

          // Check if email is verified
          if (!userData.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          // Check if role is COMPANY
          if (userData.role !== 'COMPANY') {
            router.push('/');
            return;
          }

          // Fetch real stats from company stats API
          const statsResponse = await fetch('/api/company/stats', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData.data);
            console.log('Company stats loaded:', statsData.data);
          } else {
            // Fallback to default stats if API fails
            console.warn('Failed to fetch company stats, using defaults');
            setStats({
              creditsOwned: 0,
              creditsRequired: 5000,
              creditsDeficit: 5000,
              totalSpent: 0,
              compliancePercentage: 0,
              averagePricePerCredit: 0,
              offersCount: 0,
              recentOffers: [],
            });
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
    
    // Check if coming back from payment verification and refresh data
    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess === 'true') {
      // Clear the query parameter to prevent reload loops
      router.replace('/company/dashboard');
    }
  }, [router, searchParams]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const creditsSurplus = stats.creditsOwned - stats.creditsRequired;
  const complianceStatus = creditsSurplus >= 0 ? 'compliant' : 'deficit';

  const derivedCompliancePercentage = (() => {
    const owned = Number(stats.creditsOwned);
    const required = Number(stats.creditsRequired);
    if (!Number.isFinite(owned) || !Number.isFinite(required) || required <= 0) return 0;
    const raw = (owned / required) * 100;
    // 1-decimal precision so small progress isn't shown as 0%
    const rounded = Math.round(raw * 10) / 10;
    return Math.max(0, Math.min(100, rounded));
  })();

  const formatPercent = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '0';
    if (n >= 1 && Number.isInteger(n)) return String(n);
    return n.toFixed(1);
  };

  const compliancePercentText = formatPercent(derivedCompliancePercentage);
  const compliancePercentWidth = `${derivedCompliancePercentage}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">🌍</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Carbon Bazaar</h1>
                <p className="text-xs text-zinc-600">ESG Compliance Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-zinc-900">{user?.name}</p>
                <p className="text-xs text-zinc-600">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-zinc-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0]}
          </h2>
          <p className="text-zinc-600 text-lg">
            Monitor your carbon credit portfolio and ESG compliance status
          </p>
        </div>

        {/* Compliance Status Banner */}
        <div className={`mb-8 p-6 rounded-xl border backdrop-blur ${
          complianceStatus === 'compliant'
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-bold ${
                complianceStatus === 'compliant' ? 'text-green-600' : 'text-amber-600'
              }`}>
                {complianceStatus === 'compliant' ? '✅ ESG Compliant' : '⚠️ Compliance Gap'}
              </h3>
              <p className="text-zinc-600 text-sm mt-1">
                {complianceStatus === 'compliant'
                  ? `You have ${creditsSurplus.toLocaleString()} surplus credits`
                  : `You need ${Math.abs(creditsSurplus).toLocaleString()} more credits to be compliant`}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${
                complianceStatus === 'compliant' ? 'text-green-600' : 'text-amber-600'
              }`}>
                {compliancePercentText}%
              </p>
              <p className="text-zinc-600 text-sm">Compliance Rate</p>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Credits Owned */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 hover:border-zinc-300 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-600 text-sm font-medium">Credits Owned</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">{stats.creditsOwned.toLocaleString()}</p>
                <p className="text-xs text-zinc-600 mt-1">tCO₂e this month</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min((stats.creditsOwned / stats.creditsRequired) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              {((stats.creditsOwned / stats.creditsRequired) * 100).toFixed(1)}% of requirement
            </p>
          </div>

          {/* Credits Required */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 hover:border-zinc-300 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-600 text-sm font-medium">Minimum Required</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">{stats.creditsRequired.toLocaleString()}</p>
                <p className="text-xs text-zinc-600 mt-1">tCO₂e compliance target</p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg mt-4">
              <p className="text-xs text-zinc-600">
                Based on regulatory compliance requirements and your operations scale
              </p>
            </div>
          </div>

          {/* Credits Deficit/Surplus */}
          <div className={`rounded-xl border p-6 transition-all hover:shadow-md ${
            complianceStatus === 'compliant'
              ? 'bg-green-50 border-green-200 hover:shadow-green-200'
              : 'bg-amber-50 border-amber-200 hover:shadow-amber-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className={`text-sm font-medium ${
                  complianceStatus === 'compliant' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {complianceStatus === 'compliant' ? 'Surplus' : 'Deficit'}
                </p>
                <p className={`text-3xl font-bold mt-2 ${
                  complianceStatus === 'compliant' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {Math.abs(creditsSurplus).toLocaleString()}
                </p>
                <p className="text-xs text-zinc-600 mt-1">tCO₂e</p>
              </div>
              <div className="text-4xl">
                {complianceStatus === 'compliant' ? '✅' : '⚠️'}
              </div>
            </div>
            <div className={`text-xs ${
              complianceStatus === 'compliant' ? 'text-green-600' : 'text-amber-600'
            }`}>
              {complianceStatus === 'compliant'
                ? `Great! You exceed compliance by ${creditsSurplus.toLocaleString()} credits`
                : `You're ${Math.abs(creditsSurplus).toLocaleString()} credits short of compliance`}
            </div>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 hover:border-zinc-300 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-600 text-sm font-medium">Total Invested</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">
                  ₹{(stats.totalSpent / 100000).toFixed(1)}L
                </p>
                <p className="text-xs text-zinc-600 mt-1">Carbon credit purchases</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg mt-4">
              <p className="text-xs text-zinc-600">
                {stats.creditsOwned > 0 ? `₹${(stats.totalSpent / stats.creditsOwned).toFixed(0)}/credit avg. price` : 'No purchases yet'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4 flex-wrap">
          <Link
            href="/marketplace"
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            🛍️ Go to Marketplace
          </Link>
          <Link
            href="/company/portfolio"
            className="px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg border border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            📈 View Portfolio
          </Link>
          <Link
            href="/company/purchases"
            className="px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg border border-zinc-300 hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            📋 Purchase History
          </Link>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Compliance Tracker */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">📊 Compliance Tracker</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-600">Compliance Progress</span>
                  <span className="text-sm font-bold text-green-600">{compliancePercentText}%</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      complianceStatus === 'compliant' 
                        ? 'bg-green-600'
                        : 'bg-amber-600'
                    }`}
                    style={{ width: compliancePercentWidth }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-zinc-100 rounded-lg">
                <div>
                  <p className="text-xs text-zinc-600">Owned</p>
                  <p className="text-lg font-bold text-blue-600">{stats.creditsOwned}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600">Required</p>
                  <p className="text-lg font-bold text-zinc-900">{stats.creditsRequired}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ESG Impact */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">🌍 ESG Impact</h3>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">CO₂ Emissions Offset</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.creditsOwned.toLocaleString()}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Equivalent to {(stats.creditsOwned / 4.6).toLocaleString()} trees planted
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-100 rounded-lg p-3">
                  <p className="text-xs text-zinc-600">Verified Credits</p>
                  <p className="text-lg font-bold text-zinc-900">{Math.round(stats.creditsOwned * 0.92)}</p>
                </div>
                <div className="bg-zinc-100 rounded-lg p-3">
                  <p className="text-xs text-zinc-600">In Review</p>
                  <p className="text-lg font-bold text-zinc-900">{Math.round(stats.creditsOwned * 0.08)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-bold text-blue-900 mb-3">📋 Regulatory Compliance</h4>
          <p className="text-sm text-blue-800 mb-4">
            You are currently <span className={`font-bold ${
              complianceStatus === 'compliant' ? 'text-green-600' : 'text-amber-600'
            }`}>
              {complianceStatus === 'compliant' ? 'COMPLIANT' : 'NON-COMPLIANT'}
            </span> with Indian environmental regulations. 
            Your next compliance check is due on March 31, 2026.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium underline">
              View Compliance Report
            </a>
            <a href="#" className="text-blue-400 hover:text-blue-300 text-sm font-medium underline">
              Compliance Guide
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
