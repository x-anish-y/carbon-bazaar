'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('Verifying your payment & initiating on-chain settlement...');
  const [transactionId, setTransactionId] = useState('');
  const [tradeOffer, setTradeOffer] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(0);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const razorpayOrderId = searchParams.get('razorpay_order_id');
        const razorpayPaymentId = searchParams.get('razorpay_payment_id');
        const razorpaySignature = searchParams.get('razorpay_signature');
        const listingId = searchParams.get('listingId');
        const creditsRequested = searchParams.get('creditsRequested');
        const negotiatedPrice = searchParams.get('negotiatedPrice');
        const messageParam = searchParams.get('message');
        const userRole = searchParams.get('userRole');

        if (userRole) {
          setRole(userRole);
        }

        if (creditsRequested) {
          setCredits(parseFloat(creditsRequested));
        }

        if (!razorpayOrderId || !razorpayPaymentId) {
          setStatus('failed');
          setError('Missing payment identifiers. Please try again.');
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
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature: razorpaySignature || 'simulated_sig',
            listingId,
            creditsRequested: parseFloat(creditsRequested || 1),
            negotiatedPricePerCredit: parseFloat(negotiatedPrice || 1),
            message: messageParam || 'Marketplace Purchase',
          }),
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.success) {
          setStatus('success');
          setMessage('✅ Payment verified & carbon credits successfully transferred!');
          setTransactionId(razorpayPaymentId);
          setTradeOffer(verifyData.data);
          
          if (verifyData.settlement || verifyData.data?.settlementTxHash) {
            setSettlement(verifyData.settlement || {
              settlementTxHash: verifyData.data.settlementTxHash,
              tokenId: verifyData.data.tokenId,
            });
          }
        } else {
          setStatus('failed');
          setError(verifyData.message || 'Payment verification failed. Please contact support.');
          setMessage('Verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('failed');
        setError(err.message || 'An error occurred during payment verification.');
        setMessage('Error verifying payment');
      }
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 max-w-lg w-full">
        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="text-center py-6">
            <div className="relative inline-block mb-6">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-emerald-200 border-t-emerald-600"></div>
              <span className="absolute inset-0 flex items-center justify-center text-xl">🌱</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Verifying & Settling</h1>
            <p className="text-zinc-600 text-sm">{message}</p>
            <div className="mt-6 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-800 border border-emerald-200">
              ⚡ Executing secure registry transfer and ownership settlement...
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 mb-5 shadow-sm">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-black text-zinc-900 mb-1 tracking-tight">Payment & Transfer Confirmed!</h1>
            <p className="text-xs text-zinc-600 mb-6">
              {credits > 0 ? `${credits} tCO2e` : 'Carbon credits'} have been verified & settled directly to your registry account.
            </p>

            {/* Payment & Settlement Details Box */}
            <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">Payment ID (Razorpay):</span>
                <span className="font-mono text-zinc-900 font-semibold">{transactionId}</span>
              </div>

              {settlement?.settlementTxHash && (
                <div className="pt-3 border-t border-zinc-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-800 font-bold flex items-center gap-1">
                      <span>🏛️</span> Official Registry Settlement:
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Confirmed
                    </span>
                  </div>

                  {settlement.tokenId && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Batch ID:</span>
                      <span className="font-mono font-bold text-zinc-900">#{settlement.tokenId}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-zinc-500 block text-[11px]">Audit Record Hash:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-zinc-700 bg-white px-2 py-1 rounded border border-zinc-200 break-all flex-1">
                        {settlement.settlementTxHash}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(settlement.settlementTxHash);
                          alert('Audit record hash copied to clipboard!');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[11px] transition whitespace-nowrap"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <Link
                href="/portfolio"
                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition text-sm shadow-md shadow-emerald-600/20"
              >
                📊 View Carbon Portfolio
              </Link>
              {role !== 'SELLER' && role !== 'FARMER' && (
                <Link
                  href="/retire"
                  className="block w-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold py-2.5 px-4 rounded-xl transition text-sm"
                >
                  🔥 Offset & Retire Credits
                </Link>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/company/dashboard"
                  className="block w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold py-2.5 px-3 rounded-xl transition text-xs text-center border border-zinc-200"
                >
                  ← Dashboard
                </Link>
                <Link
                  href="/marketplace"
                  className="block w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold py-2.5 px-3 rounded-xl transition text-xs text-center border border-zinc-200"
                >
                  🛒 Marketplace
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Payment Failed</h1>
            <p className="text-zinc-600 text-xs mb-4">{message}</p>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => router.back()}
                className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition"
              >
                Try Again
              </button>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/company/dashboard"
                  className="block w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold py-2.5 px-3 rounded-xl text-xs text-center border border-zinc-200"
                >
                  ← Dashboard
                </Link>
                <Link
                  href="/marketplace"
                  className="block w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold py-2.5 px-3 rounded-xl text-xs text-center border border-zinc-200"
                >
                  🛒 Marketplace
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
        </div>
      }
    >
      <PaymentVerificationContent />
    </Suspense>
  );
}
