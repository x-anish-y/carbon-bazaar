'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyLandPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');

  const [user, setUser] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState(null);

  const [formData, setFormData] = useState({
    landRegistryNumber: '',
    areaLocation: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch user and listing data on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user profile
        const userResponse = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        const userData = await userResponse.json();
        const userInfo = userData.data;
        setUser(userInfo);

        // Check if role is FARMER
        if (userInfo.role !== 'FARMER') {
          router.push('/');
          return;
        }

        // Fetch listing if listingId provided
        if (listingId) {
          const listingResponse = await fetch(`/api/listings?id=${listingId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (listingResponse.ok) {
            const listingData = await listingResponse.json();
            // Handle different response structures
            const listings = Array.isArray(listingData.data) ? listingData.data : [listingData.data];
            const foundListing = listings.find(l => l._id === listingId);
            if (foundListing) {
              setListing(foundListing);
            }
          }
        }

        // Fetch existing land verification for this listing (if any)
        if (listingId) {
          const verRes = await fetch(`/api/land-verifications?listingId=${listingId}&page=1&limit=10`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (verRes.ok) {
            const verData = await verRes.json();
            const verifications = verData?.data?.verifications || [];
            if (verifications.length > 0) {
              const latest = verifications
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              setVerification(latest);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, listingId]);

  const validateForm = () => {
    const errors = {};

    // Validate land registry number
    if (!formData.landRegistryNumber.trim()) {
      errors.landRegistryNumber = 'Land registry number is required';
    }

    // Validate area location
    if (!formData.areaLocation.trim()) {
      errors.areaLocation = 'Area location is required';
    } else if (formData.areaLocation.trim().length < 5) {
      errors.areaLocation = 'Area location must be at least 5 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    if (!listingId) {
      setError('Listing ID is missing');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await fetch('/api/land-verifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          farmerDeclaredData: {
            landRegistryNumber: formData.landRegistryNumber.trim(),
            areaLocation: formData.areaLocation.trim(),
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create verification');
        return;
      }

      setVerification(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status) => {
    if (status === 'APPROVED') {
      return {
        pageBg: 'from-green-50 to-emerald-50',
        circleBg: 'from-green-400 to-emerald-500',
        title: 'Land Verification Approved',
        subtitle: 'Verification Successful',
        badgeText: '✅ Approved',
        badgeClass: 'text-green-700',
        message:
          'Your land verification has been approved. Your listing will be shown as verified to buyers.',
      };
    }

    if (status === 'REJECTED') {
      return {
        pageBg: 'from-red-50 to-rose-50',
        circleBg: 'from-red-400 to-rose-500',
        title: 'Land Verification Rejected',
        subtitle: 'Verification Failed',
        badgeText: '❌ Rejected',
        badgeClass: 'text-red-700',
        message:
          'Your land verification was rejected by the admin. Please review the reason and re-submit if needed.',
      };
    }

    return {
      pageBg: 'from-yellow-50 to-amber-50',
      circleBg: 'from-yellow-300 to-amber-400',
      title: 'Land Verification Submitted',
      subtitle: 'Verification Pending',
      badgeText: '⏳ Pending',
      badgeClass: 'text-amber-700',
      message:
        'Your land verification has been submitted successfully. Our team will review your declaration and compare it with satellite imagery.',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show status state when verification exists
  if (verification) {
    const cfg = getStatusConfig(verification.status);

    return (
      <div className={`min-h-screen bg-linear-to-br ${cfg.pageBg}`}>
        {/* Header */}
        <nav className="bg-white border-b border-zinc-200 sticky top-0 z-40">
          <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
            <Link href="/farmer/dashboard" className="inline-flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">🌾</span>
              <span className="text-xl font-bold text-zinc-900">Carbon Bazaar</span>
            </Link>
            <Link href="/farmer/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
              ← Back to Dashboard
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <div className="mx-auto max-w-2xl px-6 py-12">
          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-lg p-10 border border-zinc-200 text-center">
            {/* Yellow Circle with Status */}
            <div className="mb-6 flex justify-center">
              <div className="relative w-32 h-32">
                {/* Outer circle */}
                <div className={`absolute inset-0 bg-linear-to-br ${cfg.circleBg} rounded-full flex items-center justify-center shadow-lg`}>
                  {/* Inner text */}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-900">
                      {verification.status === 'PENDING' ? 'In Waiting' : verification.status}
                    </p>
                    <p className="text-xs text-zinc-700 mt-1">{cfg.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            <h2 className="text-2xl font-bold text-zinc-900 mb-3">{cfg.title}</h2>
            <p className="text-zinc-600 mb-8">{cfg.message}</p>

            {/* Verification Details */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-zinc-900 mb-4">📋 Submitted Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">Verification ID</label>
                  <p className="text-zinc-900 mt-1 break-all">{verification._id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">Land Registry Number</label>
                  <p className="text-zinc-900 mt-1">{verification?.farmerDeclaredData?.landRegistryNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">Area Location</label>
                  <p className="text-zinc-900 mt-1">{verification?.farmerDeclaredData?.areaLocation || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase">Status</label>
                  <p className={`${cfg.badgeClass} font-semibold mt-1`}>{cfg.badgeText}</p>
                </div>

                {verification.status === 'REJECTED' && (
                  <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase">Rejection Reason</label>
                    <p className="text-red-700 font-semibold mt-1">{verification.rejectionReason || 'Rejected'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">ℹ️ What happens next?</span>
                <br/>
                {verification.status === 'PENDING'
                  ? 'Admin will review your submission. You can come back anytime to check this status.'
                  : verification.status === 'APPROVED'
                    ? 'Your listing will now show as verified on the marketplace.'
                    : 'You can correct details and submit again if needed.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/farmer/dashboard')}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/listings')}
                className="flex-1 px-6 py-3 bg-zinc-200 text-zinc-900 font-semibold rounded-lg hover:bg-zinc-300 transition"
              >
                Browse Marketplace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/farmer/dashboard" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">🌾</span>
            <span className="text-xl font-bold text-zinc-900">Carbon Bazaar</span>
          </Link>
          <Link href="/farmer/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-zinc-900 mb-2">
            🏞️ Verify Your Land
          </h1>
          <p className="text-zinc-600">
            Provide details about your land for verification
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-10 border border-zinc-200">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-sm text-red-700 font-medium">❌ {error}</p>
            </div>
          )}

          {/* Listing Info (if available) */}
          {listing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-900">
                <span className="font-semibold">📌 Listing:</span> {listing.cropType} - {listing.creditsAmount} tCO₂e @ ₹{listing.pricePerCredit}/credit
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Land Registry Number */}
            <div>
              <label htmlFor="landRegistryNumber" className="block text-sm font-semibold text-zinc-900 mb-2">
                Land Registry Number <span className="text-red-500">*</span>
              </label>
              <input
                id="landRegistryNumber"
                name="landRegistryNumber"
                type="text"
                placeholder="e.g., MH-2024-001234"
                value={formData.landRegistryNumber}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                  formErrors.landRegistryNumber
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-zinc-200 focus:border-green-500 focus:ring-green-100'
                }`}
              />
              {formErrors.landRegistryNumber && (
                <p className="text-sm text-red-600 mt-1">❌ {formErrors.landRegistryNumber}</p>
              )}
            </div>

            {/* Area Location */}
            <div>
              <label htmlFor="areaLocation" className="block text-sm font-semibold text-zinc-900 mb-2">
                Area Location <span className="text-red-500">*</span>
              </label>
              <textarea
                id="areaLocation"
                name="areaLocation"
                placeholder="Enter the location of your land (e.g., Village XYZ, Taluka ABC, District DEF, State GHI)"
                value={formData.areaLocation}
                onChange={handleInputChange}
                rows="4"
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition ${
                  formErrors.areaLocation
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-zinc-200 focus:border-green-500 focus:ring-green-100'
                }`}
              />
              {formErrors.areaLocation && (
                <p className="text-sm text-red-600 mt-1">❌ {formErrors.areaLocation}</p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">ℹ️ About Land Verification</span>
                <br/>
                Your land information will be verified against official records and satellite imagery. This helps ensure the authenticity of your carbon credits listing.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </span>
              ) : (
                '✓ Submit Verification'
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-zinc-600 mt-6">
          Need help? Contact us at <span className="font-semibold">support@carbonbazaar.com</span>
        </p>
      </div>
    </div>
  );
}
