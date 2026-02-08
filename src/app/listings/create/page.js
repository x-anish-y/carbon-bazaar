'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CreateListingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    month: '',
    cropType: 'RICE',
    landSize: '',
    creditsEarned: '',
    pricePerCredit: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const cropTypes = [
    { value: 'RICE', label: '🍚 Rice' },
    { value: 'WHEAT', label: '🌾 Wheat' },
    { value: 'SUGARCANE', label: '🎋 Sugarcane' },
    { value: 'PULSES', label: '🫘 Pulses' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user data
    const fetchUser = async () => {
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

          // Check if email is verified
          if (!userData.isEmailVerified) {
            router.push('/verification-pending');
            return;
          }

          // Check if role is FARMER
          if (userData.role !== 'FARMER') {
            router.push('/');
            return;
          }
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const validateForm = () => {
    const errors = {};

    // Validate month
    if (!formData.month) {
      errors.month = 'Please select a month';
    } else {
      // Validate format YYYY-MM
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(formData.month)) {
        errors.month = 'Please use YYYY-MM format';
      }
    }

    // Validate crop type
    if (!formData.cropType) {
      errors.cropType = 'Please select a crop type';
    }

    // Validate land size
    if (!formData.landSize) {
      errors.landSize = 'Land size is required';
    } else if (isNaN(parseFloat(formData.landSize)) || parseFloat(formData.landSize) <= 0) {
      errors.landSize = 'Land size must be a positive number';
    }

    // Validate credits earned
    if (!formData.creditsEarned) {
      errors.creditsEarned = 'Credits earned is required';
    } else if (isNaN(parseFloat(formData.creditsEarned)) || parseFloat(formData.creditsEarned) <= 0) {
      errors.creditsEarned = 'Credits must be a positive number';
    }

    // Validate price per credit
    if (!formData.pricePerCredit) {
      errors.pricePerCredit = 'Price per credit is required';
    } else if (isNaN(parseFloat(formData.pricePerCredit)) || parseFloat(formData.pricePerCredit) <= 0) {
      errors.pricePerCredit = 'Price must be a positive number';
    }

    // Validate description
    if (!formData.description || formData.description.trim().length === 0) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
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
    // Clear error for this field when user starts typing
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

    // Validate form
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
          cropType: formData.cropType,
          areaInHectares: parseFloat(formData.landSize),
          creditsAmount: parseFloat(formData.creditsEarned),
          pricePerCredit: parseFloat(formData.pricePerCredit),
          description: formData.description.trim(),
          state: user?.state || 'MH',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create listing');
        return;
      }

      setSuccess('Carbon credits listing created successfully! Redirecting...');
      const createdListingId = data.data._id;
      setTimeout(() => {
        router.push(`/verify-land?listingId=${createdListingId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
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
            📝 List Carbon Credits
          </h1>
          <p className="text-zinc-600">
            Create a new listing to sell your carbon credits on the marketplace
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

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <p className="text-sm text-green-700 font-medium">✅ {success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Month Field */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-zinc-900 mb-2">
                Month <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                id="month"
                name="month"
                value={formData.month}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                  formErrors.month ? 'border-red-300' : 'border-zinc-300'
                }`}
              />
              {formErrors.month && (
                <p className="text-sm text-red-600 mt-1">{formErrors.month}</p>
              )}
              <p className="text-xs text-zinc-500 mt-1">Select the month your credits were earned</p>
            </div>

            {/* Crop Type Field */}
            <div>
              <label htmlFor="cropType" className="block text-sm font-medium text-zinc-900 mb-2">
                Crop Type <span className="text-red-500">*</span>
              </label>
              <select
                id="cropType"
                name="cropType"
                value={formData.cropType}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                  formErrors.cropType ? 'border-red-300' : 'border-zinc-300'
                }`}
              >
                {cropTypes.map((crop) => (
                  <option key={crop.value} value={crop.value}>
                    {crop.label}
                  </option>
                ))}
              </select>
              {formErrors.cropType && (
                <p className="text-sm text-red-600 mt-1">{formErrors.cropType}</p>
              )}
            </div>

            {/* Land Size Field */}
            <div>
              <label htmlFor="landSize" className="block text-sm font-medium text-zinc-900 mb-2">
                Land Size <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  id="landSize"
                  name="landSize"
                  value={formData.landSize}
                  onChange={handleChange}
                  placeholder="Enter land size"
                  step="0.01"
                  min="0"
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    formErrors.landSize ? 'border-red-300' : 'border-zinc-300'
                  }`}
                />
                <div className="px-4 py-2 bg-zinc-100 rounded-lg text-zinc-700 font-medium whitespace-nowrap">
                  acres
                </div>
              </div>
              {formErrors.landSize && (
                <p className="text-sm text-red-600 mt-1">{formErrors.landSize}</p>
              )}
            </div>

            {/* Credits Earned Field */}
            <div>
              <label htmlFor="creditsEarned" className="block text-sm font-medium text-zinc-900 mb-2">
                Credits Earned <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  id="creditsEarned"
                  name="creditsEarned"
                  value={formData.creditsEarned}
                  onChange={handleChange}
                  placeholder="Enter credits earned"
                  step="0.01"
                  min="0"
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    formErrors.creditsEarned ? 'border-red-300' : 'border-zinc-300'
                  }`}
                />
                <div className="px-4 py-2 bg-zinc-100 rounded-lg text-zinc-700 font-medium whitespace-nowrap">
                  tCO₂e
                </div>
              </div>
              {formErrors.creditsEarned && (
                <p className="text-sm text-red-600 mt-1">{formErrors.creditsEarned}</p>
              )}
            </div>

            {/* Price Per Credit Field */}
            <div>
              <label htmlFor="pricePerCredit" className="block text-sm font-medium text-zinc-900 mb-2">
                Price Per Credit <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="px-4 py-2 bg-zinc-100 rounded-lg text-zinc-700 font-medium">
                  ₹
                </div>
                <input
                  type="number"
                  id="pricePerCredit"
                  name="pricePerCredit"
                  value={formData.pricePerCredit}
                  onChange={handleChange}
                  placeholder="Enter price"
                  step="0.01"
                  min="0"
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    formErrors.pricePerCredit ? 'border-red-300' : 'border-zinc-300'
                  }`}
                />
              </div>
              {formErrors.pricePerCredit && (
                <p className="text-sm text-red-600 mt-1">{formErrors.pricePerCredit}</p>
              )}
              {formData.creditsEarned && formData.pricePerCredit && (
                <p className="text-xs text-green-600 mt-2 font-medium">
                  💰 Total Value: ₹{(parseFloat(formData.creditsEarned) * parseFloat(formData.pricePerCredit)).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-900 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your farming practices, crop details, and any certifications..."
                rows={5}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none ${
                  formErrors.description ? 'border-red-300' : 'border-zinc-300'
                }`}
              />
              <div className="flex items-center justify-between mt-2">
                {formErrors.description && (
                  <p className="text-sm text-red-600">{formErrors.description}</p>
                )}
                <p className={`text-xs ml-auto ${
                  formData.description.length > 450 ? 'text-amber-600' : 'text-zinc-500'
                }`}>
                  {formData.description.length}/500
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Tips for a Great Listing</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be honest about your farming practices</li>
                <li>• Mention any certifications or recognitions</li>
                <li>• Describe your sustainable practices</li>
                <li>• Include relevant details about your farm</li>
              </ul>
            </div>

            {/* Summary Box */}
            {formData.creditsEarned && formData.pricePerCredit && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">📊 Listing Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Total Credits</p>
                    <p className="font-bold text-green-900">{formData.creditsEarned} tCO₂e</p>
                  </div>
                  <div>
                    <p className="text-green-700">Price Per Unit</p>
                    <p className="font-bold text-green-900">₹{parseFloat(formData.pricePerCredit).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-green-700">Potential Revenue</p>
                    <p className="font-bold text-lg text-green-900">
                      ₹{(parseFloat(formData.creditsEarned) * parseFloat(formData.pricePerCredit)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-zinc-200">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '⏳ Creating Listing...' : '✅ Create Listing'}
              </button>
              <Link
                href="/farmer/dashboard"
                className="flex-1 px-6 py-3 text-center border border-zinc-300 text-zinc-900 font-medium rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Footer Help */}
        <div className="mt-8 text-center text-sm text-zinc-600">
          <p className="mb-2">Questions about listing? Read our guide or contact support</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-green-600 hover:text-green-700 font-medium">
              📚 Listing Guide
            </a>
            <a href="mailto:support@carbenbazaar.in" className="text-green-600 hover:text-green-700 font-medium">
              💬 Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
