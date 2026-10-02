'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError('');

        const userResponse = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userResponse.ok) {
          router.push('/login');
          return;
        }

        const userJson = await userResponse.json();
        if (userJson?.data?.role !== 'ADMIN') {
          router.push('/');
          return;
        }
      } catch (e) {
        setError(e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Loading system settings...</p>
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
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B1F17] flex items-center justify-center text-white">
                <span className="text-sm">🛡️</span>
              </div>
              <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
            </Link>
            <span className="text-xs bg-[#1B4332]/10 text-[#1B4332] font-bold px-2.5 py-0.5 rounded-full border border-[#1B4332]/20">
              System Settings
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="btn-pill btn-pill-ghost text-xs !py-2 !px-4">
              ← Admin Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
            Platform Configuration & Blockchain Controls
          </h1>
          <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
            Manage Polygon PoS smart contract registry address, custodial wallet gas station, and verification rules.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Smart Contract Info */}
          <div className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm space-y-4">
            <h3 className="font-display text-xl font-bold text-[#0B1F17] flex items-center gap-2">
              <span>⛓️</span> Polygon Smart Contracts
            </h3>
            <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#1B4332]/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Contract Standard:</span>
                <span className="font-bold text-[#1B4332]">ERC-1155 Multi-Token</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Network:</span>
                <span className="font-semibold text-zinc-900">Polygon PoS (Local/Amoy/Mainnet)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Custodial Key Mode:</span>
                <span className="font-semibold text-zinc-900">AES-256 Encrypted</span>
              </div>
            </div>
          </div>

          {/* Verification Mode */}
          <div className="bg-white rounded-3xl p-8 border border-[#1B4332]/10 shadow-sm space-y-4">
            <h3 className="font-display text-xl font-bold text-[#0B1F17] flex items-center gap-2">
              <span>📋</span> Verification Policy
            </h3>
            <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#1B4332]/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Land Review Engine:</span>
                <span className="font-bold text-[#1B4332]">Manual Administrative Review</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Auto-Mint On Approval:</span>
                <span className="font-semibold text-emerald-700">Enabled (Polygon PoS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">KYC Requirement:</span>
                <span className="font-semibold text-zinc-900">Mandatory (Aadhaar / Land Deed)</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
