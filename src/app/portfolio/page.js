'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [retirements, setRetirements] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('batches');
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let currentUser = null;
      const authRes = await fetch('/api/auth/verify', { headers, credentials: 'include' });
      if (authRes.ok) {
        const authData = await authRes.json();
        currentUser = authData.user || authData.data;
        setUser(currentUser);
      } else if (token) {
        const profileRes = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          currentUser = profileData.data;
          setUser(currentUser);
        } else {
          router.push('/login');
          return;
        }
      } else {
        router.push('/login');
        return;
      }

      const balRes = await fetch('/api/blockchain/balance', { headers, credentials: 'include' });
      if (balRes.ok) {
        const balData = await balRes.json();
        if (balData.success) {
          setWalletData(balData.data);
        }
      }

      const retRes = await fetch('/api/blockchain/retire', { headers, credentials: 'include' });
      if (retRes.ok) {
        const retData = await retRes.json();
        if (retData.success) {
          setRetirements(retData.data || []);
        }
      }

      const tradeRes = await fetch('/api/trade-offers', { headers, credentials: 'include' });
      if (tradeRes.ok) {
        const tradeData = await tradeRes.json();
        if (tradeData.success) {
          setTradeHistory(tradeData.data?.trades || tradeData.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyWallet = () => {
    if (walletData?.walletAddress) {
      navigator.clipboard.writeText(walletData.walletAddress);
      alert('Wallet address copied to clipboard!');
    }
  };

  const balances = walletData?.balances || [];
  const totalOwned = walletData?.totalCreditsOwned || 0;
  const totalRetired = walletData?.totalCreditsRetired || 0;
  const isSeller = user?.role === 'SELLER' || user?.role === 'FARMER';

  const dashboardHref =
    isSeller
      ? '/seller/dashboard'
      : user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : '/buyer/dashboard';

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1B4332] flex items-center justify-center text-white shadow-md">
                <span>🌿</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
                Carbon Asset Portfolio
              </h1>
              <span className="bg-[#1B4332]/10 text-[#1B4332] text-xs font-bold px-3 py-1 rounded-full border border-[#1B4332]/20">
                Verified Climate Assets
              </span>
            </div>
            <p className="text-zinc-600 mt-2 text-sm max-w-2xl leading-relaxed">
              {isSeller
                ? 'Manage your verified carbon credit assets, track inventory, and view direct settlement activity.'
                : 'Manage your verified carbon credit holdings, track permanent voluntary retirements, and generate official proof certificates.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={dashboardHref}
              className="btn-pill btn-pill-ghost text-xs !py-2.5 !px-5"
            >
              ← Back to Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="btn-pill bg-[#1B4332]/10 hover:bg-[#1B4332]/20 text-[#1B4332] font-semibold text-xs !py-2.5 !px-5 transition"
            >
              {isSeller ? '🛒 Marketplace' : '🛍️ Buy Credits'}
            </Link>
            {!isSeller && (
              <Link
                href="/retire"
                className="btn-pill bg-[#606C38] hover:bg-[#606C38]/90 text-white font-bold text-xs !py-2.5 !px-5 shadow-sm transition"
              >
                🔥 Retire Credits
              </Link>
            )}
          </div>
        </div>

        {/* Overview Stats & Registry Account Card */}
        <div className={`grid grid-cols-1 ${isSeller ? 'md:grid-cols-2' : 'lg:grid-cols-3'} gap-6 mb-8`}>
          {/* Total Owned Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1B4332]/10 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="eyebrow mb-1">Active Credits Owned</p>
                <h3 className="font-display text-4xl font-extrabold text-[#1B4332] mt-1">
                  {totalOwned.toLocaleString()} <span className="text-sm font-sans font-normal text-zinc-500">tCO2e</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {isSeller ? 'Available in active inventory' : 'Available for offset or transfer'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-2xl">
                🌱
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-zinc-100 text-xs text-[#1B4332] font-semibold">
              Across {balances.length} certified carbon batches
            </div>
          </div>

          {/* Total Retired Card (Buyer / Corporate only) */}
          {!isSeller && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1B4332]/10 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="eyebrow mb-1">Total Offset / Retired</p>
                  <h3 className="font-display text-4xl font-extrabold text-[#606C38] mt-1">
                    {totalRetired.toLocaleString()} <span className="text-sm font-sans font-normal text-zinc-500">tCO2e</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Permanently retired & certified</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#606C38]/10 flex items-center justify-center text-2xl">
                  🔥
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-100 text-xs text-[#606C38] font-semibold">
                {retirements.length} official offset certificates generated
              </div>
            </div>
          )}

          {/* Climate Registry Account Details */}
          <div className="bg-[#0B1F17] text-white rounded-3xl p-6 shadow-xl relative flex flex-col justify-between border border-white/10">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#DDA15E] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Climate Registry Account
                </span>
                <span className="text-[10px] bg-white/10 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                  Verified & Secure
                </span>
              </div>

              <div className="mt-4">
                <p className="text-[11px] text-white/60 mb-1">Registry Account ID:</p>
                <div className="bg-white/10 p-3 rounded-2xl border border-white/15 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-emerald-300 truncate">
                    {walletData?.walletAddress ? `${walletData.walletAddress.substring(0, 10)}...${walletData.walletAddress.substring(34)}` : 'Verified Registry Active'}
                  </span>
                  {walletData?.walletAddress && (
                    <button
                      onClick={copyWallet}
                      className="text-white hover:text-[#DDA15E] text-xs px-2.5 py-1 bg-white/10 rounded-lg transition font-semibold"
                      title="Copy Registry ID"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-white/60">
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                <span>🛡️</span> Immutable Audit Trail
              </span>
              <span>Automated Compliance</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-3xl p-2 shadow-sm border border-[#1B4332]/10 mb-8 flex gap-2">
          <button
            onClick={() => setActiveTab('batches')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'batches'
                ? 'bg-[#1B4332] text-white shadow-md'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span>🌾</span> Owned Credit Batches ({balances.length})
          </button>
          {!isSeller && (
            <button
              onClick={() => setActiveTab('retirements')}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'retirements'
                  ? 'bg-[#1B4332] text-white shadow-md'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>📜</span> Retirement Certificates ({retirements.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-[#1B4332] text-white shadow-md'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <span>⛓️</span> Settlement Log ({tradeHistory.length})
          </button>
        </div>

        {/* Main Tab Content */}
        {loading ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#1B4332]/10 shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
            <p className="text-zinc-600 font-medium text-sm">Loading verified registry asset records...</p>
          </div>
        ) : (
          <div>
            {/* 1. Owned Batches Tab */}
            {activeTab === 'batches' && (
              <div className="space-y-6">
                {balances.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center border border-[#1B4332]/10 shadow-sm">
                    <span className="text-5xl">🌾</span>
                    <h3 className="font-display text-2xl font-bold text-[#0B1F17] mt-3">
                      No Carbon Batches in Wallet
                    </h3>
                    <p className="text-zinc-600 text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
                      {isSeller
                        ? 'All your generated carbon credit batches are actively listed on the marketplace for buyers to purchase. Check your Seller Dashboard to manage your active listings.'
                        : 'You do not currently hold active tokenized credits. Browse verified listings in the marketplace to purchase high-integrity credits.'}
                    </p>
                    <Link
                      href={isSeller ? '/seller/dashboard' : '/marketplace'}
                      className="mt-6 inline-block btn-pill btn-pill-solid text-xs !py-3 !px-6"
                    >
                      {isSeller ? 'View Active Listings on Dashboard →' : '🛒 Browse Marketplace'}
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {balances.map((b) => (
                      <div
                        key={b.batchId}
                        className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-[#1B4332]/10 overflow-hidden p-6 flex flex-col justify-between transition"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-[10px] font-bold tracking-widest text-[#DDA15E] uppercase">
                                Token #{b.tokenId}
                              </span>
                              <h4 className="font-display text-xl font-bold text-[#0B1F17] mt-0.5">
                                {b.creditType === 'PREMIUM' ? '⭐ Premium-Quality' : b.creditType === 'MEDIUM' ? '🌿 Medium-Quality' : '🛡️ Baseline'} Credit
                              </h4>
                              <p className="text-xs text-zinc-500">Vintage {b.vintage || '2026'}</p>
                            </div>
                            <span className="bg-[#1B4332]/10 text-[#1B4332] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#1B4332]/20">
                              ERC-1155
                            </span>
                          </div>

                          <div className="bg-[#FAF8F2] p-4 rounded-2xl border border-[#1B4332]/10 space-y-2 text-xs mb-4">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Owned Balance:</span>
                              <span className="font-extrabold text-[#1B4332] text-sm">
                                {(b.balance ?? b.amount ?? 0).toLocaleString()} tCO2e
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Origin State:</span>
                              <span className="font-semibold text-zinc-800">{b.geography?.state || b.state || 'India'}</span>
                            </div>
                          </div>
                        </div>

                        {isSeller ? (
                          <div className="flex gap-2 pt-2">
                            <Link
                              href="/listings/create"
                              className="flex-1 btn-pill bg-[#1B4332] hover:bg-[#1B4332]/90 text-white text-xs !py-2.5 text-center font-bold"
                            >
                              + List on Marketplace
                            </Link>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-2">
                            <Link
                              href={`/retire?batchId=${b.batchId}&amount=${b.balance ?? b.amount}`}
                              className="flex-1 btn-pill bg-[#606C38] hover:bg-[#606C38]/90 text-white text-xs !py-2.5 text-center font-bold"
                            >
                              🔥 Retire / Offset
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Retirement Certificates Tab */}
            {activeTab === 'retirements' && (
              <div className="bg-white rounded-3xl shadow-sm border border-[#1B4332]/10 overflow-hidden p-8">
                <h3 className="font-display text-xl font-bold text-[#0B1F17] mb-6">
                  Permanent Carbon Offset Records
                </h3>
                {retirements.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    No retirements executed yet. When you burn credits to offset carbon emissions, your permanent cryptographic proof will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F2] text-[#0B1F17] uppercase font-bold text-[10px] tracking-wider border-b border-zinc-200">
                        <tr>
                          <th className="p-4 rounded-l-2xl">Date</th>
                          <th className="p-4">Token ID</th>
                          <th className="p-4">Offset Amount</th>
                          <th className="p-4">Beneficiary</th>
                          <th className="p-4">Reason</th>
                          <th className="p-4">Burn Tx Hash</th>
                          <th className="p-4 text-right rounded-r-2xl">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {retirements.map((rec) => (
                          <tr key={rec._id} className="hover:bg-zinc-50/80 transition">
                            <td className="p-4 text-zinc-600 font-medium">
                              {new Date(rec.createdAt || rec.confirmedAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 font-mono font-bold text-[#1B4332]">
                              Token #{rec.tokenId || rec.batchId?.tokenId || '—'}
                            </td>
                            <td className="p-4">
                              <span className="font-extrabold text-[#606C38] bg-[#606C38]/10 px-2.5 py-1 rounded-full border border-[#606C38]/20">
                                {rec.amount} tCO2e
                              </span>
                            </td>
                            <td className="p-4 font-bold text-[#0B1F17]">
                              {rec.beneficiary || 'Self'}
                            </td>
                            <td className="p-4 text-zinc-600">
                              {rec.retirementReason?.replace('_', ' ') || 'Voluntary Offset'}
                            </td>
                            <td className="p-4">
                              {rec.retirementTxHash ? (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(rec.retirementTxHash);
                                    alert('Transaction hash copied to clipboard!');
                                  }}
                                  className="font-mono text-[11px] text-[#1B4332] bg-[#1B4332]/10 hover:bg-[#1B4332]/20 px-2.5 py-1 rounded-lg border border-[#1B4332]/20 transition"
                                  title="Click to copy full Tx Hash"
                                >
                                  ⛓️ {rec.retirementTxHash.substring(0, 8)}... 📋
                                </button>
                              ) : (
                                <span className="text-zinc-400">Confirmed</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedCertificate(rec)}
                                className="btn-pill btn-pill-solid text-xs !py-1.5 !px-3 font-bold"
                              >
                                📜 Certificate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. Transaction Settlement Log Tab */}
            {activeTab === 'transactions' && (
              <div className="bg-white rounded-3xl shadow-sm border border-[#1B4332]/10 overflow-hidden p-8">
                <h3 className="font-display text-xl font-bold text-[#0B1F17] mb-6">
                  On-Chain Settlement Activity
                </h3>
                {tradeHistory.length === 0 ? (
                  <p className="text-zinc-500 text-xs text-center py-10">No recent trades or transfers logged.</p>
                ) : (
                  <div className="space-y-4">
                    {tradeHistory.map((trade, idx) => (
                      <div
                        key={trade._id || idx}
                        className="bg-[#FAF8F2] p-5 rounded-2xl border border-[#1B4332]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[#0B1F17] text-sm">
                              {trade.creditsRequested} tCO2e Purchase
                            </span>
                            <span className="bg-[#1B4332]/10 text-[#1B4332] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
                              {trade.status || 'SETTLED'}
                            </span>
                          </div>
                          <p className="text-zinc-500 mt-1">
                            Total Settlement Value: ₹{(trade.negotiatedTotalPrice || trade.originalTotalPrice || 0).toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {trade.settlementTxHash && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(trade.settlementTxHash);
                                alert('Transaction hash copied to clipboard!');
                              }}
                              className="font-mono text-[#1B4332] bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-xl border border-[#1B4332]/20 transition flex items-center gap-1 font-semibold"
                            >
                              <span>⛓️</span> Tx: {trade.settlementTxHash.substring(0, 10)}... 📋
                            </button>
                          )}
                          <span className="text-zinc-400">
                            {new Date(trade.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Certificate Modal */}
        {selectedCertificate && (
          <CertificateModal
            certificate={selectedCertificate}
            onClose={() => setSelectedCertificate(null)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Verified Carbon Retirement Certificate Modal
 */
function CertificateModal({ certificate, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FAF8F2] rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#1B4332]/20">
        <div className="p-8 sm:p-12 bg-white text-center relative border-8 border-double border-[#1B4332] m-3 rounded-2xl shadow-inner">
          <span className="absolute top-3 left-4 text-2xl text-[#1B4332]">🌿</span>
          <span className="absolute top-3 right-4 text-2xl text-[#1B4332]">🌿</span>
          <span className="absolute bottom-3 left-4 text-2xl text-[#1B4332]">🌿</span>
          <span className="absolute bottom-3 right-4 text-2xl text-[#1B4332]">🌿</span>

          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#606C38] mb-1">
            Carbon Bazaar Official Registry
          </h2>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
            Certificate of Carbon Offset
          </h1>
          <div className="w-24 h-1 bg-[#1B4332] mx-auto my-4 rounded-full"></div>

          <p className="text-xs text-zinc-600 mt-4">This document cryptographically certifies that</p>
          <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1F17] mt-1">
            {certificate.beneficiary || 'Verified Participant'}
          </h3>
          <p className="text-xs text-zinc-600 mt-1">has permanently retired and neutralized</p>

          <div className="my-6 bg-[#1B4332]/10 text-[#1B4332] font-black text-3xl sm:text-4xl py-3 px-8 rounded-2xl inline-block border border-[#1B4332]/20 shadow-inner">
            {certificate.amount} <span className="text-xl font-bold font-sans">tCO2e</span>
          </div>

          <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
            of verified agricultural carbon credits officially certified and permanently retired on the immutable climate registry.
          </p>

          <div className="mt-8 pt-6 border-t border-zinc-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left text-xs">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-bold">Certificate ID</p>
              <p className="font-mono font-bold text-zinc-900 truncate">
                {certificate._id || 'CERT-2026-CB'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-bold">Retirement Date</p>
              <p className="font-semibold text-zinc-900">
                {new Date(certificate.createdAt || certificate.confirmedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-bold">Batch ID</p>
              <p className="font-mono font-bold text-[#1B4332]">
                #{certificate.tokenId || certificate.batchId?.tokenId || '1'}
              </p>
            </div>
          </div>

          {certificate.retirementTxHash && (
            <div className="mt-4 p-3 bg-[#FAF8F2] rounded-xl text-[11px] font-mono text-zinc-700 border border-[#1B4332]/15 truncate">
              🏛️ Official Audit Record: {certificate.retirementTxHash}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#FAF8F2] border-t border-[#1B4332]/10 flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="btn-pill btn-pill-ghost text-xs !py-2 !px-5"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="btn-pill btn-pill-solid text-xs !py-2 !px-6"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
