import Joi from 'joi';

/**
 * Validation schema for user registration
 */
export const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().min(8).max(50).messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
  }),
  role: Joi.string().valid('SELLER', 'BUYER', 'ADMIN', 'FARMER', 'COMPANY').required().messages({
    'any.only': 'Role must be one of: SELLER, BUYER, ADMIN',
    'string.empty': 'Role is required',
  }),
  profile: Joi.object({
    phone: Joi.string().optional(),
    companyName: Joi.string().optional(),
    businessType: Joi.string().optional(),
    location: Joi.string().optional(),
    bio: Joi.string().optional(),
  }).optional(),
});

/**
 * Validation schema for user login
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

/**
 * Validation schema for email verification
 */
export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Verification token is required',
  }),
});

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @returns {Object} { error, value }
 */
export function validateData(data, schema) {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

/**
 * Format validation errors
 * @param {Object} joiError - Joi error object
 * @returns {Object} Formatted errors
 */
export function formatValidationErrors(joiError) {
  const errors = {};
  if (joiError.details) {
    joiError.details.forEach((detail) => {
      errors[detail.path[0]] = detail.message;
    });
  }
  return errors;
}
