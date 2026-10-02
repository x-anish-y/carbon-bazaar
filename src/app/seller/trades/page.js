'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function SellerTradesPage() {
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

    const fetchData = async () => {
      try {
        const userResponse = await fetch('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const userInfo = userData.data;
          setUser(userInfo);

          if (userInfo.role !== 'SELLER' && userInfo.role !== 'FARMER') {
            router.push('/');
            return;
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        const tradesResponse = await fetch('/api/trade-offers?status=pending', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (tradesResponse.ok) {
          const tradesData = await tradesResponse.json();
          const list = tradesData.data || [];
          setTrades(list);
          if (list.length > 0) {
            handleSelectTrade(list[0]);
          }
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
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/trade-offers/${trade._id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
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
        body: JSON.stringify({ message: newMessage }),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading incoming buyer trade offers...</p>
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
            <Link href="/seller/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center text-white">
                <span className="text-sm">🌾</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              Seller Trade Inquiries
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/seller/dashboard" className="btn-pill btn-pill-ghost text-xs !py-2 !px-4">
              ← Seller Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
            Incoming Buyer Trade Inquiries
          </h1>
          <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
            Review custom offers and negotiate volume pricing with verified enterprise buyers.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Offers List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0B1F17] pb-3 border-b border-zinc-100">
              Buyer Offers ({trades.length})
            </h3>

            {trades.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <span className="text-3xl block mb-2">💬</span>
                No pending buyer inquiries at the moment.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {trades.map((t) => {
                  const isSelected = selectedTrade?._id === t._id;
                  return (
                    <button
                      key={t._id}
                      onClick={() => handleSelectTrade(t)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                          : 'bg-[#FAF8F2] hover:bg-white text-[#0B1F17] border-[#1B4332]/15'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-xs">{t.buyerId?.name || 'Enterprise Buyer'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 ${isSelected ? 'text-white/80' : 'text-zinc-600'}`}>
                        {t.creditsRequested} tCO₂e @ ₹{t.negotiatedPricePerCredit}/credit
                      </p>
                      <p className={`text-[10px] mt-2 font-mono ${isSelected ? 'text-white/60' : 'text-zinc-400'}`}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Negotiation & Message Thread (8 cols) */}
          <div className="lg:col-span-8">
            {selectedTrade ? (
              <motion.div
                key={selectedTrade._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm space-y-6"
              >
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                  <div>
                    <span className="eyebrow mb-0.5">Offer from</span>
                    <h2 className="font-display text-2xl font-bold text-[#0B1F17]">
                      {selectedTrade.buyerId?.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 text-xs block">Total Offer Amount</span>
                    <span className="font-display text-2xl font-extrabold text-[#1B4332]">
                      ₹{(selectedTrade.negotiatedTotalPrice || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Message Stream */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto p-4 bg-[#FAF8F2] rounded-2xl border border-[#1B4332]/10">
                  {messages.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No direct messages yet. Send a response below to negotiate terms.
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.senderId === user?._id || m.senderId?._id === user?._id;
                      return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                            isMe
                              ? 'bg-[#1B4332] text-white rounded-br-none'
                              : 'bg-white text-[#0B1F17] border border-zinc-200 rounded-bl-none shadow-xs'
                          }`}>
                            <p>{m.message}</p>
                            <span className={`text-[9px] block mt-1 ${isMe ? 'text-white/60' : 'text-zinc-400'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Send Message Form */}
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type counter-offer or message to buyer..."
                    className="flex-1 px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="btn-pill btn-pill-solid text-xs !py-3 !px-6 font-bold disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl p-16 text-center border border-[#1B4332]/10 shadow-sm text-zinc-500 text-xs">
                Select a buyer offer to view negotiations and reply.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
