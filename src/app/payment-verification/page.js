'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment...');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const razorpayOrderId = searchParams.get('razorpay_order_id');
        const razorpayPaymentId = searchParams.get('razorpay_payment_id');
        const razorpaySignature = searchParams.get('razorpay_signature');
        const listingId = searchParams.get('listingId');
        const creditsRequested = searchParams.get('creditsRequested');
        const negotiatedPrice = searchParams.get('negotiatedPrice');
        const message = searchParams.get('message');
        const userRole = searchParams.get('userRole');

        console.log('Payment verification started with params:', {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          listingId,
          creditsRequested,
          negotiatedPrice,
        });

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
          setStatus('failed');
          setError('Missing payment details. Please try again.');
          setMessage('Payment verification incomplete');
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          setStatus('failed');
          setError('Session expired. Please login and try again.');
          setMessage('Authentication required');
          return;
        }

        // Verify payment with server
        console.log('Verifying payment with server...');
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            listingId,
            creditsRequested: parseFloat(creditsRequested),
            negotiatedPricePerCredit: parseFloat(negotiatedPrice),
            message: message || 'Payment processed',
          }),
        });

        const verifyData = await verifyResponse.json();

        console.log('Verify response status:', verifyResponse.status);
        console.log('Verify response data:', verifyData);

        // Check success flag from response, not HTTP status
        if (verifyData.success) {
          setStatus('success');
          setMessage('✅ Payment verified successfully!');
          setTransactionId(razorpayPaymentId);
          
          // Redirect after 3 seconds with refresh parameter
          setRedirecting(true);
          setTimeout(() => {
            const dashboardPath = userRole === 'FARMER' ? '/farmer/dashboard' : '/company/dashboard';
            // Add payment_success parameter to trigger data refresh in dashboard
            router.push(`${dashboardPath}?payment_success=true`);
          }, 3000);
        } else {
          setStatus('failed');
          setError(verifyData.message || 'Payment verification failed. Please contact support.');
          setMessage('Verification failed');
          console.error('Payment verification failed:', verifyData.message);
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('failed');
        setError(err.message || 'An error occurred during payment verification.');
        setMessage('Error verifying payment');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mb-6"></div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Verifying Payment</h1>
            <p className="text-zinc-600">{message}</p>
            <p className="text-sm text-zinc-500 mt-4">Please do not close this page...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="inline-block mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Payment Successful!</h1>
            <p className="text-zinc-600 mb-6">{message}</p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-zinc-600">
                <span className="font-semibold text-zinc-900">Transaction ID:</span>
                <br />
                <span className="font-mono text-xs text-zinc-700 break-all">{transactionId}</span>
              </p>
            </div>

            {redirecting && (
              <div className="mb-6">
                <p className="text-sm text-zinc-600">
                  Redirecting to your dashboard in 3 seconds...
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full w-1/3 animate-pulse"></div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/farmer/dashboard"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/carbon-marketplace"
                className="block w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="text-center">
            <div className="inline-block mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Payment Failed</h1>
            <p className="text-zinc-600 mb-4">{message}</p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="block w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Go Back to Marketplace
              </button>
              <Link
                href="/carbon-marketplace"
                className="block w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Browse Listings
              </Link>
              <Link
                href="/farm/dashboard"
                className="block w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold py-2 px-4 rounded-lg transition text-sm"
              >
                Go to Dashboard
              </Link>
            </div>

            <p className="text-xs text-zinc-500 mt-6">
              If you believe this is an error, please contact support with your Transaction ID.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
