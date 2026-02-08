'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NegotiatePage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id;

  const [listing, setListing] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [offer, setOffer] = useState({
    creditsRequested: '',
    pricePerCredit: '',
  });
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const cropEmojis = {
    RICE: '🍚',
    WHEAT: '🌾',
    SUGARCANE: '🎋',
    PULSES: '🫘',
    MAIZE: '🌽',
    COTTON: '🧵',
    SOYBEAN: '🌱',
    FRUITS: '🍎',
    VEGETABLES: '🥬',
    SPICES: '🌶️',
    FORAGE: '🌿',
    OTHER: '🌾',
  };

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
        setUser(userData.data);

        // Fetch listing details
        const listingResponse = await fetch(`/api/listings/${listingId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (listingResponse.ok) {
          const listingData = await listingResponse.json();
          setListing(listingData.data);
        }

        // Fetch messages/negotiation thread
        const messagesResponse = await fetch(`/api/listings/${listingId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load listing details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [listingId, router]);

  const handleSendMessage = async () => {
    const token = localStorage.getItem('token');

    if (!messageText.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages([...messages, newMessage.data]);
        setMessageText('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleMakeOffer = async () => {
    const token = localStorage.getItem('token');

    if (!offer.creditsRequested || !offer.pricePerCredit) {
      setError('Please fill in all offer fields');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/offer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditsRequested: parseInt(offer.creditsRequested),
          pricePerCredit: parseFloat(offer.pricePerCredit),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Add offer message to thread
        setMessages([...messages, result.data]);
        setOffer({ creditsRequested: '', pricePerCredit: '' });
        setError('');
      } else {
        setError('Failed to make offer');
      }
    } catch (err) {
      console.error('Error making offer:', err);
      setError('Error making offer');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/listings/${listingId}/offers/${offerId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh listing
        const listingResponse = await fetch(`/api/listings/${listingId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (listingResponse.ok) {
          const listingData = await listingResponse.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      console.error('Error accepting offer:', err);
    }
  };

  const handleRejectOffer = async (offerId) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/listings/${listingId}/offers/${offerId}/reject`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh messages
        const messagesResponse = await fetch(`/api/listings/${listingId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData.data || []);
        }
      }
    } catch (err) {
      console.error('Error rejecting offer:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading negotiation details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-zinc-900 font-bold mb-4">Listing not found</p>
          <button
            onClick={() => router.push('/marketplace')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const cropEmoji = cropEmojis[listing.cropType] || '🌾';
  const totalOfferValue = (parseInt(offer.creditsRequested) || 0) * (parseFloat(offer.pricePerCredit) || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/marketplace')}
            className="text-zinc-600 hover:text-zinc-900 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-zinc-900">
            {listing.sellerName} - Negotiation
          </h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Listing Details Card */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{cropEmoji}</span>
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">
                  {listing.cropType} Carbon Credits
                </h2>
                <p className="text-zinc-600">
                  {listing.sellerRole === 'COMPANY' ? '🏢' : '👨‍🌾'} {listing.sellerName}
                </p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-lg font-medium ${
              listing.status === 'OPEN'
                ? 'bg-green-100 text-green-800'
                : listing.status === 'PARTIAL'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {listing.status}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-zinc-200">
            <div>
              <p className="text-xs text-zinc-600 font-medium mb-1">AVAILABLE</p>
              <p className="text-xl font-bold text-zinc-900">
                {listing.creditsEarned?.toLocaleString()} tCO₂e
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 font-medium mb-1">ASKING PRICE</p>
              <p className="text-xl font-bold text-zinc-900">
                ₹{listing.pricePerCredit?.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 font-medium mb-1">MONTH</p>
              <p className="text-xl font-bold text-zinc-900">{listing.month}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 font-medium mb-1">TOTAL VALUE</p>
              <p className="text-xl font-bold text-green-600">
                ₹{(listing.creditsEarned * listing.pricePerCredit).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-zinc-700">{listing.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Make Offer Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-zinc-200 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Make an Offer</h3>

              <div className="space-y-4 mb-6">
                {/* Credits Requested */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Credits Requested (tCO₂e)
                  </label>
                  <input
                    type="number"
                    value={offer.creditsRequested}
                    onChange={(e) => {
                      setOffer({ ...offer, creditsRequested: e.target.value });
                      setError('');
                    }}
                    max={listing.creditsEarned}
                    min="0"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    Max: {listing.creditsEarned?.toLocaleString()}
                  </p>
                </div>

                {/* Price Per Credit */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Price per Credit (₹)
                  </label>
                  <input
                    type="number"
                    value={offer.pricePerCredit}
                    onChange={(e) => {
                      setOffer({ ...offer, pricePerCredit: e.target.value });
                      setError('');
                    }}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="₹0.00"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    Market: ₹{listing.pricePerCredit?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Offer Summary */}
              <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
                <p className="text-xs text-zinc-600 font-medium mb-1">TOTAL OFFER VALUE</p>
                <p className="text-2xl font-bold text-green-700">
                  ₹{totalOfferValue.toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>

              {/* Make Offer Button */}
              <button
                onClick={handleMakeOffer}
                disabled={sending || !offer.creditsRequested || !offer.pricePerCredit}
                className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {sending ? 'Sending...' : '💼 Make Offer'}
              </button>
            </div>
          </div>

          {/* Right Column - Message Thread */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Negotiation Thread</h3>

              {/* Messages */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-600">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === user?._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 ${
                          msg.sender === user?._id
                            ? 'bg-green-600 text-white'
                            : 'bg-zinc-200 text-zinc-900'
                        }`}
                      >
                        {msg.type === 'offer' ? (
                          <div>
                            <p className="text-sm font-bold mb-1">
                              Offer: {msg.creditsRequested} tCO₂e @ ₹{msg.pricePerCredit}/credit
                            </p>
                            <p className="text-xs opacity-90">
                              Total: ₹{(msg.creditsRequested * msg.pricePerCredit).toLocaleString()}
                            </p>
                            {msg.status && (
                              <p className="text-xs opacity-75 mt-1">
                                Status: {msg.status}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">{msg.text || msg.message}</p>
                        )}
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Offer Actions */}
                      {msg.type === 'offer' && msg.status === 'pending' && msg.sender !== user?._id && (
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleAcceptOffer(msg._id)}
                            className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded hover:bg-green-200"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => handleRejectOffer(msg._id)}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded hover:bg-red-200"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageText.trim()}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  💬 Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
