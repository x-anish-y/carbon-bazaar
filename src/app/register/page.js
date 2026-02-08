'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StateDropdown from '@/components/StateDropdown';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    state: '',
    role: 'FARMER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleStateChange = (state) => {
    setFormData((prev) => ({
      ...prev,
      state,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate state is selected
    if (!formData.state) {
      setError('Please select a state');
      setLoading(false);
      return;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[0-9\s+]{10,}$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          state: formData.state,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        setLoading(false);
        return;
      }

      // Store token if provided
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
      }

      setSuccess('Registration successful! Redirecting to document upload...');
      setTimeout(() => {
        // Redirect to document upload page
        router.push('/verification/upload');
      }, 1500);
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl font-bold text-green-600">🌾</span>
            <span className="text-2xl font-bold text-zinc-900">Carbon Bazaar</span>
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Create Account</h1>
          <p className="text-zinc-600">Join India's carbon marketplace</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-zinc-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <label className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.role === 'FARMER'
                  ? 'border-green-600 bg-green-50'
                  : 'border-zinc-300 bg-white hover:border-zinc-400'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="FARMER"
                  checked={formData.role === 'FARMER'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="text-2xl mb-1">🌱</div>
                  <div className="text-sm font-medium text-zinc-900">Farmer</div>
                </div>
              </label>
              <label className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.role === 'COMPANY'
                  ? 'border-green-600 bg-green-50'
                  : 'border-zinc-300 bg-white hover:border-zinc-400'
              }`}>
                <input
                  type="radio"
                  name="role"
                  value="COMPANY"
                  checked={formData.role === 'COMPANY'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="text-2xl mb-1">🏢</div>
                  <div className="text-sm font-medium text-zinc-900">Company</div>
                </div>
              </label>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-900 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-900 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* State Field */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-zinc-900 mb-2">
                State / Union Territory
              </label>
              <StateDropdown 
                value={formData.state}
                onChange={handleStateChange}
                className="text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-900 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter a strong password"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-900 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors mt-8"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-200"></div>
            <span className="text-sm text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-200"></div>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-zinc-600">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 font-medium hover:text-green-700">
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
