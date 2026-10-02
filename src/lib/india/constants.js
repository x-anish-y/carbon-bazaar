/**
 * India-Specific Configuration Constants
 * Ensures the platform complies with Indian carbon credit requirements
 */

// Indian States - All 28 states and 8 union territories
export const INDIAN_STATES = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'DD', name: 'Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'DN', name: 'Dadra and Nagar Haveli' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
];

// Carbon Credit Quality Tiers
export const CREDIT_TYPES = {
  PREMIUM: {
    code: 'PREMIUM',
    label: 'Premium-Quality Credits',
    shortLabel: 'Premium Quality',
    icon: '⭐',
    description: 'High-permanence credits with advanced MRV verification and high co-benefits',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    themeGradient: 'from-[#0B1F17] via-[#1B4332]/95 to-[#287A5E]/80',
  },
  MEDIUM: {
    code: 'MEDIUM',
    label: 'Medium-Quality Credits',
    shortLabel: 'Medium Quality',
    icon: '🌿',
    description: 'Standard verified carbon offsets with verifiable environmental additionality',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    themeGradient: 'from-[#1A1D0B] via-[#3D421B]/95 to-[#606C38]/80',
  },
  BASELINE: {
    code: 'BASELINE',
    label: 'Baseline Credits',
    shortLabel: 'Baseline Credits',
    icon: '🛡️',
    description: 'Entry-level compliance credits verified under baseline carbon accounting',
    badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    themeGradient: 'from-[#0B151F] via-[#1B2B3A]/95 to-[#3B5B78]/80',
  },
};

export const CREDIT_TYPE_CODES = Object.keys(CREDIT_TYPES);

// Allowed crop types for India (legacy compatibility)
export const INDIA_CROP_TYPES = {
  RICE: 'Rice',
  WHEAT: 'Wheat',
  SUGARCANE: 'Sugarcane',
  PULSES: 'Pulses',
};

// Crop codes for validation (legacy compatibility)
export const INDIA_CROP_CODES = Object.keys(INDIA_CROP_TYPES);

// Currency configuration - INR only
export const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  name: 'Indian Rupees',
};

// Price range constraints (in INR)
export const PRICE_CONSTRAINTS = {
  min: 1,
  max: 10000,
  decimalPlaces: 2,
};

// Credits constraints (in tCO2e - tonnes CO2 equivalent)
export const CREDITS_CONSTRAINTS = {
  min: 0.01,
  max: 1000000,
  decimalPlaces: 4,
  unit: 'tCO2e', // Standard unit for carbon credits
};

// Area constraints (in hectares)
export const AREA_CONSTRAINTS = {
  min: 0.1,
  max: 10000,
  decimalPlaces: 2,
  unit: 'hectares',
};

// Monthly compliance cycle
export const COMPLIANCE_CYCLE = {
  frequency: 'MONTHLY',
  pattern: 'YYYY-MM',
  description: 'Monthly listing cycles for compliance tracking',
};

// Utility functions

/**
 * Get state name from code
 * @param {string} code - State code
 * @returns {string} State name
 */
export function getStateName(code) {
  const state = INDIAN_STATES.find((s) => s.code === code);
  return state ? state.name : null;
}

/**
 * Get state code from name
 * @param {string} name - State name
 * @returns {string} State code
 */
export function getStateCode(name) {
  const state = INDIAN_STATES.find((s) => s.name === name);
  return state ? state.code : null;
}

/**
 * Format price in INR
 * @param {number} amount - Amount in INR
 * @returns {string} Formatted price
 */
export function formatINR(amount) {
  return `${CURRENCY.symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format credits amount
 * @param {number} amount - Amount in tCO2e
 * @returns {string} Formatted credits
 */
export function formatCredits(amount) {
  return `${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${CREDITS_CONSTRAINTS.unit}`;
}

/**
 * Get crop type display name
 * @param {string} code - Crop code
 * @returns {string} Crop name
 */
export function getCropName(code) {
  return INDIA_CROP_TYPES[code] || code;
}

/**
 * Validate if crop is allowed in India
 * @param {string} cropCode - Crop code
 * @returns {boolean} True if allowed
 */
export function isAllowedCrop(cropCode) {
  return INDIA_CROP_CODES.includes(cropCode);
}

/**
 * Validate if state code is valid
 * @param {string} stateCode - State code
 * @returns {boolean} True if valid
 */
export function isValidState(stateCode) {
  return INDIAN_STATES.some((s) => s.code === stateCode);
}

/**
 * Validate price constraints
 * @param {number} price - Price in INR
 * @returns {object} { isValid, error }
 */
export function validatePrice(price) {
  if (price < PRICE_CONSTRAINTS.min) {
    return {
      isValid: false,
      error: `Price must be at least ${formatINR(PRICE_CONSTRAINTS.min)}`,
    };
  }
  if (price > PRICE_CONSTRAINTS.max) {
    return {
      isValid: false,
      error: `Price cannot exceed ${formatINR(PRICE_CONSTRAINTS.max)}`,
    };
  }
  // Check decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(price.toString())) {
    return {
      isValid: false,
      error: `Price must have maximum ${PRICE_CONSTRAINTS.decimalPlaces} decimal places`,
    };
  }
  return { isValid: true };
}

/**
 * Validate credits constraints
 * @param {number} credits - Credits in tCO2e
 * @returns {object} { isValid, error }
 */
export function validateCredits(credits) {
  if (credits < CREDITS_CONSTRAINTS.min) {
    return {
      isValid: false,
      error: `Credits must be at least ${CREDITS_CONSTRAINTS.min} ${CREDITS_CONSTRAINTS.unit}`,
    };
  }
  if (credits > CREDITS_CONSTRAINTS.max) {
    return {
      isValid: false,
      error: `Credits cannot exceed ${CREDITS_CONSTRAINTS.max} ${CREDITS_CONSTRAINTS.unit}`,
    };
  }
  // Check decimal places
  if (!/^\d+(\.\d{1,4})?$/.test(credits.toString())) {
    return {
      isValid: false,
      error: `Credits must have maximum ${CREDITS_CONSTRAINTS.decimalPlaces} decimal places`,
    };
  }
  return { isValid: true };
}

export default {
  INDIAN_STATES,
  INDIA_CROP_TYPES,
  INDIA_CROP_CODES,
  CURRENCY,
  PRICE_CONSTRAINTS,
  CREDITS_CONSTRAINTS,
  AREA_CONSTRAINTS,
  COMPLIANCE_CYCLE,
};
