'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

function RetirePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBatchId = searchParams.get('batchId');

  const [user, setUser] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Form State
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [retireAmount, setRetireAmount] = useState('');
  const [retireReason, setRetireReason] = useState('VOLUNTARY_OFFSET');
  const [beneficiary, setBeneficiary] = useState('');
  const [description, setDescription] = useState('');

  // Result state
  const [retirementResult, setRetirementResult] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
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

      if (currentUser?.role === 'SELLER' || currentUser?.role === 'FARMER') {
        router.push('/seller/dashboard');
        return;
      }

      if (currentUser?.name && !beneficiary) {
        setBeneficiary(currentUser.name);
      }

      const balRes = await fetch('/api/blockchain/balance', { headers, credentials: 'include' });
      if (balRes.ok) {
        const balData = await balRes.json();
        if (balData.success) {
          setWalletData(balData.data);
          const batches = balData.data.balances || [];
          if (queryBatchId && batches.some((b) => b.batchId === queryBatchId)) {
            setSelectedBatchId(queryBatchId);
          } else if (batches.length > 0) {
            setSelectedBatchId(batches[0].batchId);
          }
        }
      }
    } catch (err) {
      console.error('Error initializing retire page:', err);
    } finally {
      setLoading(false);
    }
  };

  const batches = walletData?.balances || [];
  const selectedBatch = batches.find((b) => b.batchId === selectedBatchId) || null;
  const maxAvailable = selectedBatch ? (selectedBatch.balance || selectedBatch.amount || 0) : 0;

  const handleSubmitRetirement = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const amount = parseFloat(retireAmount);
      if (!amount || amount <= 0) {
        setError('Please enter a valid credit amount to retire (> 0)');
        setSubmitting(false);
        return;
      }

      if (amount > maxAvailable) {
        setError(`Cannot retire more than your available balance (${maxAvailable} tCO2e)`);
        setSubmitting(false);
        return;
      }

      if (!selectedBatchId) {
        setError('Please select a carbon batch from your wallet');
        setSubmitting(false);
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/blockchain/retire', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          batchId: selectedBatchId,
          amount,
          retirementReason: retireReason,
          beneficiary: beneficiary.trim(),
          description: description.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setError(resData.message || 'Failed to retire credits on-chain');
        setSubmitting(false);
        return;
      }

      setRetirementResult(resData.data);
    } catch (err) {
      setError(err.message || 'An error occurred during retirement');
    } finally {
      setSubmitting(false);
    }
  };

  const amountToRetire = parseFloat(retireAmount) || 0;
  const treesEquivalent = (amountToRetire * 45).toFixed(0);
  const kmEquivalent = (amountToRetire * 4200).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#606C38] flex items-center justify-center text-white shadow-md">
                <span>🔥</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
                Retire Carbon Credits
              </h1>
            </div>
            <p className="text-zinc-600 mt-2 text-sm max-w-xl leading-relaxed">
              Permanently burn on-chain ERC-1155 tokens to claim official ESG offset credits and generate immutable registry proof.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/portfolio"
              className="btn-pill btn-pill-ghost text-xs !py-2.5 !px-5"
            >
              ← My Portfolio
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#1B4332]/10 shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
            <p className="text-zinc-600 font-medium text-sm">Checking custodial token balances...</p>
          </div>
        ) : retirementResult ? (
          /* Success Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-[#1B4332]/10 text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 text-3xl flex items-center justify-center mx-auto shadow-sm">
              ✓
            </div>
            <h2 className="font-display text-3xl font-extrabold text-[#0B1F17]">
              Offset Successfully Executed!
            </h2>
            <p className="text-zinc-600 text-sm max-w-md mx-auto leading-relaxed">
              <strong>{retirementResult.amount} tCO2e</strong> have been permanently retired on the official climate registry for beneficiary <strong>{retirementResult.beneficiary}</strong>.
            </p>

            <div className="bg-[#FAF8F2] p-6 rounded-2xl border border-[#1B4332]/10 max-w-md mx-auto text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Certificate ID:</span>
                <span className="font-mono font-bold text-zinc-900">{retirementResult.certificateId || retirementResult._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Batch ID:</span>
                <span className="font-mono font-bold text-[#1B4332]">#{retirementResult.tokenId || '1'}</span>
              </div>
              {retirementResult.retirementTxHash && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 block mb-1">Official Audit Record:</span>
                  <span className="font-mono text-[10px] text-zinc-700 break-all">{retirementResult.retirementTxHash}</span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Link
                href="/portfolio"
                className="btn-pill btn-pill-solid text-xs !py-3 !px-6"
              >
                📜 View Certificate in Portfolio
              </Link>
              <button
                onClick={() => {
                  setRetirementResult(null);
                  setRetireAmount('');
                  fetchInitialData();
                }}
                className="btn-pill btn-pill-ghost text-xs !py-3 !px-5"
              >
                Retire More
              </button>
            </div>
          </motion.div>
        ) : batches.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-16 text-center border border-[#1B4332]/10 shadow-sm">
            <span className="text-5xl">🌾</span>
            <h3 className="font-display text-2xl font-bold text-[#0B1F17] mt-3">
              No Carbon Tokens Available to Retire
            </h3>
            <p className="text-zinc-600 text-sm max-w-md mx-auto leading-relaxed">
              You must own verified carbon credits in your account before executing a permanent voluntary retirement.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-block btn-pill btn-pill-solid text-xs !py-3 !px-6"
            >
              🛒 Purchase Credits on Marketplace
            </Link>
          </div>
        ) : (
          /* Form & Impact Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form onSubmit={handleSubmitRetirement} className="lg:col-span-7 bg-white rounded-3xl shadow-md p-8 border border-[#1B4332]/10 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                  ⚠️ {error}
                </div>
              )}

              {/* Batch Selector */}
              <div>
                <label className="eyebrow mb-2">Select Carbon Batch in Wallet</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      Token #{b.tokenId} — {b.cropType || 'Agri'} ({b.balance || b.amount} tCO2e available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount to Retire */}
              <div>
                <label className="eyebrow mb-2">Quantity to Burn & Offset (tCO2e)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxAvailable}
                    value={retireAmount}
                    onChange={(e) => setRetireAmount(e.target.value)}
                    placeholder={`Max: ${maxAvailable}`}
                    className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setRetireAmount(maxAvailable.toString())}
                    className="absolute right-3 top-2.5 px-3 py-1 bg-[#1B4332]/10 text-[#1B4332] text-[10px] font-bold rounded-lg hover:bg-[#1B4332]/20"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                  Available in selected batch: <strong>{maxAvailable} tCO2e</strong>
                </p>
              </div>

              {/* Beneficiary */}
              <div>
                <label className="eyebrow mb-2">Offset Beneficiary / Entity Name</label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="e.g. Acme Industries Ltd."
                  required
                  className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                />
              </div>

              {/* Retirement Reason */}
              <div>
                <label className="eyebrow mb-2">Retirement Reason</label>
                <select
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                >
                  <option value="VOLUNTARY_OFFSET">Voluntary Corporate Net-Zero Target</option>
                  <option value="REGULATORY_COMPLIANCE">National Regulatory ESG Compliance</option>
                  <option value="PRODUCT_OFFSET">Product Lifecycle Carbon Neutrality</option>
                  <option value="EVENT_OFFSET">Green Event Neutralization</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="eyebrow mb-2">Public Note (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope 1 & 2 annual manufacturing offset commitment..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || amountToRetire <= 0}
                className="btn-pill bg-[#606C38] hover:bg-[#606C38]/90 text-white w-full !py-4 font-bold text-xs shadow-lg disabled:opacity-50"
              >
                {submitting ? '⏳ Processing On-Chain Burn...' : `🔥 Confirm & Burn ${amountToRetire || 0} tCO2e`}
              </button>
            </form>

            {/* Impact Preview Sidebar */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#0B1F17] text-white rounded-3xl p-8 shadow-xl border border-white/10 text-center">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#DDA15E]">
                  Permanent Impact
                </span>
                <h3 className="font-display text-2xl font-bold text-white mt-1">
                  Neutralization Value
                </h3>

                <div className="my-6">
                  <p className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                    {amountToRetire} <span className="text-xl font-sans text-emerald-400">tCO2e</span>
                  </p>
                  <p className="text-xs text-white/60 mt-1">Permanent cryptographic removal</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10 text-xs text-left">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <p className="text-white/60">Equivalency In Trees</p>
                    <p className="font-display text-lg font-bold text-white mt-0.5">
                      ~{treesEquivalent} trees planted
                    </p>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <p className="text-white/60">Driving Emissions Offset</p>
                    <p className="font-display text-lg font-bold text-white mt-0.5">
                      ~{kmEquivalent} km vehicle travel
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-white/40 mt-6 leading-relaxed">
                  ⚠️ Permanent action: Once retired, credits are permanently removed from active circulation to prevent double-counting.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RetirePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332]"></div>
        </div>
      }
    >
      <RetirePageContent />
    </Suspense>
  );
}
