'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate inputs
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token in localStorage
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
      }

      const user = data.data;

      // Admin users bypass email verification
      if (user?.role === 'ADMIN') {
        setSuccess('Login successful! Redirecting to admin dashboard...');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1000);
        return;
      }

      // Check if user is verified (for non-admin users)
      if (!user?.isEmailVerified) {
        setSuccess('Login successful! Redirecting to verification...');
        setTimeout(() => {
          router.push('/verification-pending');
        }, 1000);
        return;
      }

      // Role-based redirects for verified non-admin users
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        if (user?.role === 'FARMER') {
          router.push('/farmer/dashboard');
        } else if (user?.role === 'COMPANY') {
          router.push('/company/dashboard');
        } else {
          router.push('/');
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl font-bold text-green-600">🌾</span>
            <span className="text-2xl font-bold text-zinc-900">Carbon Bazaar</span>
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Welcome Back</h1>
          <p className="text-zinc-600">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-zinc-200">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-zinc-900 placeholder:text-zinc-400"
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
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-200"></div>
            <span className="text-sm text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-200"></div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-zinc-600 mb-3">
            Don't have an account?{' '}
            <Link href="/register" className="text-green-600 font-medium hover:text-green-700 transition-colors">
              Sign up
            </Link>
          </p>

          {/* Reset Password Link */}
          <p className="text-center text-sm text-zinc-600">
            Forgot your password?{' '}
            <Link href="/reset-password" className="text-green-600 font-medium hover:text-green-700 transition-colors">
              Reset it
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
