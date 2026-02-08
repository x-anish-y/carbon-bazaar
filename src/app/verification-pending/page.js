'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VerificationPendingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user data to check verification status
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
          
          // If user is verified, redirect to dashboard
          if (data.data.verified) {
            router.push('/');
          }
        } else {
          // Token invalid, redirect to login
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
    
    // Refresh user status every 10 seconds
    const interval = setInterval(fetchUser, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50">
      {/* Header */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">🌾</span>
            <span className="text-xl font-bold text-zinc-900">Carbon Bazaar</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-10 border border-zinc-200">
          {/* Icon & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-yellow-50 border-2 border-yellow-200 mb-6">
              <span className="text-4xl">⏳</span>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">
              Verification Pending
            </h1>
            <p className="text-zinc-600 text-lg">
              Your account is under review
            </p>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-zinc-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Name</p>
                  <p className="text-lg font-medium text-zinc-900">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Account Type</p>
                  <p className="text-lg font-medium text-zinc-900">
                    {user.role === 'FARMER' ? '🌱 Farmer' : '🏢 Company'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Email</p>
                  <p className="text-sm font-medium text-zinc-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Status</p>
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                    Pending Review
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="space-y-6 mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 mb-4">What happens next?</h2>
              <ul className="space-y-3">
                <li className="flex gap-4">
                  <div className="shrink-0 pt-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 border border-green-300">
                      <span className="text-sm font-bold text-green-700">1</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">Documents Review</p>
                    <p className="text-sm text-zinc-600 mt-1">
                      Our compliance team is reviewing your submitted documents. This usually takes 2-3 business days.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 pt-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 border border-green-300">
                      <span className="text-sm font-bold text-green-700">2</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">Email Notification</p>
                    <p className="text-sm text-zinc-600 mt-1">
                      Once approved, you'll receive an email confirming your account status. We'll never spam you.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="shrink-0 pt-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 border border-green-300">
                      <span className="text-sm font-bold text-green-700">3</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">Full Access</p>
                    <p className="text-sm text-zinc-600 mt-1">
                      Access your dashboard, list carbon credits, and start transacting on the marketplace.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📋 Why verification?</h3>
              <p className="text-sm text-blue-800">
                Carbon Bazaar is a regulated marketplace. We verify all participants to ensure compliance with Indian environmental standards, tax regulations, and anti-fraud measures. This protects both you and the marketplace.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">✅ What we're checking</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Document authenticity and completeness</li>
                <li>• Business registration and credentials</li>
                <li>• Compliance with land ownership/farming practices</li>
                <li>• Tax and legal standing</li>
              </ul>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="border-t border-zinc-200 pt-8">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Common Questions</h2>
            <div className="space-y-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-3 font-medium text-zinc-900 hover:text-green-600 transition-colors">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  How long does verification take?
                </summary>
                <p className="ml-8 mt-3 text-sm text-zinc-600">
                  Typically 2-3 business days. During peak periods, it may take up to 5 business days. You can check your status by logging in here.
                </p>
              </details>
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-3 font-medium text-zinc-900 hover:text-green-600 transition-colors">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  What if my application is rejected?
                </summary>
                <p className="ml-8 mt-3 text-sm text-zinc-600">
                  If rejected, you'll receive detailed feedback explaining why. You can then resubmit corrected documents.
                </p>
              </details>
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-3 font-medium text-zinc-900 hover:text-green-600 transition-colors">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Who should I contact for help?
                </summary>
                <p className="ml-8 mt-3 text-sm text-zinc-600">
                  Email us at support@carbenbazaar.in or call our support team. We're here to help!
                </p>
              </details>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              onClick={handleLogout}
              className="flex-1 px-6 py-3 rounded-lg border-2 border-zinc-300 text-zinc-900 font-medium hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            >
              Logout
            </button>
            <Link
              href="/verification-pending/land-verification"
              className="flex-1 px-6 py-3 rounded-lg border-2 border-green-600 text-green-700 font-medium hover:bg-green-50 transition-colors text-center"
            >
              Land Verification
            </Link>
            <Link
              href="/"
              className="flex-1 px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support Banner */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600 mb-3">Need help with your verification?</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-6">
            <a href="mailto:support@carbenbazaar.in" className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors">
              📧 Email: support@carbenbazaar.in
            </a>
            <a href="tel:+911234567890" className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors">
              📞 Call: +91 123 456 7890
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
