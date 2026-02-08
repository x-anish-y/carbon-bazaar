'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportFormat, setExportFormat] = useState('json');

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
      content = generateCSV();
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

  const generateCSV = () => {
    let csv = 'Platform Report\n';
    csv += `Generated: ${new Date(reports.generatedAt).toLocaleString()}\n\n`;

    // Summary Section
    csv += 'USER STATISTICS\n';
    csv += `Total Users,${reports.summary.totalUsers}\n`;
    csv += `Farmers,${reports.summary.farmerCount}\n`;
    csv += `Buyers,${reports.summary.buyerCount}\n`;
    csv += `Companies,${reports.summary.companyCount}\n`;
    csv += `Verified Users,${reports.summary.verifiedUsers}\n`;
    csv += `Verification Rate,${reports.summary.verificationPercentage}%\n\n`;

    // Listings Section
    csv += 'LISTINGS STATISTICS\n';
    csv += `Total Listings,${reports.listings.totalListings}\n`;
    csv += `Active Listings,${reports.listings.activeListings}\n`;
    csv += `Sold Listings,${reports.listings.soldListings}\n`;
    csv += `Flagged Listings,${reports.listings.flaggedListings}\n\n`;

    // Documents Section
    csv += 'VERIFICATION DOCUMENTS\n';
    csv += `Total Documents,${reports.documents.totalDocuments}\n`;
    csv += `Pending,${reports.documents.pendingDocuments}\n`;
    csv += `Approved,${reports.documents.approvedDocuments}\n`;
    csv += `Rejected,${reports.documents.rejectedDocuments}\n\n`;

    // Credits Section
    csv += 'CARBON CREDITS\n';
    csv += `Total Credits,${reports.credits.totalCredits.toFixed(2)}\n`;
    csv += `Available Credits,${reports.credits.availableCredits.toFixed(2)}\n`;
    csv += `Sold Credits,${reports.credits.soldCredits.toFixed(2)}\n\n`;

    // Listings by Crop
    csv += 'LISTINGS BY CROP TYPE\n';
    csv += 'Crop Type,Count,Total Credits,Average Price\n';
    reports.listingsByCrop.forEach((item) => {
      csv += `${item._id || 'N/A'},${item.count},${item.totalCredits.toFixed(2)},${item.averagePrice.toFixed(2)}\n`;
    });

    return csv;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Generating reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 text-sm mb-2 font-medium"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Platform Reports</h1>
              <p className="text-gray-600 mt-1">
                Generated: {reports ? new Date(reports.generatedAt).toLocaleString() : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadReport('json')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                📥 JSON Export
              </button>
              <button
                onClick={() => downloadReport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                📥 CSV Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {reports && (
          <div className="space-y-8">
            {/* User Statistics */}
            <div className="bg-white rounded border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">👥 User Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">{reports.summary.totalUsers}</p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Farmers</p>
                  <p className="text-2xl font-bold text-green-600">{reports.summary.farmerCount}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Buyers</p>
                  <p className="text-2xl font-bold text-purple-600">{reports.summary.buyerCount}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Companies</p>
                  <p className="text-2xl font-bold text-orange-600">{reports.summary.companyCount}</p>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Verified</p>
                  <p className="text-2xl font-bold text-red-600">{reports.summary.verifiedUsers}</p>
                  <p className="text-xs text-gray-500 mt-1">{reports.summary.verificationPercentage}%</p>
                </div>
              </div>
            </div>

            {/* Listings Statistics */}
            <div className="bg-white rounded border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Listings Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Total Listings</p>
                  <p className="text-2xl font-bold text-blue-600">{reports.listings.totalListings}</p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-600">{reports.listings.activeListings}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Sold Out</p>
                  <p className="text-2xl font-bold text-yellow-600">{reports.listings.soldListings}</p>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Flagged</p>
                  <p className="text-2xl font-bold text-red-600">{reports.listings.flaggedListings}</p>
                </div>
              </div>
            </div>

            {/* Documents Statistics */}
            <div className="bg-white rounded border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📄 Verification Documents</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{reports.documents.totalDocuments}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{reports.documents.pendingDocuments}</p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{reports.documents.approvedDocuments}</p>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{reports.documents.rejectedDocuments}</p>
                </div>
              </div>

              {/* Document Types */}
              {reports.documents.documentsByType.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">By Document Type</h3>
                  <div className="space-y-2">
                    {reports.documents.documentsByType.map((docType) => (
                      <div key={docType._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{docType._id || 'Unknown'}</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                          {docType.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Carbon Credits */}
            <div className="bg-white rounded border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🌍 Carbon Credits Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Total Credits (tCO₂e)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reports.credits.totalCredits.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Available Credits</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reports.credits.availableCredits.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <p className="text-xs text-gray-600 font-medium">Sold Credits</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {reports.credits.soldCredits.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Listings by Crop Type */}
            {reports.listingsByCrop.length > 0 && (
              <div className="bg-white rounded border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🌾 Listings by Crop Type</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Crop Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Listings</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Total Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.listingsByCrop.map((crop) => (
                        <tr key={crop._id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {crop._id || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                              {crop.count}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {crop.totalCredits.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            {' tCO₂e'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            ₹{crop.averagePrice.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
