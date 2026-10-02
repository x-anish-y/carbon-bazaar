'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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

      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        document.cookie = `authToken=${data.data.token}; path=/; max-age=604800; SameSite=Lax`;
      }

      const user = data.data;

      if (user?.role === 'ADMIN') {
        setSuccess('Login successful! Redirecting to admin dashboard...');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1000);
        return;
      }

      if (!user?.isEmailVerified) {
        setSuccess('Login successful! Redirecting to verification...');
        setTimeout(() => {
          router.push('/verification-pending');
        }, 1000);
        return;
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        if (user?.role === 'SELLER' || user?.role === 'FARMER') {
          router.push('/seller/dashboard');
        } else if (user?.role === 'BUYER' || user?.role === 'COMPANY') {
          router.push('/buyer/dashboard');
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
    <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center px-4 py-12 text-[#0B1F17]">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#1B4332] flex items-center justify-center shadow-md">
              <span className="text-white text-lg">🌾</span>
            </div>
            <span className="font-display text-2xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-[#0B1F17]">
            Sign In to Your Account
          </h1>
          <p className="text-zinc-600 text-xs mt-1.5">
            Access your agricultural carbon credits portal or enterprise buyer registry
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-[#1B4332]/10 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-[#1B4332]/10 border border-[#1B4332]/20 text-[#1B4332] rounded-2xl text-xs font-bold">
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="eyebrow mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="eyebrow">Password</label>
                <Link
                  href="/reset-password"
                  className="text-xs text-[#1B4332] hover:underline font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pill btn-pill-solid w-full !py-3.5 font-bold text-xs shadow-lg disabled:opacity-60"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-5 border-t border-zinc-100 text-center text-xs text-zinc-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#1B4332] font-bold hover:underline">
              Create an Account
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-zinc-500 hover:text-[#0B1F17] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
