'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CompanyTradesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [trades, setTrades] = useState({
    active: [],
    completed: [],
    rejected: [],
  });

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

        // Check if user is a company
        if (userData.data.role !== 'COMPANY') {
          router.push('/');
          return;
        }

        setUser(userData.data);

        // Fetch active negotiations
        const activeResponse = await fetch('/api/trade-offers?status=pending', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (activeResponse.ok) {
          const activeData = await activeResponse.json();
          setTrades((prev) => ({
            ...prev,
            active: activeData.data || [],
          }));
        }

        // Fetch completed trades
        const completedResponse = await fetch('/api/trade-offers?status=accepted', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (completedResponse.ok) {
          const completedData = await completedResponse.json();
          setTrades((prev) => ({
            ...prev,
            completed: completedData.data || [],
          }));
        }

        // Fetch rejected offers
        const rejectedResponse = await fetch('/api/trade-offers?status=rejected', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (rejectedResponse.ok) {
          const rejectedData = await rejectedResponse.json();
          setTrades((prev) => ({
            ...prev,
            rejected: rejectedData.data || [],
          }));
        }
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError('Failed to load trades');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleCancelOffer = async (tradeId) => {
    const token = localStorage.getItem('token');

    if (!window.confirm('Are you sure you want to cancel this offer?')) return;

    try {
      const response = await fetch(`/api/trade-offers/${tradeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh trades
        setTrades((prev) => ({
          ...prev,
          active: prev.active.filter((t) => t._id !== tradeId),
        }));
      }
    } catch (err) {
      console.error('Error canceling offer:', err);
    }
  };

  const handleViewDetails = (tradeId) => {
    router.push(`/company/trades/${tradeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-4"></div>
          <p className="text-white">Loading trades...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'COMPANY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-white font-bold mb-4">Access Denied</p>
          <button
            onClick={() => router.push('/company/dashboard')}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const TradeCard = ({ trade, status }) => {
    const isActive = status === 'active';
    const isCompleted = status === 'completed';

    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {trade.counterpartyName || 'Unknown Seller'}
            </h3>
            <p className="text-sm text-slate-400">
              {trade.counterpartyType === 'COMPANY' ? '🏢' : '👨‍🌾'} {trade.counterpartyType || 'Farmer'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isActive
                ? 'bg-amber-900 text-amber-200'
                : isCompleted
                ? 'bg-green-900 text-green-200'
                : 'bg-red-900 text-red-200'
            }`}
          >
            {isActive ? '⏳ Active' : isCompleted ? '✅ Completed' : '❌ Rejected'}
          </span>
        </div>

        {/* Trade Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">CREDITS</p>
            <p className="text-lg font-bold text-white">
              {trade.creditsRequested?.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">tCO₂e</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">PRICE/CREDIT</p>
            <p className="text-lg font-bold text-white">₹{trade.pricePerCredit?.toFixed(2)}</p>
            <p className="text-xs text-slate-400">per tCO₂e</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">TOTAL VALUE</p>
            <p className="text-lg font-bold text-emerald-400">
              ₹
              {(trade.creditsRequested * trade.pricePerCredit).toLocaleString('en-IN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-slate-400">INR</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">MONTH</p>
            <p className="text-lg font-bold text-white">{trade.month}</p>
            <p className="text-xs text-slate-400">Vintage</p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-slate-700 bg-opacity-40 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 mb-1">Offered On</p>
              <p className="text-white font-medium">
                {new Date(trade.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
            {trade.acceptedAt && (
              <div>
                <p className="text-slate-400 mb-1">Accepted On</p>
                <p className="text-white font-medium">
                  {new Date(trade.acceptedAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            )}
            {trade.rejectedAt && (
              <div>
                <p className="text-slate-400 mb-1">Rejected On</p>
                <p className="text-white font-medium">
                  {new Date(trade.rejectedAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Crop Type Badge */}
        {trade.cropType && (
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-emerald-900 text-emerald-200 text-xs font-bold rounded-full">
              {trade.cropType}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleViewDetails(trade._id)}
            className="flex-1 px-3 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-colors"
          >
            📋 View Details
          </button>
          {isActive && (
            <button
              onClick={() => handleCancelOffer(trade._id)}
              className="flex-1 px-3 py-2 bg-red-900 text-red-200 text-sm font-bold rounded-lg hover:bg-red-800 transition-colors"
            >
              ❌ Cancel
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-700 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Trade Management</h1>
              <p className="text-slate-400 mt-1">Manage your carbon credit negotiations</p>
            </div>
            <button
              onClick={() => router.push('/company/dashboard')}
              className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ← Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-700 -mx-6 px-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'active'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              ⏳ Active Negotiations ({trades.active.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'completed'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              ✅ Completed Trades ({trades.completed.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'rejected'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              ❌ Rejected Offers ({trades.rejected.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="p-4 bg-red-900 border border-red-700 rounded-lg mb-6">
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </div>
        )}

        {/* Active Negotiations Tab */}
        {activeTab === 'active' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Active Negotiations</h2>
              <p className="text-slate-400">
                Trades awaiting your acceptance or counteroffers
              </p>
            </div>

            {trades.active.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
                <p className="text-3xl mb-4">💤</p>
                <h3 className="text-lg font-bold text-white mb-2">No active negotiations</h3>
                <p className="text-slate-400 mb-4">
                  Start negotiating by visiting the marketplace
                </p>
                <button
                  onClick={() => router.push('/marketplace')}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  Go to Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trades.active.map((trade) => (
                  <TradeCard key={trade._id} trade={trade} status="active" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Trades Tab */}
        {activeTab === 'completed' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Completed Trades</h2>
              <p className="text-slate-400">
                Successfully concluded carbon credit purchases
              </p>
            </div>

            {trades.completed.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
                <p className="text-3xl mb-4">📭</p>
                <h3 className="text-lg font-bold text-white mb-2">No completed trades</h3>
                <p className="text-slate-400">
                  You haven't completed any trades yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trades.completed.map((trade) => (
                  <TradeCard key={trade._id} trade={trade} status="completed" />
                ))}
              </div>
            )}

            {/* Completed Trades Summary */}
            {trades.completed.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <p className="text-slate-400 text-sm font-bold mb-2">TOTAL TRADES</p>
                  <p className="text-3xl font-bold text-white">{trades.completed.length}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <p className="text-slate-400 text-sm font-bold mb-2">TOTAL CREDITS PURCHASED</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {trades.completed.reduce((sum, t) => sum + (t.creditsRequested || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">tCO₂e</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <p className="text-slate-400 text-sm font-bold mb-2">TOTAL INVESTMENT</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    ₹
                    {trades.completed
                      .reduce((sum, t) => sum + (t.creditsRequested * t.pricePerCredit || 0), 0)
                      .toLocaleString('en-IN', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">INR</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rejected Offers Tab */}
        {activeTab === 'rejected' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Rejected Offers</h2>
              <p className="text-slate-400">
                Offers that were declined or expired
              </p>
            </div>

            {trades.rejected.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
                <p className="text-3xl mb-4">✨</p>
                <h3 className="text-lg font-bold text-white mb-2">No rejected offers</h3>
                <p className="text-slate-400">
                  All your offers have been successful or are pending
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trades.rejected.map((trade) => (
                  <TradeCard key={trade._id} trade={trade} status="rejected" />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
