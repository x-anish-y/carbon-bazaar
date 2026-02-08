/**
 * Consistent API Response Format Wrapper
 * Ensures all API responses follow a standard format
 */

export const ApiResponse = {
  /**
   * Success response
   */
  success: (data, message = 'Success', statusCode = 200) => {
    return {
      success: true,
      status: statusCode,
      message,
      data,
    };
  },

  /**
   * Error response
   */
  error: (message, statusCode = 400, errors = null) => {
    return {
      success: false,
      status: statusCode,
      message,
      errors,
    };
  },

  /**
   * Created response (201)
   */
  created: (data, message = 'Resource created successfully') => {
    return {
      success: true,
      status: 201,
      message,
      data,
    };
  },

  /**
   * Not found response (404)
   */
  notFound: (message = 'Resource not found') => {
    return {
      success: false,
      status: 404,
      message,
    };
  },

  /**
   * Unauthorized response (401)
   */
  unauthorized: (message = 'Unauthorized access') => {
    return {
      success: false,
      status: 401,
      message,
    };
  },

  /**
   * Forbidden response (403)
   */
  forbidden: (message = 'Access forbidden') => {
    return {
      success: false,
      status: 403,
      message,
    };
  },

  /**
   * Validation error response (422)
   */
  validationError: (errors, message = 'Validation failed') => {
    return {
      success: false,
      status: 422,
      message,
      errors,
    };
  },

  /**
   * Server error response (500)
   */
  serverError: (message = 'Internal server error', error = null) => {
    return {
      success: false,
      status: 500,
      message,
      ...(process.env.NODE_ENV === 'development' && error && { error: error.message }),
    };
  },
};

/**
 * Consistent API response sender for Next.js
 */
export async function sendApiResponse(res, response) {
  return res.status(response.status).json(response);
}

/**
 * Validation error builder
 */
export function buildValidationError(fieldErrors) {
  const errors = {};
  
  if (Array.isArray(fieldErrors)) {
    fieldErrors.forEach((error) => {
      if (error.field) {
        errors[error.field] = error.message;
      }
    });
  } else if (typeof fieldErrors === 'object') {
    Object.assign(errors, fieldErrors);
  }
  
  return errors;
}

/**
 * Safe async handler for API routes
 */
export function asyncHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = buildValidationError(error.errors);
        return sendApiResponse(
          res,
          ApiResponse.validationError(errors, 'Validation failed')
        );
      }
      
      if (error.name === 'CastError') {
        return sendApiResponse(
          res,
          ApiResponse.error('Invalid ID format', 400)
        );
      }
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return sendApiResponse(
          res,
          ApiResponse.validationError(
            { [field]: `${field} already exists` },
            'Duplicate entry'
          )
        );
      }
      
      sendApiResponse(
        res,
        ApiResponse.serverError('Internal server error', error)
      );
    }
  };
}
