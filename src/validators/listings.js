import Joi from 'joi';
import { INDIA_CROP_CODES, CREDIT_TYPE_CODES, PRICE_CONSTRAINTS, CREDITS_CONSTRAINTS } from '@/lib/india/constants';

/**
 * Validation schema for creating a new carbon listing
 * Generic multi-sector schema supporting Premium, Medium, and Baseline credit tiers.
 */
export const createListingSchema = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format (e.g., 2026-08)',
      'any.required': 'Vintage month is required',
    }),

  creditsAmount: Joi.number()
    .min(CREDITS_CONSTRAINTS.min)
    .max(CREDITS_CONSTRAINTS.max)
    .required()
    .messages({
      'number.min': `Number of credits must be greater than ${CREDITS_CONSTRAINTS.min} ${CREDITS_CONSTRAINTS.unit}`,
      'number.max': `Number of credits cannot exceed ${CREDITS_CONSTRAINTS.max} ${CREDITS_CONSTRAINTS.unit}`,
      'any.required': 'Number of carbon credits is required',
    }),

  carbonCredits: Joi.number()
    .min(CREDITS_CONSTRAINTS.min)
    .max(CREDITS_CONSTRAINTS.max)
    .optional(),

  creditType: Joi.string()
    .valid(...CREDIT_TYPE_CODES)
    .default('BASELINE')
    .optional()
    .messages({
      'any.only': 'Credit type must be one of: PREMIUM, MEDIUM, BASELINE',
    }),

  pricePerCredit: Joi.number()
    .min(PRICE_CONSTRAINTS.min)
    .max(PRICE_CONSTRAINTS.max)
    .required()
    .messages({
      'number.min': `Price must be at least ₹${PRICE_CONSTRAINTS.min} per credit`,
      'number.max': `Price cannot exceed ₹${PRICE_CONSTRAINTS.max} per credit`,
      'any.required': 'Price per credit is required',
    }),

  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Project methodology description must be at least 10 characters',
      'string.max': 'Project methodology description cannot exceed 1000 characters',
      'any.required': 'Project methodology description is required',
    }),

  projectMethodologyDescription: Joi.string()
    .min(10)
    .max(1000)
    .optional(),

  state: Joi.string()
    .length(2)
    .pattern(/^[A-Z]{2}$/)
    .default('MH')
    .optional()
    .messages({
      'string.length': 'State code must be 2 characters',
      'string.pattern.base': 'State code must be 2 uppercase letters',
    }),

  // Legacy fields (optional / deprecated)
  cropType: Joi.string()
    .optional(),

  areaInHectares: Joi.number()
    .min(0.1)
    .max(10000)
    .optional(),

  methodology: Joi.string()
    .valid(
      'REGENERATIVE_AGRICULTURE',
      'CROP_ROTATION',
      'AGROFORESTRY',
      'CONSERVATION_TILLAGE',
      'RENEWABLE_ENERGY',
      'FORESTRY',
      'INDUSTRIAL_EFFICIENCY',
      'OTHER'
    )
    .optional()
    .messages({
      'any.only': 'Invalid methodology',
    }),
});

/**
 * Validation schema for updating a listing
 */
export const updateListingSchema = Joi.object({
  pricePerCredit: Joi.number()
    .min(PRICE_CONSTRAINTS.min)
    .max(PRICE_CONSTRAINTS.max)
    .optional()
    .messages({
      'number.min': `Price must be at least ₹${PRICE_CONSTRAINTS.min} per credit`,
      'number.max': `Price cannot exceed ₹${PRICE_CONSTRAINTS.max} per credit`,
    }),

  creditType: Joi.string()
    .valid(...CREDIT_TYPE_CODES)
    .optional(),

  description: Joi.string()
    .min(10)
    .max(1000)
    .optional()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 1000 characters',
    }),

  projectMethodologyDescription: Joi.string()
    .min(10)
    .max(1000)
    .optional(),

  status: Joi.string()
    .valid('ACTIVE', 'SOLD_OUT', 'DELISTED')
    .optional()
    .messages({
      'any.only': 'Invalid status',
    }),

  methodology: Joi.string()
    .valid(
      'REGENERATIVE_AGRICULTURE',
      'CROP_ROTATION',
      'AGROFORESTRY',
      'CONSERVATION_TILLAGE',
      'RENEWABLE_ENERGY',
      'FORESTRY',
      'INDUSTRIAL_EFFICIENCY',
      'OTHER'
    )
    .optional(),
});

/**
 * Validation function
 */
export function validateData(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return {
      isValid: false,
      errors: formatValidationErrors(error.details),
    };
  }

  return {
    isValid: true,
    value,
  };
}

/**
 * Format validation errors
 */
export function formatValidationErrors(details) {
  return details.reduce((acc, detail) => {
    acc[detail.path.join('.')] = detail.message;
    return acc;
  }, {});
}

/**
 * Validate that farmer is verified
 */
export async function validateFarmerVerified(farmerDoc) {
  if (!farmerDoc || farmerDoc.role !== 'FARMER') {
    return {
      isValid: false,
      message: 'Only FARMER users can create listings',
    };
  }

  if (!farmerDoc.isEmailVerified) {
    return {
      isValid: false,
      message: 'Email verification required before listing credits',
    };
  }

  if (!farmerDoc.isVerified) {
    return {
      isValid: false,
      message: 'Document verification required before listing credits. Please upload your identity or organization KYC documents.',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validate month format and not in future
 */
export function validateMonth(monthString) {
  // Check format
  if (!/^\d{4}-\d{2}$/.test(monthString)) {
    return {
      isValid: false,
      message: 'Vintage month must be in YYYY-MM format',
    };
  }

  // Parse the month
  const [year, month] = monthString.split('-').map(Number);

  // Validate ranges
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      message: 'Month must be between 01 and 12',
    };
  }

  if (year < 2000 || year > 2100) {
    return {
      isValid: false,
      message: 'Vintage year must be between 2000 and 2100',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Helper: Format price for display
 */
export function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(price);
}

/**
 * Helper: Format month for display
 */
export function formatMonth(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * Helper: Get crop type display name
 */
export function getCropTypeLabel(cropType) {
  const labels = {
    RICE: 'Rice',
    WHEAT: 'Wheat',
    MAIZE: 'Maize',
    SUGARCANE: 'Sugarcane',
    COTTON: 'Cotton',
    SOYBEAN: 'Soybean',
    PULSES: 'Pulses',
    FRUITS: 'Fruits',
    VEGETABLES: 'Vegetables',
    SPICES: 'Spices',
    FORAGE: 'Forage',
    OTHER: 'Other',
  };
  return labels[cropType] || cropType;
}

/**
 * Helper: Get methodology display name
 */
export function getMethodologyLabel(methodology) {
  const labels = {
    REGENERATIVE_AGRICULTURE: 'Regenerative Agriculture',
    CROP_ROTATION: 'Crop Rotation',
    AGROFORESTRY: 'Agroforestry',
    CONSERVATION_TILLAGE: 'Conservation Tillage',
    OTHER: 'Other',
  };
  return labels[methodology] || methodology;
}
