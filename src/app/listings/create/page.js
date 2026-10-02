'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function CreateListingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [availableInWallet, setAvailableInWallet] = useState(1000);
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    creditType: 'PREMIUM',
    creditsAmount: '150',
    pricePerCredit: '1000',
    description: 'High-permanence environmental project with verifiable carbon sequestration, rigorous baseline MRV, and positive ecological co-benefits.',
  });

  const [formErrors, setFormErrors] = useState({});

  const creditTypes = [
    {
      value: 'PREMIUM',
      label: 'Premium-Quality Credits',
      shortLabel: 'Premium Quality',
      icon: '⭐',
      desc: 'High-permanence & co-benefits',
    },
    {
      value: 'MEDIUM',
      label: 'Medium-Quality Credits',
      shortLabel: 'Medium Quality',
      icon: '🌿',
      desc: 'Verified standard additionality',
    },
    {
      value: 'BASELINE',
      label: 'Baseline Credits',
      shortLabel: 'Baseline Credits',
      icon: '🛡️',
      desc: 'Standard baseline compliance',
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUserAndBalance = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.data;
          setUser(userData);

          if (!userData.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          if (userData.role !== 'SELLER' && userData.role !== 'FARMER') {
            router.push('/');
            return;
          }

          // Fetch available in-hand balance
          const balRes = await fetch('/api/blockchain/balance', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (balRes.ok) {
            const balData = await balRes.json();
            const total = balData?.data?.totalCreditsOwned ?? 1000;
            setAvailableInWallet(total);
            if (total < 150 && total > 0) {
              setFormData(prev => ({ ...prev, creditsAmount: String(total) }));
            }
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user and balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBalance();
  }, [router]);

  const validateForm = () => {
    const errors = {};

    if (!formData.month) {
      errors.month = 'Please select a vintage month';
    } else {
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(formData.month)) {
        errors.month = 'Please use YYYY-MM format';
      }
    }

    if (!formData.creditType) {
      errors.creditType = 'Please select a credit quality tier';
    }

    if (!formData.creditsAmount) {
      errors.creditsAmount = 'Number of carbon credits is required';
    } else if (isNaN(parseFloat(formData.creditsAmount)) || parseFloat(formData.creditsAmount) <= 0) {
      errors.creditsAmount = 'Credits must be a positive number';
    } else if (parseFloat(formData.creditsAmount) > availableInWallet) {
      errors.creditsAmount = `You cannot list more than your available in-wallet balance of ${availableInWallet.toLocaleString()} tCO2e`;
    }

    if (!formData.pricePerCredit) {
      errors.pricePerCredit = 'Price per credit is required';
    } else if (isNaN(parseFloat(formData.pricePerCredit)) || parseFloat(formData.pricePerCredit) <= 0) {
      errors.pricePerCredit = 'Price must be a positive number';
    }

    if (!formData.description || formData.description.trim().length === 0) {
      errors.description = 'Project methodology description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: formData.month,
          creditType: formData.creditType,
          creditsAmount: parseFloat(formData.creditsAmount),
          pricePerCredit: parseFloat(formData.pricePerCredit),
          description: formData.description.trim(),
          projectMethodologyDescription: formData.description.trim(),
          state: user?.state || 'MH',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create listing');
        return;
      }

      setSuccess('Carbon credits minted & listed successfully on marketplace! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/seller/dashboard');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading listing generator...</p>
        </div>
      </div>
    );
  }

  const credits = parseFloat(formData.creditsAmount) || 0;
  const price = parseFloat(formData.pricePerCredit) || 0;
  const treesEquivalent = (credits * 45).toFixed(0);
  const kmEquivalent = (credits * 4200).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const totalValue = credits * price;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#0B1F17]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F2]/90 backdrop-blur-md border-b border-[#1B4332]/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/seller/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] flex items-center justify-center">
              <span className="text-sm text-white">🌿</span>
            </div>
            <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
          </Link>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/marketplace" className="text-zinc-600 hover:text-[#0B1F17] transition-colors">
              Marketplace
            </Link>
            <Link href="/portfolio" className="text-zinc-600 hover:text-[#0B1F17] transition-colors">
              Portfolio
            </Link>
            <span className="hidden sm:inline-block px-3 py-1 bg-[#1B4332]/10 rounded-full text-[#1B4332] font-mono">
              👤 {user?.email}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container matching Stitch Screen */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-[#1B4332]/10"
        >
          {/* Header Title */}
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B1F17] tracking-tight">
              List Carbon Credits
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              Sell your verified carbon credits on the national marketplace
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl mb-8 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-[#1B4332]/10 border border-[#1B4332]/20 text-[#1B4332] rounded-2xl mb-8 text-xs font-bold">
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form Fields (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* In-Wallet Available Balance Banner */}
                <div className="bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1B4332]/10 flex items-center justify-center text-lg">
                      🌱
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Available In-Wallet Credits</p>
                      <p className="font-display text-lg font-extrabold text-[#1B4332]">
                        {availableInWallet.toLocaleString()} <span className="text-xs font-sans font-normal text-zinc-600">tCO₂e</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <span className="text-[10px] text-zinc-500 font-semibold mr-1">Quick Select:</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, creditsAmount: String(Math.max(1, Math.round(availableInWallet * 0.25))) }))}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, creditsAmount: String(Math.max(1, Math.round(availableInWallet * 0.5))) }))}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, creditsAmount: String(availableInWallet) }))}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#1B4332] text-white hover:bg-[#1B4332]/90 shadow-2xs"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Vintage Month Field */}
                <div>
                  <label className="eyebrow mb-2">
                    Vintage Month <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                  />
                  {formErrors.month && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.month}</p>
                  )}
                </div>

                {/* Credit Type Selector (3 Quality Tiers) */}
                <div>
                  <label className="eyebrow mb-2">
                    Credit Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {creditTypes.map((tier) => {
                      const isSelected = formData.creditType === tier.value;
                      return (
                        <button
                          key={tier.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, creditType: tier.value })}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md ring-2 ring-[#1B4332]/20'
                              : 'bg-[#FAF8F2] text-[#0B1F17] border-[#1B4332]/15 hover:border-[#1B4332]/40'
                          }`}
                        >
                          <div>
                            <span className="text-xl">{tier.icon}</span>
                            <p className="text-xs font-bold mt-2">{tier.shortLabel}</p>
                          </div>
                          <p className={`text-[10px] mt-1.5 leading-tight ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                            {tier.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.creditType && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.creditType}</p>
                  )}
                </div>

                {/* Number of Carbon Credits Field */}
                <div>
                  <label className="eyebrow mb-2">
                    Number of Carbon Credits (tCO2e) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="creditsAmount"
                      value={formData.creditsAmount}
                      onChange={handleChange}
                      placeholder="e.g. 150"
                      step="0.01"
                      min="0.01"
                      className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none pr-20"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-[#1B4332]">
                      tCO2e
                    </span>
                  </div>
                  {formErrors.creditsAmount && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.creditsAmount}</p>
                  )}
                </div>

                {/* Price Per Credit Field */}
                <div>
                  <label className="eyebrow mb-2">
                    Price Per Credit (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-bold text-zinc-600">
                      ₹
                    </span>
                    <input
                      type="number"
                      name="pricePerCredit"
                      value={formData.pricePerCredit}
                      onChange={handleChange}
                      placeholder="1000"
                      step="1"
                      min="1"
                      className="w-full pl-8 pr-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                    />
                  </div>
                  {formErrors.pricePerCredit && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.pricePerCredit}</p>
                  )}
                </div>

                {/* Project Methodology Description Field */}
                <div>
                  <label className="eyebrow mb-2">
                    Project Methodology Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your project activities, sequestration methodology, emission reduction baseline, and verification proof..."
                    className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none resize-none"
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.description}</p>
                  )}
                </div>
              </div>

              {/* Right Column: Impact Preview Panel (Stitch Design - 5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#0B1F17] text-white rounded-3xl p-6 shadow-xl border border-white/10">
                  <div className="text-center pb-4 border-b border-white/10">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#DDA15E]">
                      Impact Preview
                    </span>
                    <h3 className="font-display text-xl font-bold text-white mt-1">
                      Estimated Listing Impact
                    </h3>
                  </div>

                  <div className="text-center py-6">
                    <p className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                      {credits} <span className="text-2xl text-emerald-400">🍃</span>
                    </p>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mt-1">
                      tCO2e Carbon Sequestered
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/10 text-xs">
                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                      <p className="text-white/60">Equivalent Trees Seeded</p>
                      <p className="font-display text-xl font-bold text-white mt-1">
                        ~{treesEquivalent} trees planted
                      </p>
                    </div>

                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                      <p className="text-white/60">Driving Emissions Offset</p>
                      <p className="font-display text-xl font-bold text-white mt-1">
                        ~{kmEquivalent} km travel
                      </p>
                    </div>

                    <div className="bg-[#1B4332]/40 p-4 rounded-2xl border border-[#DDA15E]/30 text-center">
                      <p className="text-[#DDA15E] text-[11px] font-bold uppercase tracking-wider">
                        Estimated Revenue
                      </p>
                      <p className="font-display text-2xl font-black text-white mt-1">
                        ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 text-[11px] text-white/50 leading-relaxed text-center">
                    📋 Once listed, your verified carbon credit batch is immediately active on the Carbon Bazaar marketplace for buyer discovery and trade.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Action Button (Stitch Layout) */}
            <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-pill btn-pill-solid w-full !py-4 font-extrabold text-sm shadow-xl"
              >
                {submitting ? '⏳ Generating On-Chain Listing...' : 'Confirm & List Credits'}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
