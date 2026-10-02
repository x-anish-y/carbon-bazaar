"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketplacePage() {
  const [user, setUser] = useState(null);
  const [userWallet, setUserWallet] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("ACTIVE");
  const [filterCreditType, setFilterCreditType] = useState("");
  const [filterSellerType, setFilterSellerType] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterTokenizedOnly, setFilterTokenizedOnly] = useState(false);

  // Negotiation modal state
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const [negotiateData, setNegotiateData] = useState({
    creditsRequested: "",
    negotiatedPrice: "",
    message: "",
  });
  const [negotiateError, setNegotiateError] = useState(null);
  const [negotiateLoading, setNegotiateLoading] = useState(false);

  // Buy modal state
  const [buyQuantity, setBuyQuantity] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [
    filterStatus,
    filterCreditType,
    filterSellerType,
    filterMonth,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const checkUser = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/auth/verify", {
        headers,
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const loggedUser = data.user || data.data;
        setUser(loggedUser);
        fetchUserWallet(token);
      } else if (token) {
        const profileRes = await fetch("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUser(profileData.data);
          fetchUserWallet(token);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error checking user:", err);
    }
  };

  const fetchUserWallet = async (token) => {
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/blockchain/balance", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUserWallet(data.data);
      }
    } catch (err) {
      console.error("Error fetching user wallet:", err);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterCreditType) params.append("creditType", filterCreditType);
      if (filterSellerType) params.append("sellerType", filterSellerType);
      if (filterMonth) params.append("month", filterMonth);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (sortBy) params.append("sortBy", sortBy);

      const response = await fetch(`/api/listings?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch listings");
      }

      setListings(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNegotiateModal = (listing) => {
    setSelectedListing(listing);
    setNegotiateData({
      creditsRequested: listing.availableCredits.toString(),
      negotiatedPrice: listing.pricePerCredit.toString(),
      message: "",
    });
    setNegotiateError(null);
    setShowNegotiateModal(true);
  };

  const openBuyModal = (listing) => {
    setSelectedListing(listing);
    setBuyQuantity(Math.min(listing.availableCredits, 10).toString());
    setBuyError(null);
    setShowBuyModal(true);
  };

  const handleNegotiateSubmit = async () => {
    setNegotiateLoading(true);
    setNegotiateError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/trade-offers", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          listingId: selectedListing._id,
          creditsRequested: parseFloat(negotiateData.creditsRequested),
          offeredPricePerCredit: parseFloat(negotiateData.negotiatedPrice),
          message: negotiateData.message,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit offer");
      }

      alert("Trade offer sent to seller successfully!");
      setShowNegotiateModal(false);
    } catch (err) {
      setNegotiateError(err.message);
    } finally {
      setNegotiateLoading(false);
    }
  };

  const handleDirectBuySubmit = async () => {
    setBuyLoading(true);
    setBuyError(null);

    try {
      const qty = parseFloat(buyQuantity);
      if (!qty || qty <= 0 || qty > selectedListing.availableCredits) {
        setBuyError(
          `Please enter a valid quantity between 0.01 and ${selectedListing.availableCredits}`,
        );
        setBuyLoading(false);
        return;
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/payments", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          listingId: selectedListing._id,
          creditsRequested: qty,
          negotiatedPricePerCredit: selectedListing.pricePerCredit,
          message: "Direct Marketplace Purchase",
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        setBuyError(orderData.message || "Failed to initiate checkout");
        setBuyLoading(false);
        return;
      }

      if (typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: orderData.data.key,
          amount: orderData.data.amount,
          currency: orderData.data.currency || "INR",
          name: "Carbon Bazaar",
          description: `Purchase of ${qty} tCO2e Carbon Credits`,
          order_id: orderData.data.orderId,
          handler: function (response) {
            const params = new URLSearchParams({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              listingId: selectedListing._id,
              creditsRequested: qty.toString(),
              negotiatedPrice: selectedListing.pricePerCredit.toString(),
              message: "Direct Marketplace Purchase",
              userRole: user?.role || "BUYER",
            });
            window.location.href = `/payment-verification?${params.toString()}`;
          },
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
          },
          theme: {
            color: "#1B4332",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setShowBuyModal(false);
      } else {
        const params = new URLSearchParams({
          razorpay_order_id: orderData.data.orderId,
          razorpay_payment_id: `pay_${orderData.data.orderId.substring(6)}`,
          razorpay_signature: "demo_sig",
          listingId: selectedListing._id,
          creditsRequested: qty.toString(),
          negotiatedPrice: selectedListing.pricePerCredit.toString(),
          message: "Direct Marketplace Purchase",
          userRole: user?.role || "BUYER",
        });
        window.location.href = `/payment-verification?${params.toString()}`;
      }
    } catch (err) {
      setBuyError(err.message);
    } finally {
      setBuyLoading(false);
    }
  };

  const displayedListings = listings.filter((l) => {
    if (filterTokenizedOnly) {
      return l.isTokenized || (l.batchId && l.batchId.tokenId);
    }
    return true;
  });

  const totalTokenized = listings.filter(
    (l) => l.isTokenized || l.batchId?.tokenId,
  ).length;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-8 mb-8 border border-[#1B4332]/10 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1B4332] flex items-center justify-center shadow-md">
                  <span className="text-lg text-white">🌱</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
                  Carbon Credit Marketplace
                </h1>
                <span className="bg-[#1B4332]/10 text-[#1B4332] text-xs font-bold px-3 py-1 rounded-full border border-[#1B4332]/20">
                  Audited Climate Registry
                </span>
              </div>
              <p className="text-zinc-600 text-sm mt-2 max-w-2xl leading-relaxed">
                Discover verified, authenticated agricultural carbon credits from Indian regenerative sellers. Direct trading with certified registry provenance.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {user && (
                <Link
                  href="/portfolio"
                  className="btn-pill bg-[#1B4332]/10 hover:bg-[#1B4332]/20 text-[#1B4332] font-semibold !py-2.5 !px-5 text-xs transition"
                >
                  📊 My Portfolio
                </Link>
              )}
              {user?.role !== "SELLER" && user?.role !== "FARMER" && (
                <Link
                  href="/retire"
                  className="btn-pill bg-[#606C38] hover:bg-[#606C38]/90 text-white font-semibold !py-2.5 !px-5 text-xs shadow-sm transition"
                >
                  🔥 Retire Credits
                </Link>
              )}
              {user?.role === "SELLER" || user?.role === "FARMER" ? (
                <Link
                  href="/seller/dashboard"
                  className="btn-pill btn-pill-solid text-xs !py-2.5 !px-5"
                >
                  ← Seller Dashboard
                </Link>
              ) : user?.role === "BUYER" || user?.role === "COMPANY" ? (
                <Link
                  href="/buyer/dashboard"
                  className="btn-pill btn-pill-solid text-xs !py-2.5 !px-5"
                >
                  ← Buyer Dashboard
                </Link>
              ) : user?.role === "ADMIN" ? (
                <Link
                  href="/admin/dashboard"
                  className="btn-pill btn-pill-solid text-xs !py-2.5 !px-5"
                >
                  ← Admin Dashboard
                </Link>
              ) : (
                <Link
                  href="/"
                  className="btn-pill btn-pill-ghost text-xs !py-2.5 !px-5"
                >
                  ← Back to Home
                </Link>
              )}
            </div>
          </div>

          {/* User Registry Status */}
          {user && userWallet && (
            <div className="mt-6 pt-5 border-t border-[#1B4332]/10 flex flex-wrap items-center justify-between gap-4 text-xs bg-[#1B4332]/5 p-4 rounded-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-[#0B1F17]">
                  Registry Account:
                </span>
                <span className="font-mono text-[#0B1F17] bg-white px-2.5 py-1 rounded-lg border border-[#1B4332]/15 shadow-xs font-semibold">
                  {userWallet.walletAddress
                    ? `${userWallet.walletAddress.substring(0, 10)}...${userWallet.walletAddress.substring(34)}`
                    : "Verified Active"}
                </span>
              </div>
              <div className="flex items-center gap-5 text-zinc-700">
                <span>
                  Active Balance:{" "}
                  <strong className="text-[#1B4332] font-bold text-sm">
                    {userWallet.totalCreditsOwned || 0} tCO2e
                  </strong>
                </span>
                {user?.role !== "SELLER" && user?.role !== "FARMER" && (
                  <span>
                    Retired / Offset:{" "}
                    <strong className="text-[#606C38] font-bold text-sm">
                      {userWallet.totalCreditsRetired || 0} tCO2e
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar (Stitch Redesign Theme) */}
        <div className="bg-white rounded-3xl p-6 mb-8 border border-[#1B4332]/10 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Status */}
            <div>
              <label className="eyebrow mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none transition"
              >
                <option value="ACTIVE">Active in Market</option>
                <option value="SOLD_OUT">100% Sold Out</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>

            {/* Seller Type */}
            <div>
              <label className="eyebrow mb-2">Seller Type</label>
              <select
                value={filterSellerType}
                onChange={(e) => setFilterSellerType(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none transition"
              >
                <option value="">All Sellers</option>
                <option value="SELLER">🌾 Direct Sellers</option>
                <option value="AGGREGATOR">🏢 Aggregated Batches</option>
              </select>
            </div>

            {/* Credit Type */}
            <div>
              <label className="eyebrow mb-2">Credit Type</label>
              <select
                value={filterCreditType}
                onChange={(e) => setFilterCreditType(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none transition"
              >
                <option value="">All Credit Types</option>
                <option value="PREMIUM">⭐ Premium-Quality Credits</option>
                <option value="MEDIUM">🌿 Medium-Quality Credits</option>
                <option value="BASELINE">🛡️ Baseline Credits</option>
              </select>
            </div>

            {/* Max Price */}
            <div>
              <label className="eyebrow mb-2">Max Price (₹)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="₹ Any Price"
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none transition"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="eyebrow mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none transition"
              >
                <option value="newest">Newest First</option>
                <option value="cheapest">Lowest Price</option>
                <option value="expensive">Highest Price</option>
                <option value="mostAvailable">Highest Inventory</option>
                <option value="mostSold">Top Selling</option>
              </select>
            </div>
          </div>

          {/* Tokenized Toggle & Summary */}
          <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between flex-wrap gap-3">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterTokenizedOnly}
                onChange={(e) => setFilterTokenizedOnly(e.target.checked)}
                className="rounded text-[#1B4332] focus:ring-[#1B4332] h-4 w-4"
              />
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-[10px] font-bold">
                  ERC-1155
                </span>
                On-Chain Tokenized Batches Only ({totalTokenized})
              </span>
            </label>

            <span className="text-xs text-zinc-500 font-medium">
              Showing <strong>{displayedListings.length}</strong> of{" "}
              {listings.length} verified listings
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#1B4332]/10 shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
            <p className="text-zinc-600 font-medium text-sm">
              Loading verified carbon listings...
            </p>
          </div>
        ) : displayedListings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#1B4332]/10 p-16 text-center shadow-sm">
            <span className="text-5xl">🌿</span>
            <h3 className="font-display text-2xl font-bold text-[#0B1F17] mt-3">
              No Listings Found
            </h3>
            <p className="text-zinc-600 text-sm mt-1.5 max-w-md mx-auto">
              No verified carbon credit listings match your active filter criteria. Try adjusting or clearing filters above.
            </p>
            <button
              onClick={() => {
                setFilterCreditType("");
                setFilterSellerType("");
                setMaxPrice("");
                setFilterStatus("ACTIVE");
                setFilterTokenizedOnly(false);
              }}
              className="mt-5 btn-pill btn-pill-solid text-xs !py-2.5 !px-6"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedListings.map((listing, index) => (
              <EnhancedListingCard
                key={listing._id || index}
                listing={listing}
                onNegotiate={() => openNegotiateModal(listing)}
                onDirectBuy={() => openBuyModal(listing)}
                currentUserId={user?._id}
                currentUserRole={user?.role}
              />
            ))}
          </div>
        )}
      </div>

      {/* Direct Buy Checkout Modal */}
      {showBuyModal && selectedListing && (
        <BuyModal
          listing={selectedListing}
          onClose={() => setShowBuyModal(false)}
          onSubmit={handleDirectBuySubmit}
          buyQuantity={buyQuantity}
          setBuyQuantity={setBuyQuantity}
          buyError={buyError}
          buyLoading={buyLoading}
        />
      )}

      {/* Negotiation Modal */}
      {showNegotiateModal && selectedListing && (
        <NegotiationModal
          listing={selectedListing}
          onClose={() => setShowNegotiateModal(false)}
          onSubmit={handleNegotiateSubmit}
          negotiateData={negotiateData}
          setNegotiateData={setNegotiateData}
          negotiateError={negotiateError}
          negotiateLoading={negotiateLoading}
        />
      )}
    </div>
  );
}

/**
 * Enhanced Photo Card matching Stitch Marketplace Screen
 */
function EnhancedListingCard({
  listing,
  onNegotiate,
  onDirectBuy,
  currentUserId,
  currentUserRole,
}) {
  const isTokenized =
    listing.isTokenized || (listing.batchId && listing.batchId.tokenId);
  const tokenId = listing.tokenId || listing.batchId?.tokenId;
  const isSeller =
    currentUserId &&
    (listing.sellerId?._id === currentUserId ||
      listing.sellerId === currentUserId);

  const percentageSold = (
    (listing.totalSold / listing.creditsAmount) *
    100
  ).toFixed(1);

  const creditType = listing.creditType || mapCropToTier(listing.cropType);
  const tierTheme = getCreditTierTheme(creditType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl bg-[#0B1F17] text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-white/10 flex flex-col justify-between min-h-[440px]"
    >
      {/* Photo Backdrop & Dynamic Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tierTheme.gradient}`} />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.3) 0%, transparent 60%)',
        }}
      />
      {/* Bottom shadow overlay to guarantee crystal clear text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F17] via-[#0B1F17]/70 to-transparent" />

      {/* Top Header Information */}
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{getCreditTierIcon(creditType)}</span>
              <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[#DDA15E]">
                {formatCreditTierName(creditType)}
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
              {formatCreditTierName(creditType).toUpperCase()}
            </h3>
            <p className="text-white/60 text-xs mt-1 flex items-center gap-1.5">
              <span>📅</span> Vintage {listing.month}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono font-bold">
              TOKEN #{tokenId || listing._id?.toString().slice(-4).toUpperCase() || '1001'}
            </span>
          </div>
        </div>

        {/* Big Price Headline */}
        <div className="mt-8">
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            ₹{listing.pricePerCredit.toLocaleString("en-IN")}
            <span className="text-sm font-sans font-normal text-white/70 ml-1.5">
              / Credit
            </span>
          </p>
        </div>

        {/* Detailed Stats Breakdown */}
        <div className="mt-5 space-y-1.5 text-xs text-white/80">
          <div className="flex justify-between">
            <span className="text-white/60">Available Value:</span>
            <span className="font-bold text-white">
              ₹
              {(
                listing.availableCredits * listing.pricePerCredit
              ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Total Batch:</span>
            <span className="font-medium text-white/90">
              ₹
              {(
                listing.creditsAmount * listing.pricePerCredit
              ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Available Inventory:</span>
            <span className="font-bold text-[#DDA15E]">
              {listing.availableCredits.toLocaleString()} tCO2e
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Seller / Origin:</span>
            <span className="font-semibold text-white truncate max-w-[160px]">
              {listing.sellerId?.name || "Regenerative Seller"} ({listing.state || "IN"})
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-white/60">
            <span>Progress</span>
            <span>{percentageSold}% sold</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#DDA15E] to-emerald-400 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, percentageSold))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Footer with Strict Role Separation */}
      <div className="relative z-10 p-6 pt-0">
        {isSeller ? (
          <div className="w-full text-center py-2.5 bg-white/10 text-white/80 rounded-2xl text-xs font-semibold border border-white/15">
            👤 Your Marketplace Listing
          </div>
        ) : currentUserRole === "SELLER" || currentUserRole === "FARMER" ? (
          <div className="w-full text-center py-2.5 bg-[#606C38]/40 text-[#FAF8F2] border border-[#DDA15E]/30 rounded-2xl text-xs font-semibold">
            🌾 Seller Account (Selling only)
          </div>
        ) : listing.status !== "ACTIVE" ? (
          <div className="w-full text-center py-2.5 bg-white/10 text-white/50 rounded-2xl text-xs font-medium">
            Sold Out / Unavailable
          </div>
        ) : onDirectBuy ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onDirectBuy}
              className="btn-pill btn-pill-solid !py-2.5 !px-3 !bg-white !text-[#0B1F17] hover:!bg-[#FEFAE0] text-xs font-bold shadow-md"
            >
              ⚡ Buy Now
            </button>
            <button
              onClick={onNegotiate}
              className="btn-pill btn-pill-ghost-white !py-2.5 !px-3 text-xs font-semibold"
            >
              💬 Make Offer
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center btn-pill btn-pill-solid !py-2.5 !px-4 text-xs font-bold"
          >
            Login as Buyer to Purchase
          </Link>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Direct Buy Instant Checkout Modal
 */
function BuyModal({
  listing,
  onClose,
  onSubmit,
  buyQuantity,
  setBuyQuantity,
  buyError,
  buyLoading,
}) {
  const qty = parseFloat(buyQuantity) || 0;
  const totalPrice = qty * listing.pricePerCredit;
  const isTokenized =
    listing.isTokenized || (listing.batchId && listing.batchId.tokenId);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[#FAF8F2] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#1B4332]/20">
        <div className="bg-[#0B1F17] text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl font-bold">Purchase Carbon Credits</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-[#DDA15E] mt-1">
            {formatCreditTierName(listing.creditType || mapCropToTier(listing.cropType))} — Vintage {listing.month}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {buyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-2xl text-xs font-medium">
              {buyError}
            </div>
          )}

          {isTokenized && (
            <div className="bg-[#1B4332]/10 border border-[#1B4332]/20 p-3.5 rounded-2xl text-xs text-[#0B1F17] flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <span>
                <strong>Automated Settlement:</strong> Credits will be automatically verified & transferred to your registry account upon payment.
              </span>
            </div>
          )}

          <div>
            <label className="eyebrow mb-1.5">
              Quantity to Buy (tCO2e) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={listing.availableCredits}
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#1B4332]/20 rounded-2xl text-sm font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              placeholder="e.g. 50"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Available:{" "}
              <strong>{listing.availableCredits.toLocaleString()} tCO2e</strong>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#1B4332]/10 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Price per credit:</span>
              <span className="font-semibold text-zinc-900">
                ₹{listing.pricePerCredit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Credits requested:</span>
              <span className="font-semibold text-zinc-900">{qty} tCO2e</span>
            </div>
            <div className="pt-2 border-t border-zinc-100 flex justify-between text-sm font-bold text-zinc-900">
              <span>Total Payable:</span>
              <span className="text-[#1B4332] text-base font-extrabold">
                ₹
                {totalPrice.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={buyLoading}
              className="flex-1 btn-pill btn-pill-ghost text-xs !py-2.5"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={buyLoading}
              className="flex-1 btn-pill btn-pill-solid text-xs !py-2.5"
            >
              {buyLoading ? "Processing..." : "💳 Pay with Razorpay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Negotiation Offer Modal
 */
function NegotiationModal({
  listing,
  onClose,
  onSubmit,
  negotiateData,
  setNegotiateData,
  negotiateError,
  negotiateLoading,
}) {
  const totalPrice = (
    parseFloat(negotiateData.creditsRequested || 0) *
    parseFloat(negotiateData.negotiatedPrice || 0)
  ).toFixed(2);

  const discount =
    negotiateData.negotiatedPrice &&
    negotiateData.negotiatedPrice < listing.pricePerCredit
      ? (
          ((listing.pricePerCredit -
            parseFloat(negotiateData.negotiatedPrice)) /
            listing.pricePerCredit) *
          100
        ).toFixed(1)
      : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FAF8F2] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#1B4332]/20 max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0B1F17] text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl font-bold">Negotiate & Send Offer</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-[#DDA15E] mt-1">
            {formatCreditTierName(listing.creditType || mapCropToTier(listing.cropType))} — List Price: ₹
            {listing.pricePerCredit.toLocaleString("en-IN")}/credit
          </p>
        </div>

        <div className="p-6 space-y-4">
          {negotiateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-2xl text-xs font-medium">
              {negotiateError}
            </div>
          )}

          <div>
            <label className="eyebrow mb-1.5">
              Credits Requested (tCO2e) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={listing.availableCredits}
              value={negotiateData.creditsRequested}
              onChange={(e) =>
                setNegotiateData({
                  ...negotiateData,
                  creditsRequested: e.target.value,
                })
              }
              className="w-full px-4 py-3 bg-white border border-[#1B4332]/20 rounded-2xl text-sm font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              placeholder="e.g. 100"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Available: {listing.availableCredits.toLocaleString()} tCO2e
            </p>
          </div>

          <div>
            <label className="eyebrow mb-1.5">
              Offered Price per Credit (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="10000"
              value={negotiateData.negotiatedPrice}
              onChange={(e) =>
                setNegotiateData({
                  ...negotiateData,
                  negotiatedPrice: e.target.value,
                })
              }
              className="w-full px-4 py-3 bg-white border border-[#1B4332]/20 rounded-2xl text-sm font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              placeholder="e.g. 1100"
            />
            {discount > 0 && (
              <p className="text-[11px] text-[#1B4332] font-semibold mt-1">
                Offering a {discount}% discount on list price
              </p>
            )}
          </div>

          {negotiateData.creditsRequested && negotiateData.negotiatedPrice && (
            <div className="bg-white p-4 rounded-2xl border border-[#1B4332]/10 text-xs">
              <div className="flex justify-between text-zinc-700 font-semibold">
                <span>Total Offer Amount:</span>
                <span className="text-[#1B4332] text-sm font-extrabold">
                  ₹{parseFloat(totalPrice).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="eyebrow mb-1.5">
              Message to Seller (Optional)
            </label>
            <textarea
              value={negotiateData.message}
              onChange={(e) =>
                setNegotiateData({ ...negotiateData, message: e.target.value })
              }
              className="w-full px-4 py-3 bg-white border border-[#1B4332]/20 rounded-2xl text-sm text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              rows="3"
              placeholder="Add terms, volume commitments, or notes..."
              maxLength="500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={negotiateLoading}
              className="flex-1 btn-pill btn-pill-ghost text-xs !py-2.5"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={negotiateLoading}
              className="flex-1 btn-pill btn-pill-solid text-xs !py-2.5"
            >
              {negotiateLoading ? "Submitting..." : "Send Offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCreditTierTheme(creditType) {
  const themes = {
    PREMIUM: {
      gradient: "from-[#0B1F17] via-[#1B4332]/95 to-[#287A5E]/80",
    },
    MEDIUM: {
      gradient: "from-[#1A1D0B] via-[#3D421B]/95 to-[#606C38]/80",
    },
    BASELINE: {
      gradient: "from-[#0B151F] via-[#1B2B3A]/95 to-[#3B5B78]/80",
    },
  };
  const upper = creditType?.toUpperCase();
  return themes[upper] || themes.BASELINE;
}

function formatCreditTierName(creditType) {
  const names = {
    PREMIUM: "Premium-Quality",
    MEDIUM: "Medium-Quality",
    BASELINE: "Baseline Tier",
  };
  const upper = creditType?.toUpperCase();
  return names[upper] || "Carbon Credit";
}

function getCreditTierIcon(creditType) {
  const icons = {
    PREMIUM: "⭐",
    MEDIUM: "🌿",
    BASELINE: "🛡️",
  };
  const upper = creditType?.toUpperCase();
  return icons[upper] || "🌱";
}

function mapCropToTier(cropType) {
  const map = {
    RICE: "PREMIUM",
    SUGARCANE: "PREMIUM",
    WHEAT: "MEDIUM",
    PULSES: "MEDIUM",
    FRUITS: "PREMIUM",
    SOYBEAN: "MEDIUM",
    COTTON: "BASELINE",
    MAIZE: "BASELINE",
  };
  return map[cropType] || "BASELINE";
}
