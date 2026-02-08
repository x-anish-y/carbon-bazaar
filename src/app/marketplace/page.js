'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MarketplacePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getDeterministicIndex = (seed) => {
    const str = String(seed || '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) % 2147483647;
    }
    return Math.abs(hash);
  };

  const getTrustBadge = (listing) => {
    // Listing-level land verification takes precedence for purchasing.
    // If the listing is not approved yet (or missing), treat it as pending.
    if (listing?.landVerificationStatus === 'REJECTED') {
      return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
    }

    if (listing?.landVerificationStatus !== 'APPROVED') {
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
    }

    const status = listing?.sellerId?.trustStatus || listing?.sellerTrustStatus;
    if (status === 'TRUSTED') {
      return { label: 'Trustworthy', className: 'bg-green-100 text-green-800' };
    }
    if (status === 'CONFLICTED') {
      return { label: 'Not trustworthy', className: 'bg-red-100 text-red-800' };
    }
    if (status === 'PENDING') {
      return { label: 'Pending verification', className: 'bg-yellow-100 text-yellow-800' };
    }

    // Fallback ("saved user" / missing trust info): deterministic random color
    const seed = listing?.sellerId?._id || listing?.sellerId || listing?._id;
    const variants = [
      { label: 'Pending verification', className: 'bg-yellow-100 text-yellow-800' },
      { label: 'Pending verification', className: 'bg-green-100 text-green-800' },
      { label: 'Pending verification', className: 'bg-red-100 text-red-800' },
    ];
    return variants[getDeterministicIndex(seed) % variants.length];
  };
  
  // Buy modal state
  const [buyModal, setBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [buyForm, setBuyForm] = useState({ creditsRequested: '', negotiatedPrice: '' });
  const [buying, setBuying] = useState(false);

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

    const fetchData = async () => {
      try {
        // Fetch user profile if logged in
        if (token) {
          const userResponse = await fetch('/api/users/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData.data);
          }
        }

        // Fetch ACTIVE listings
        const listingsResponse = await fetch('/api/listings?status=ACTIVE&limit=100', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          setListings(listingsData.data || []);
        } else {
          setError('Failed to load listings');
        }
      } catch (err) {
        console.error('Error fetching marketplace data:', err);
        setError('Failed to load marketplace listings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openBuyModal = (listing) => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (listing?.landVerificationStatus !== 'APPROVED') {
      setError('This listing is pending admin approval');
      return;
    }
    
    // Prevent buying own listing
    if (listing.sellerId._id === user._id || listing.sellerId === user._id) {
      setError('You cannot buy your own listing');
      return;
    }

    setSelectedListing(listing);
    setBuyForm({ 
      creditsRequested: Math.min(10, listing.availableCredits).toString(),
      negotiatedPrice: listing.pricePerCredit.toString()
    });
    setBuyModal(true);
  };

  const handleBuySubmit = async () => {
    if (!selectedListing || !buyForm.creditsRequested || !buyForm.negotiatedPrice) {
      setError('Please fill all fields');
      return;
    }

    const creditsRequested = parseFloat(buyForm.creditsRequested);
    const negotiatedPrice = parseFloat(buyForm.negotiatedPrice);

    if (creditsRequested <= 0 || creditsRequested > selectedListing.availableCredits) {
      setError(`Credits must be between 0.01 and ${selectedListing.availableCredits}`);
      return;
    }

    if (negotiatedPrice <= 0 || negotiatedPrice > 10000) {
      setError('Price must be between ₹0.01 and ₹10,000');
      return;
    }

    setBuying(true);
    try {
      const token = localStorage.getItem('token');
      
      // Step 1: Create Razorpay order
      const orderResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: selectedListing._id,
          creditsRequested,
          negotiatedPricePerCredit: negotiatedPrice,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        setError(orderData.message || 'Failed to create payment order');
        setBuying(false);
        return;
      }

      // Step 2: Load Razorpay and open payment modal
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: orderData.data.key,
          order_id: orderData.data.orderId,
          amount: orderData.data.amount,
          currency: 'INR',
          name: 'Carbon Bazaar',
          description: `Purchase ${creditsRequested} tCO₂e of ${selectedListing.cropType}`,
          image: 'https://via.placeholder.com/100',
          prefill: {
            name: user?.name || 'Buyer',
            email: user?.email || '',
          },
          handler: async function (response) {
            // Step 3: Redirect to payment verification page
            try {
              // Construct verification URL with payment details
              const verificationUrl = new URL('/payment-verification', window.location.origin);
              verificationUrl.searchParams.set('razorpay_order_id', orderData.data.orderId);
              verificationUrl.searchParams.set('razorpay_payment_id', response.razorpay_payment_id);
              verificationUrl.searchParams.set('razorpay_signature', response.razorpay_signature);
              verificationUrl.searchParams.set('listingId', selectedListing._id);
              verificationUrl.searchParams.set('creditsRequested', creditsRequested);
              verificationUrl.searchParams.set('negotiatedPrice', negotiatedPrice);
              verificationUrl.searchParams.set('userRole', user?.role || 'COMPANY');
              verificationUrl.searchParams.set('message', `Paid offer for ${creditsRequested} tCO₂e at ₹${negotiatedPrice}/credit`);

              // Redirect to payment verification page
              window.location.href = verificationUrl.toString();
            } catch (err) {
              console.error('Redirect error:', err);
              setError('Failed to process payment. Please contact support.');
              setBuying(false);
            }
          },
          modal: {
            ondismiss: function () {
              setError('Payment cancelled');
              setBuying(false);
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      };
    } catch (err) {
      console.error('Error placing offer:', err);
      setError('Server error. Please try again.');
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-green-600">🌾</span>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Carbon Bazaar</h1>
                <p className="text-xs text-zinc-600">India's Carbon Credit Marketplace</p>
              </div>
            </div>
            <div className="flex gap-3">
              {user ? (
                <>
                  <Link
                    href={user.role === 'FARMER' ? '/farmer/dashboard' : '/company/dashboard'}
                    className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Dashboard
                  </Link>
                  {user.role === 'FARMER' && (
                    <Link
                      href="/listings/create"
                      className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      + List Credits
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      router.push('/');
                    }}
                    className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
        )}

        {/* Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">
            📊 Active Carbon Credit Listings
          </h2>
          <p className="text-zinc-600">
            Buy quality carbon credits directly from verified {listings.length > 0 ? 'farmers and companies' : 'sellers'}
          </p>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
            <p className="text-3xl mb-4">📭</p>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">No listings available</h3>
            <p className="text-zinc-600 mb-6">
              Check back soon for new carbon credit listings
            </p>
            {user?.role === 'FARMER' && (
              <Link
                href="/listings/create"
                className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Your First Listing
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {listings.map((listing) => {
              const cropEmoji = cropEmojis[listing.cropType] || '🌾';
              const sellerName = listing.sellerId?.name || listing.sellerName || 'Anonymous';
              const sellerType = listing.sellerType || 'FARMER';
              const isOwnListing = user && (listing.sellerId?._id === user._id || listing.sellerId === user._id);
              const isListingPending = listing?.landVerificationStatus !== 'APPROVED';
              
              return (
                <div
                  key={listing._id}
                  className="bg-white rounded-lg border border-zinc-200 p-6 hover:shadow-lg transition-shadow flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{cropEmoji}</span>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-zinc-900">
                          {listing.cropType || 'Carbon Credits'}
                        </h3>
                        <p className="text-xs text-zinc-600 mt-1">
                          {sellerType === 'COMPANY' ? '🏢' : '👨‍🌾'} {sellerName}
                        </p>
                        {!isOwnListing && (
                          <div className="mt-2">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded ${getTrustBadge(listing).className}`}
                              title="Seller trust status"
                            >
                              {getTrustBadge(listing).label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isOwnListing && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Your Listing
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-zinc-600 mb-4 line-clamp-2">
                    {listing.description || 'Quality carbon credits from verified source'}
                  </p>

                  {/* State & Month */}
                  <div className="flex gap-2 mb-4 text-xs text-zinc-600">
                    <span>📍 {listing.state}</span>
                    <span>📅 {listing.month}</span>
                  </div>

                  {/* Key Details */}
                  <div className="bg-green-50 rounded-lg p-4 mb-4 space-y-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-700">Available</span>
                      <span className="text-lg font-bold text-green-600">
                        {listing.availableCredits?.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 4,
                        })} tCO₂e
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-700">Price per Credit</span>
                      <span className="text-lg font-bold text-zinc-900">
                        ₹{listing.pricePerCredit?.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-green-200 pt-3 flex justify-between items-center">
                      <span className="text-sm text-zinc-700 font-medium">Total Value</span>
                      <span className="text-lg font-bold text-green-700">
                        ₹{(listing.availableCredits * listing.pricePerCredit).toLocaleString('en-IN', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      ✅ {listing.status}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  {!isOwnListing && (
                    <button
                      onClick={() => openBuyModal(listing)}
                      disabled={isListingPending}
                      className={
                        isListingPending
                          ? 'w-full px-4 py-2 bg-zinc-200 text-zinc-600 text-sm font-medium rounded-lg cursor-not-allowed'
                          : 'w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors'
                      }
                    >
                      💳 Buy Credits
                    </button>
                  )}
                  {isOwnListing && (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-zinc-100 text-zinc-600 text-sm font-medium rounded-lg cursor-not-allowed"
                    >
                      Your Listing
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <h3 className="font-bold text-zinc-900 mb-4">🌍 How Carbon Bazaar Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-700">
            <div>
              <p className="font-medium mb-1">👨‍🌾 For Farmers</p>
              <p>List your carbon credits and get instant buyers from verified companies</p>
            </div>
            <div>
              <p className="font-medium mb-1">🏢 For Companies</p>
              <p>Find quality carbon credits to meet your ESG compliance requirements</p>
            </div>
            <div>
              <p className="font-medium mb-1">✅ Verified & Transparent</p>
              <p>All transactions are verified and tracked for regulatory compliance</p>
            </div>
          </div>
        </div>
      </main>

      {/* Buy Modal */}
      {buyModal && selectedListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900">Purchase Offer</h2>
              <button
                onClick={() => setBuyModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* Listing Summary */}
            <div className="bg-zinc-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-700">
                <strong>{selectedListing.cropType}</strong> from <strong>{selectedListing.sellerId?.name}</strong>
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Available: {selectedListing.availableCredits?.toLocaleString()} tCO₂e @ ₹{selectedListing.pricePerCredit}/credit
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Credits You Want (tCO₂e)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedListing.availableCredits}
                  value={buyForm.creditsRequested}
                  onChange={(e) => setBuyForm({ ...buyForm, creditsRequested: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Max: {selectedListing.availableCredits?.toLocaleString()} tCO₂e
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Your Offer Price (₹ per credit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  value={buyForm.negotiatedPrice}
                  onChange={(e) => setBuyForm({ ...buyForm, negotiatedPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Enter price"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Original: ₹{selectedListing.pricePerCredit?.toFixed(2)}/credit
                </p>
              </div>

              {buyForm.creditsRequested && buyForm.negotiatedPrice && (
                <>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm text-zinc-700">
                      <strong>Total: ₹{(parseFloat(buyForm.creditsRequested) * parseFloat(buyForm.negotiatedPrice)).toLocaleString('en-IN', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}</strong>
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">💳 Payment Method</p>
                    <p className="text-xs text-blue-700">Secured payment via Razorpay. Your order will be placed after successful payment.</p>
                  </div>
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setBuyModal(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBuySubmit}
                disabled={buying}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-zinc-400 flex items-center justify-center gap-2"
              >
                {buying ? (
                  <>
                    <span className="inline-block animate-spin">⌛</span>
                    Processing...
                  </>
                ) : (
                  <>
                    💳 Pay & Place Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
