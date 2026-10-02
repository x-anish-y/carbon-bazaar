'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BuyerListingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Buyers are buyers only and do not create listings. Redirect to marketplace.
    router.replace('/marketplace');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-[#1B4332]/10">
        <span className="text-4xl">🏢</span>
        <h2 className="font-display text-xl font-bold text-[#0B1F17] mt-3 mb-2">Buyer Portal</h2>
        <p className="text-zinc-600 text-xs mb-6">
          Buyer accounts purchase credits. Listing creation is exclusively reserved for verified agricultural Sellers.
        </p>
        <div className="space-y-3">
          <Link
            href="/marketplace"
            className="btn-pill btn-pill-solid w-full block text-xs !py-3 font-bold"
          >
            🛒 Browse Carbon Marketplace
          </Link>
          <Link
            href="/buyer/dashboard"
            className="btn-pill btn-pill-ghost w-full block text-xs !py-2.5"
          >
            ← Back to Buyer Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
