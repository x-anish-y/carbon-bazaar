'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandVerificationDetailsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/seller/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
        <p className="text-sm font-semibold text-[#0B1F17]">Redirecting to seller dashboard...</p>
      </div>
    </div>
  );
}
