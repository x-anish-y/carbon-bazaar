'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disableReason, setDisableReason] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

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

        if (!userResponse.ok) {
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();

        if (userData.data.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        setUser(userData.data);

        const listingsResponse = await fetch('/api/admin/listings', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          setListings(Array.isArray(listingsData.data) ? listingsData.data : []);
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to load listings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleToggleStatus = async (listingId, currentStatus) => {
    const token = localStorage.getItem('token');
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setProcessing(true);

    try {
      const endpoint = newStatus === 'DISABLED'
        ? `/api/admin/listings/${listingId}/disable`
        : `/api/admin/listings/${listingId}/enable`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: disableReason || 'Administrative update' }),
      });

      if (response.ok) {
        setListings(listings.map((l) => (l._id === listingId ? { ...l, status: newStatus } : l)));
        if (selectedListing?._id === listingId) {
          setSelectedListing({ ...selectedListing, status: newStatus });
        }
        setShowDisableModal(false);
        setDisableReason('');
        alert(`Listing status updated to ${newStatus}`);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      setError('Error updating listing status');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading platform listings catalog...</p>
        </div>
      </div>
    );
  }

  const filteredListings = listings.filter((l) => {
    const matchesSearch =
      l.creditType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.cropType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.sellerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.sellerId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.month?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B1F17] flex items-center justify-center text-white">
                <span className="text-sm">🛡️</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              Listings Directory
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="btn-pill btn-pill-ghost text-xs !py-2 !px-4">
              ← Admin Dashboard
            </Link>
            <Link href="/marketplace" className="btn-pill bg-[#1B4332]/10 text-[#1B4332] text-xs !py-2 !px-4 font-semibold">
              Live Market
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
              Carbon Credit Listings Catalog
            </h1>
            <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
              Audit all verified carbon batches, verify pricing integrity, and manage marketplace active / delisted states.
            </p>
          </div>

          <span className="text-xs font-bold px-4 py-2 bg-white rounded-2xl border border-[#1B4332]/20 text-[#1B4332]">
            Total Listings: {listings.length}
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          <input
            type="text"
            placeholder="Search by credit type, seller name, or month..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'ACTIVE', 'SOLD_OUT', 'DISABLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === st
                    ? 'bg-[#1B4332] text-white shadow-sm'
                    : 'bg-[#FAF8F2] text-zinc-600 hover:bg-zinc-100 border border-[#1B4332]/10'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F2] text-[#0B1F17] uppercase font-bold text-[10px] tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="p-4 rounded-l-2xl">Credit Type / Vintage</th>
                  <th className="p-4">Seller</th>
                  <th className="p-4">Credits</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Token ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredListings.map((l) => (
                  <tr key={l._id} className="hover:bg-zinc-50/80 transition">
                    <td className="p-4 font-bold text-[#0B1F17]">
                      {l.creditType === 'PREMIUM' ? '⭐ Premium' : l.creditType === 'MEDIUM' ? '🌿 Medium' : '🛡️ Baseline'} ({l.month})
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-zinc-900">{l.sellerId?.name || 'Seller'}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{l.sellerId?.email}</p>
                    </td>
                    <td className="p-4 font-bold text-[#1B4332]">
                      {l.availableCredits} / {l.creditsAmount} tCO2e
                    </td>
                    <td className="p-4 font-extrabold text-[#0B1F17]">
                      ₹{l.pricePerCredit}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#1B4332]">
                      {l.tokenId || l.batchId?.tokenId ? `#${l.tokenId || l.batchId?.tokenId}` : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : l.status === 'DISABLED'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {l.status === 'ACTIVE' ? (
                        <button
                          onClick={() => {
                            setSelectedListing(l);
                            setShowDisableModal(true);
                          }}
                          className="btn-pill bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs !py-1.5 !px-3 font-bold transition"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(l._id, l.status)}
                          className="btn-pill btn-pill-solid text-xs !py-1.5 !px-3 font-bold"
                        >
                          Enable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Disable Modal */}
      {showDisableModal && selectedListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 space-y-4">
            <h3 className="font-display text-xl font-bold text-red-700">
              Disable Marketplace Listing
            </h3>
            <p className="text-xs text-zinc-600">
              Disabling will remove this listing from the active marketplace so buyers cannot purchase it.
            </p>
            <textarea
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
              placeholder="e.g. Price dispute or quality verification review..."
              rows={3}
              className="w-full px-4 py-3 bg-[#FAF8F2] border border-zinc-300 rounded-2xl text-xs text-[#0B1F17] focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDisableModal(false)}
                className="flex-1 btn-pill btn-pill-ghost text-xs !py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleStatus(selectedListing._id, 'ACTIVE')}
                disabled={processing}
                className="flex-1 btn-pill bg-red-600 text-white hover:bg-red-700 text-xs !py-2.5 font-bold disabled:opacity-50"
              >
                Confirm Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
