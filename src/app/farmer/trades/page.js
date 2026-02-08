'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TradesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user and trades
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

          // Check if email is verified
          if (!userInfo.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          // Check if role is FARMER
          if (userInfo.role !== 'FARMER') {
            router.push('/');
            return;
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        // Fetch trade offers (incoming)
        const tradesResponse = await fetch('/api/trade-offers?status=pending', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          setTrades(tradesData.data || []);
        } else {
          setError('Failed to load trade offers');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleSelectTrade = async (trade) => {
    setSelectedTrade(trade);
    // Fetch messages for this trade
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/trade-offers/${trade._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTrade) return;

    const token = localStorage.getItem('token');
    setSendingMessage(true);

    try {
      const response = await fetch(`/api/trade-offers/${selectedTrade._id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAccept = async (tradeId) => {
    if (!confirm('Accept this trade offer?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/trade-offers/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });

      if (response.ok) {
        setTrades((prev) => prev.map((t) => (t._id === tradeId ? { ...t, status: 'ACCEPTED' } : t)));
        setSelectedTrade(null);
      }
    } catch (error) {
      console.error('Error accepting trade:', error);
    }
  };

  const handleReject = async (tradeId) => {
    if (!confirm('Reject this trade offer?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/trade-offers/${tradeId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'REJECTED' }),
      });

      if (response.ok) {
        setTrades((prev) => prev.filter((t) => t._id !== tradeId));
        setSelectedTrade(null);
      }
    } catch (error) {
      console.error('Error rejecting trade:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading trade offers...</p>
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
                <p className="text-xs text-zinc-600">Trade Offers</p>
              </div>
            </div>
            <Link
              href="/farmer/dashboard"
              className="text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Trade List */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-900">📥 Trade Offers</h2>
              <p className="text-zinc-600 text-sm mt-1">
                {trades.length} {trades.length === 1 ? 'offer' : 'offers'} pending
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {trades.length === 0 ? (
              <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center">
                <p className="text-3xl mb-3">📭</p>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">No active offers</h3>
                <p className="text-xs text-zinc-600">
                  Companies will make offers when they're interested in your listings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade) => (
                  <button
                    key={trade._id}
                    onClick={() => handleSelectTrade(trade)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTrade?._id === trade._id
                        ? 'border-green-500 bg-green-50'
                        : 'border-zinc-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏢</span>
                        <div className="text-left">
                          <p className="text-sm font-bold text-zinc-900">
                            {trade.companyName || 'Company'}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {new Date(trade.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      {trade.status && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                          {trade.status}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-600">
                        💰 ₹{trade.offeredPrice?.toFixed(2) || '0.00'}/credit
                      </p>
                      <p className="text-xs text-zinc-600">
                        📊 {trade.creditsRequested || '0'} tCO₂e
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Chat & Details */}
          <div className="lg:col-span-2">
            {selectedTrade ? (
              <div className="bg-white rounded-lg border border-zinc-200 shadow-sm h-full flex flex-col">
                {/* Trade Details Header */}
                <div className="border-b border-zinc-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">
                        {selectedTrade.companyName || 'Company'}
                      </h3>
                      <p className="text-sm text-zinc-600 mt-1">
                        {selectedTrade.listingCropType || 'Carbon Credits'} Listing
                      </p>
                    </div>
                    <span className="text-2xl">🏢</span>
                  </div>

                  {/* Key Offer Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-zinc-600 font-medium">Offered Price</p>
                      <p className="text-lg font-bold text-green-600">
                        ₹{selectedTrade.offeredPrice?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-zinc-500">per tCO₂e</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-zinc-600 font-medium">Requested Credits</p>
                      <p className="text-lg font-bold text-blue-600">
                        {selectedTrade.creditsRequested || '0'}
                      </p>
                      <p className="text-xs text-zinc-500">tCO₂e</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-zinc-600 font-medium">Total Value</p>
                      <p className="text-lg font-bold text-purple-600">
                        ₹{((selectedTrade.creditsRequested || 0) * (selectedTrade.offeredPrice || 0)).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-zinc-500">total offer</p>
                    </div>
                  </div>
                </div>

                {/* Messages Section */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-zinc-500">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.senderId === user?._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.senderId === user?._id
                              ? 'bg-green-100 text-green-900'
                              : 'bg-zinc-100 text-zinc-900'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.senderId === user?._id
                              ? 'text-green-700'
                              : 'text-zinc-600'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-zinc-200 p-6 space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      💬 Send
                    </button>
                  </div>

                  {/* Action Buttons */}
                  {selectedTrade.status === 'PENDING' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(selectedTrade._id)}
                        className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        ✅ Accept Offer
                      </button>
                      <button
                        onClick={() => handleReject(selectedTrade._id)}
                        className="flex-1 px-4 py-3 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
                      >
                        ❌ Reject Offer
                      </button>
                    </div>
                  )}
                  {selectedTrade.status && selectedTrade.status !== 'PENDING' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-sm font-medium text-blue-900">
                        Offer Status: <span className="font-bold">{selectedTrade.status}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-zinc-200 h-full flex items-center justify-center min-h-96">
                <div className="text-center">
                  <p className="text-3xl mb-3">👈</p>
                  <p className="text-zinc-600">Select an offer to view details and negotiate</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
