import { verifyToken } from '@/lib/auth/jwt';
import { errorResponse } from '@/lib/utils/response';

/**
 * Extract token from Authorization header or cookies
 * @param {Object} request - Next.js request object
 * @returns {string|null} JWT token or null
 */
function extractToken(request) {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith('authToken='));
    if (authCookie) {
      return authCookie.substring('authToken='.length);
    }
  }

  return null;
}

/**
 * Authentication middleware to verify JWT token
 * Extracts token from Authorization header or cookies and validates it
 * @param {Object} request - Next.js request object
 * @returns {Object} User object from token or null
 */
export function authenticateRequest(request) {
  try {
    const token = extractToken(request);

    if (!token) {
      return null;
    }

    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify authentication and return user or error
 * @param {Object} request - Next.js request object
 * @returns {Object} { user, error }
 */
export function verifyAuth(request) {
  const user = authenticateRequest(request);

  if (!user) {
    return {
      user: null,
      error: errorResponse('Unauthorized: Invalid or missing token', 401),
    };
  }

  return { user, error: null };
}

/**
 * Verify authentication with role-based access control
 * @param {Object} request - Next.js request object
 * @param {Array<string>} allowedRoles - Array of allowed roles (e.g., ['ADMIN', 'FARMER'])
 * @returns {Object} { user, error }
 */
export function verifyAuthWithRole(request, allowedRoles = []) {
  const { user, error } = verifyAuth(request);

  if (error) {
    return { user: null, error };
  }

  // Check if user's role is in allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: errorResponse(
        `Forbidden: This resource is only available to ${allowedRoles.join(', ')} users`,
        403
      ),
    };
  }

  return { user, error: null };
}

/**
 * Verify authentication with email verification requirement
 * @param {Object} request - Next.js request object
 * @returns {Object} { user, error }
 */
export function verifyAuthWithEmailVerification(request) {
  const { user, error } = verifyAuth(request);

  if (error) {
    return { user: null, error };
  }

  if (!user.isEmailVerified) {
    return {
      user: null,
      error: errorResponse('Forbidden: Please verify your email first', 403),
    };
  }

  return { user, error: null };
}

/**
 * Verify authentication with both role and email verification
 * @param {Object} request - Next.js request object
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @param {boolean} requireEmailVerification - Whether email verification is required
 * @returns {Object} { user, error }
 */
export function verifyAuthWithRoleAndVerification(
  request,
  allowedRoles = [],
  requireEmailVerification = false
) {
  let result = verifyAuth(request);

  if (result.error) {
    return result;
  }

  // Check role if provided
  if (allowedRoles.length > 0 && !allowedRoles.includes(result.user.role)) {
    return {
      user: null,
      error: errorResponse(
        `Forbidden: This resource is only available to ${allowedRoles.join(', ')} users`,
        403
      ),
    };
  }

  // Check email verification if required
  if (requireEmailVerification && !result.user.isEmailVerified) {
    return {
      user: null,
      error: errorResponse('Forbidden: Please verify your email first', 403),
    };
  }

  return result;
}

