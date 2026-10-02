import TradeOffer from '@/models/TradeOffer';

/**
 * Check if a payment has already been settled (idempotency guard).
 * Uses the Razorpay payment ID as a natural idempotency key.
 *
 * @param {string} paymentId - The Razorpay payment ID (e.g., pay_xxx)
 * @returns {Promise<{isDuplicate: boolean, existingOffer: object|null}>}
 */
export async function checkPaymentIdempotency(paymentId) {
  if (!paymentId) {
    return { isDuplicate: false, existingOffer: null };
  }

  const existingOffer = await TradeOffer.findOne({ transactionId: paymentId })
    .populate('buyerId', 'name email')
    .populate('sellerId', 'name email');

  if (existingOffer) {
    return { isDuplicate: true, existingOffer };
  }

  return { isDuplicate: false, existingOffer: null };
}
