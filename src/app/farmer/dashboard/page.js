'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function FarmerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRefreshFromPayment = useRef(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({
    totalCreditsListed: 0,
    creditsSoldThisMonth: 0,
    earningsThisMonth: 0,
    totalEarnings: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);

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
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const userInfo = userData.data;
          setUser(userInfo);

          if (!userInfo.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          if (userInfo.role !== 'FARMER') {
            router.push('/');
            return;
          }

          // Fetch farmer stats from API instead of calculating manually
          const statsResponse = await fetch('/api/farmer/stats', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setStats(statsData.data);
            setListings(statsData.data.recentListings || []);
          } else {
            // Fallback: fetch listings manually
            const listingsResponse = await fetch(`/api/listings?sellerId=${userInfo._id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (listingsResponse.ok) {
              const listingsData = await listingsResponse.json();
              const userListings = listingsData.data || [];
              setListings(userListings);

              // Calculate stats from listings
              const totalCredits = userListings.reduce((sum, listing) => sum + listing.creditsAmount, 0);
              
              // Get total earnings from user's totalIncome field
              const totalEarnings = userInfo.totalIncome || 0;
              
              // Calculate this month's earnings
              const currentDate = new Date();
              const currentMonth = currentDate.getMonth();
              const currentYear = currentDate.getFullYear();
              
              const earningsThisMonth = userListings
                .filter(l => {
                  const listingDate = new Date(l.createdAt);
                  return listingDate.getMonth() === currentMonth && listingDate.getFullYear() === currentYear;
                })
                .reduce((sum, l) => sum + (l.pricePerCredit * (l.creditsAmount - l.availableCredits)), 0);

              setStats({
                totalCreditsListed: totalCredits,
                creditsSoldThisMonth: userListings
                  .filter(l => {
                    const listingDate = new Date(l.createdAt);
                    return listingDate.getMonth() === currentMonth && listingDate.getFullYear() === currentYear;
                  })
                  .reduce((sum, l) => sum + (l.creditsAmount - l.availableCredits), 0),
                earningsThisMonth: Math.round(earningsThisMonth * 100) / 100,
                totalEarnings: totalEarnings,
                recentListings: userListings.slice(0, 5),
              });
            }
          }

          // Fetch farmer's trade offers (sales) for Recent Activity
          const tradesResponse = await fetch('/api/farmer/trades', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (tradesResponse.ok) {
            const tradesData = await tradesResponse.json();
            setTrades(tradesData.data.trades || []);
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Check if coming back from payment verification and refresh data
    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess === 'true' && !didRefreshFromPayment.current) {
      didRefreshFromPayment.current = true;
      setRefreshKey(prev => prev + 1);
    }
  }, [router, searchParams, refreshKey]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

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
              <span className="text-2xl font-bold text-green-600">🌾</span>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Carbon Bazaar</h1>
                <p className="text-xs text-zinc-600">Farmer Dashboard</p>
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
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">
            🙏 नमस्ते, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-zinc-600">
            Monitor your carbon credits and earnings on India's leading agricultural carbon marketplace
          </p>
        </div>

        {/* Verification Status Banner */}
        {user?.isEmailVerified ? (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-medium text-green-900">Account Verified</p>
              <p className="text-sm text-green-800">Your account has been approved. You can now list and sell carbon credits.</p>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-medium text-yellow-900">Verification Pending</p>
              <p className="text-sm text-yellow-800">Your documents are being reviewed. Most approvals take 2-3 business days.</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Credits Listed */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-600 font-medium">Total Credits Listed</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">{stats.totalCreditsListed.toFixed(2)}</p>
                <p className="text-xs text-zinc-500 mt-1">tCO₂e</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">65% of target capacity</p>
          </div>

          {/* Credits Sold This Month */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-600 font-medium">Sold This Month</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.creditsSoldThisMonth}</p>
                <p className="text-xs text-zinc-500 mt-1">tCO₂e</p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
            <p className="text-xs text-green-600 font-medium">↑ 23% from last month</p>
          </div>

          {/* Earnings This Month */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-600 font-medium">This Month</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">₹{stats.earningsThisMonth.toLocaleString('en-IN')}</p>
                <p className="text-xs text-zinc-500 mt-1">Earnings</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
            <p className="text-xs text-green-600 font-medium">↑ 18% from last month</p>
          </div>

          {/* Total Earnings */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-600 font-medium">Total Earnings</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">₹{stats.totalEarnings.toLocaleString('en-IN')}</p>
                <p className="text-xs text-zinc-500 mt-1">All time</p>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
            <p className="text-xs text-zinc-600">Since joining</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8 flex gap-4">
          <Link
            href="/listings/create"
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            ➕ Add Carbon Credits
          </Link>
          <Link
            href="/listings"
            className="px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg border border-zinc-300 hover:bg-zinc-50 transition-colors"
          >
            View My Listings
          </Link>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Sales Chart */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">📈 Sales Trend (Last 6 Months)</h3>
            <div className="space-y-4">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => {
                const heights = [35, 45, 52, 48, 60, 75];
                return (
                  <div key={month}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-600 w-12">{month}</span>
                      <div className="flex-1 mx-4 bg-zinc-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${heights[idx]}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-zinc-900">{heights[idx]}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">💵 Earnings Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: 'Direct Sales', amount: '₹4,50,000', percent: 60, color: 'bg-green-500' },
                { label: 'Verified Deals', amount: '₹2,25,000', percent: 30, color: 'bg-blue-500' },
                { label: 'Bonuses & Incentives', amount: '₹75,000', percent: 10, color: 'bg-yellow-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-600">{item.label}</span>
                    <span className="text-sm font-medium text-zinc-900">{item.amount}</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-3">
                    <div
                      className={`${item.color} h-3 rounded-full`}
                      style={{ width: `${item.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">📋 Recent Activity</h3>
          <div className="space-y-4">
            {trades.length > 0 ? (
              trades.map((trade, idx) => (
                <div key={trade._id || idx} className="flex items-start gap-4 pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                  <div className="shrink-0">
                    <span className="text-lg">✅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      Sold {trade.creditsRequested} tCO₂e of {trade.cropType} to {trade.buyerName} @ ₹{trade.negotiatedPricePerCredit}/credit
                    </p>
                    <p className="text-xs text-green-600 font-medium">Earned ₹{trade.negotiatedTotalPrice.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-zinc-500">{new Date(trade.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {trade.transactionId}
                  </div>
                </div>
              ))
            ) : listings.length > 0 ? (
              listings.map((listing, idx) => (
                <div key={listing._id || idx} className="flex items-start gap-4 pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                  <div className="shrink-0">
                    <span className="text-lg">🆕</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      Listed {Number(listing.creditsAmount || 0).toFixed(2)} tCO₂e of {listing.cropType || 'Carbon Credits'} @ ₹{Number(listing.pricePerCredit || 0).toFixed(2)}/credit
                    </p>
                    <p className="text-xs text-zinc-500">{new Date(listing.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-600 mb-4">No sales yet</p>
                <Link
                  href="/listings/create"
                  className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create First Listing
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Market Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-bold text-green-900 mb-3">🌱 Marketplace Tips</h4>
            <ul className="text-sm text-green-800 space-y-2">
              <li>✓ Keep your profile updated for better credibility</li>
              <li>✓ Higher quality docs = faster approvals</li>
              <li>✓ Competitive pricing = more inquiries</li>
              <li>✓ Quick responses = better ratings</li>
            </ul>
          </div>

          {/* Support */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-bold text-blue-900 mb-3">📞 Need Help?</h4>
            <p className="text-sm text-blue-800 mb-4">
              Contact our support team for assistance with listings, payments, or verification.
            </p>
            <div className="space-y-2">
              <a href="mailto:support@carbenbazaar.in" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                📧 support@carbenbazaar.in
              </a>
              <p className="text-sm text-blue-600 font-medium">📞 +91 1234 567 890</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
