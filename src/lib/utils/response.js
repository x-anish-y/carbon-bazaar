/**
 * Success response formatter
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted response
 */
export function successResponse(data, message = 'Success', statusCode = 200) {
  return {
    success: true,
    message,
    data,
    statusCode,
  };
}

/**
 * Error response formatter
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 * @returns {Object} Formatted response
 */
export function errorResponse(message = 'An error occurred', statusCode = 500, errors = null) {
  return {
    success: false,
    message,
    errors,
    statusCode,
  };
}

/**
 * Send JSON response
 * @param {Object} response - Next.js response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 */
export function sendResponse(response, data, statusCode = 200) {
  return response.status(statusCode).json(data);
}
