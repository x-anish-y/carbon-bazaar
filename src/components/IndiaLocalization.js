/**
 * India Localization Utilities Component
 * Provides formatting for INR currency and tCO2e credits in India-specific context
 */

import { CURRENCY, CREDITS_CONSTRAINTS, formatINR, formatCredits, getCropName, getStateName } from '@/lib/india/constants';

/**
 * Price Display Component
 * Shows prices in INR only
 */
export function PriceDisplay({ amount, showPerCredit = false, className = '' }) {
  if (amount === undefined || amount === null) return '-';

  return (
    <span className={`font-medium text-green-700 ${className}`}>
      {formatINR(amount)}
      {showPerCredit && <span className="text-gray-600 text-sm ml-1">per credit</span>}
    </span>
  );
}

/**
 * Credits Display Component
 * Shows credits in tCO2e
 */
export function CreditsDisplay({ amount, className = '' }) {
  if (amount === undefined || amount === null) return '-';

  return (
    <span className={`font-medium text-blue-700 ${className}`}>
      {formatCredits(amount)}
    </span>
  );
}

/**
 * Crop Type Display Component
 * Shows crop type in human-readable format
 */
export function CropTypeDisplay({ cropCode, className = '' }) {
  return <span className={`font-medium text-amber-700 ${className}`}>{getCropName(cropCode)}</span>;
}

/**
 * State Name Display Component
 * Shows state name from code
 */
export function StateDisplay({ stateCode, className = '' }) {
  const stateName = getStateName(stateCode);
  return <span className={`font-medium text-indigo-700 ${className}`}>{stateName || stateCode}</span>;
}

/**
 * Listing Details Card
 * Displays a complete listing with all India-specific formatting
 */
export function ListingCard({ listing, onNegotiate }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      {/* Seller and Location Info */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{listing.sellerId?.name}</h3>
          <p className="text-sm text-gray-600">{listing.sellerType}</p>
        </div>
        <StateDisplay stateCode={listing.state} />
      </div>

      {/* Crop and Credits */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Crop Type</p>
          <CropTypeDisplay cropCode={listing.cropType} className="text-lg" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Available Credits</p>
          <CreditsDisplay amount={listing.availableCredits} className="text-lg" />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-green-50 rounded-lg p-4 mb-4">
        <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Price Per Credit (INR)</p>
        <PriceDisplay amount={listing.pricePerCredit} className="text-2xl" />
        <p className="text-sm text-gray-600 mt-2">
          Total: <PriceDisplay amount={listing.creditsAmount * listing.pricePerCredit} />
        </p>
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm mb-4 line-clamp-2">{listing.description}</p>

      {/* Month and Status */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Month:</span> {listing.month}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            listing.status === 'ACTIVE'
              ? 'bg-green-100 text-green-800'
              : listing.status === 'SOLD_OUT'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {listing.status}
        </span>
      </div>

      {/* Action Button */}
      {onNegotiate && listing.status === 'ACTIVE' && (
        <button
          onClick={() => onNegotiate(listing)}
          className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium transition"
        >
          💬 Send Offer & Negotiate
        </button>
      )}
    </div>
  );
}

/**
 * Price Input Component
 * Validates price input for INR currency
 */
export function PriceInput({ value, onChange, label = 'Price (₹)', error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-gray-500 font-medium">₹</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          step="0.01"
          min="1"
          max="10000"
          className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter price in INR"
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      <p className="text-xs text-gray-500 mt-1">Range: ₹1 - ₹10,000</p>
    </div>
  );
}

/**
 * Credits Input Component
 * Validates credits input for tCO2e
 */
export function CreditsInput({ value, onChange, label = 'Credits (tCO2e)', error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step="0.0001"
        min="0.01"
        max="1000000"
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder="Enter credits in tCO2e"
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      <p className="text-xs text-gray-500 mt-1">Range: 0.01 - 1,000,000 tCO2e</p>
    </div>
  );
}

/**
 * India Compliance Info Banner
 * Displays India-specific compliance information
 */
export function IndiaComplianceInfo() {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
      <h3 className="font-semibold text-blue-900 mb-2">🇮🇳 India-Specific Requirements</h3>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>✓ Currency: INR only</li>
        <li>✓ Units: tCO2e (tonnes CO2 equivalent)</li>
        <li>✓ Crops: Rice, Wheat, Sugarcane, Pulses only</li>
        <li>✓ States: All 28 Indian states and 8 union territories</li>
        <li>✓ Monthly compliance cycle for listings</li>
      </ul>
    </div>
  );
}

export default {
  PriceDisplay,
  CreditsDisplay,
  CropTypeDisplay,
  StateDisplay,
  ListingCard,
  PriceInput,
  CreditsInput,
  IndiaComplianceInfo,
};
