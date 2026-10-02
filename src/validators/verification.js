import Joi from 'joi';

/**
 * Validation schema for document upload
 */
export const documentUploadSchema = Joi.object({
  documentType: Joi.string()
    .valid('AADHAAR', 'LAND_RECORD', 'PAN', 'GST_CERTIFICATE')
    .required()
    .messages({
      'any.only': 'Invalid document type. Must be: AADHAAR, LAND_RECORD, PAN, or GST_CERTIFICATE',
      'any.required': 'Document type is required',
    }),
  documentNumber: Joi.string().required().trim().messages({
    'string.empty': 'Document number is required',
  }),
});

/**
 * Validation schema for admin verification action
 */
export const adminVerificationSchema = Joi.object({
  verificationStatus: Joi.string()
    .valid('APPROVED', 'REJECTED')
    .required()
    .messages({
      'any.only': 'Status must be APPROVED or REJECTED',
      'any.required': 'Verification status is required',
    }),
  adminNotes: Joi.string().optional().max(500),
  rejectionReason: Joi.string()
    .when('verificationStatus', {
      is: 'REJECTED',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .max(500)
    .messages({
      'string.max': 'Rejection reason cannot exceed 500 characters',
      'any.required': 'Rejection reason is required when rejecting',
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

/**
 * Validate file for document upload
 * @param {Object} file - File object from form data
 * @returns {Object} { error, isValid }
 */
export function validateFile(file) {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  if (!file) {
    return { error: 'File is required', isValid: false };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File size must not exceed 5MB', isValid: false };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only PDF, JPEG, and PNG files are allowed', isValid: false };
  }

  return { error: null, isValid: true };
}

/**
 * Get required documents for role
 * @param {String} role - User role
 * @returns {Array} Required document types
 */
export function getRequiredDocuments(role) {
  const documentsByRole = {
    SELLER: ['AADHAAR', 'LAND_RECORD'],
    FARMER: ['AADHAAR', 'LAND_RECORD'],
    BUYER: ['PAN', 'GST_CERTIFICATE'],
    COMPANY: ['PAN', 'GST_CERTIFICATE'],
    ADMIN: ['AADHAAR', 'LAND_RECORD', 'PAN', 'GST_CERTIFICATE'],
  };
  return documentsByRole[role] || [];
}

/**
 * Check if user has all required documents
 * @param {Array} documents - User's documents
 * @param {String} role - User role
 * @returns {Boolean} True if all required documents are present
 */
export function hasAllRequiredDocuments(documents, role) {
  const required = getRequiredDocuments(role);
  const documentTypes = documents.map((doc) => doc.documentType);
  return required.every((docType) => documentTypes.includes(docType));
}

/**
 * Check if all documents are verified
 * @param {Array} documents - User's documents
 * @returns {Boolean} True if all are approved
 */
export function areAllDocumentsVerified(documents) {
  return documents.length > 0 && documents.every((doc) => doc.verificationStatus === 'APPROVED');
}
