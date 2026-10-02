'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    const fetchReports = async () => {
      try {
        const response = await fetch('/api/admin/reports', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch reports');
        }

        const data = await response.json();
        setReports(data.data);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [router]);

  const downloadReport = (format) => {
    if (!reports) return;

    let content = '';
    let filename = `carbon-bazaar-report-${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      content = JSON.stringify(reports, null, 2);
      filename += '.json';
    } else if (format === 'csv') {
      content = 'Platform Report\n';
      content += `Generated: ${new Date(reports.generatedAt).toLocaleString()}\n\n`;
      content += `Total Users,${reports.summary?.totalUsers || 0}\n`;
      content += `Sellers,${reports.summary?.farmerCount || 0}\n`;
      content += `Buyers,${reports.summary?.buyerCount || reports.summary?.companyCount || 0}\n`;
      content += `Total Listings,${reports.summary?.totalListings || 0}\n`;
      filename += '.csv';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B4332]/20 border-t-[#1B4332] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#0B1F17]">Aggregating registry reports...</p>
        </div>
      </div>
    );
  }

  const s = reports?.summary || {};

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
              Platform Reports & Audits
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1F17] tracking-tight">
              Platform Registry Analytics & Audits
            </h1>
            <p className="text-zinc-600 text-xs mt-1 max-w-xl leading-relaxed">
              Export comprehensive ESG trading volume, user breakdown, and verification rates.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => downloadReport('json')}
              className="btn-pill bg-white hover:bg-zinc-50 border border-[#1B4332]/20 text-[#0B1F17] text-xs !py-2.5 !px-5 font-bold"
            >
              📥 Export JSON
            </button>
            <button
              onClick={() => downloadReport('csv')}
              className="btn-pill btn-pill-solid text-xs !py-2.5 !px-5 font-bold"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm">
            <p className="eyebrow mb-1">Total Users</p>
            <p className="font-display text-3xl font-extrabold text-[#0B1F17] mt-1">{s.totalUsers || 0}</p>
            <p className="text-xs text-zinc-500 mt-2">
              {s.farmerCount || 0} Sellers • {s.companyCount || s.buyerCount || 0} Buyers
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm">
            <p className="eyebrow mb-1">Total Listings</p>
            <p className="font-display text-3xl font-extrabold text-[#1B4332] mt-1">{s.totalListings || 0}</p>
            <p className="text-xs text-zinc-500 mt-2">
              Active carbon batches on marketplace
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm">
            <p className="eyebrow mb-1">Verified Users</p>
            <p className="font-display text-3xl font-extrabold text-[#606C38] mt-1">{s.verifiedUsers || 0}</p>
            <p className="text-xs text-zinc-500 mt-2">
              {s.verificationPercentage || 0}% verification rate
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#1B4332]/10 shadow-sm">
            <p className="eyebrow mb-1">Trading Volume</p>
            <p className="font-display text-3xl font-extrabold text-[#0B1F17] mt-1">
              ₹{(s.totalTradeVolume || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Gross settled transactions
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
