'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
    role: 'SELLER',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.state) {
      setError('Please select a state');
      setLoading(false);
      return;
    }

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

      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
      }

      setSuccess('Registration successful! Redirecting to document verification...');
      setTimeout(() => {
        router.push('/verification/upload');
      }, 1000);
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-4 sm:p-6 text-[#0B1F17]">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center justify-center text-white">
              <span>🌾</span>
            </div>
            <span className="font-display text-2xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-[#0B1F17] tracking-tight">
            Create an Account
          </h1>
          <p className="text-zinc-600 text-xs mt-1">
            Join the national marketplace for verified agricultural carbon credits.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-[#1B4332]/10 space-y-6"
        >
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Switcher */}
            <div>
              <label className="eyebrow mb-2">Select Your Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'SELLER' })}
                  className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    formData.role === 'SELLER'
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FAF8F2] text-zinc-700 border-[#1B4332]/15 hover:border-[#1B4332]/30'
                  }`}
                >
                  <span>🌾</span> Seller (Producer)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'BUYER' })}
                  className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    formData.role === 'BUYER'
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                      : 'bg-[#FAF8F2] text-zinc-700 border-[#1B4332]/15 hover:border-[#1B4332]/30'
                  }`}
                >
                  <span>🏢</span> Buyer (Off-taker)
                </button>
              </div>
            </div>

            <div>
              <label className="eyebrow mb-1.5">Full Name / Organization</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ramesh Kumar or Acme Clean Energy"
                required
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="eyebrow mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="eyebrow mb-1.5">Indian State / UT</label>
              <StateDropdown
                value={formData.state}
                onChange={handleStateChange}
                className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="eyebrow mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#1B4332]/20 rounded-2xl text-xs font-semibold text-[#0B1F17] focus:ring-2 focus:ring-[#1B4332] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pill btn-pill-solid w-full !py-3.5 font-bold text-xs shadow-lg mt-4 disabled:opacity-60"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div className="pt-5 border-t border-zinc-100 text-center text-xs text-zinc-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1B4332] font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </motion.div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-zinc-500 hover:text-[#0B1F17] transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
