import { verifyToken } from '@/lib/auth/jwt';
import { errorResponse } from '@/lib/utils/response';

/**
 * Normalize role to canonical format
 */
export function normalizeRole(role) {
  if (!role) return role;
  const upper = String(role).toUpperCase();
  if (upper === 'FARMER') return 'SELLER';
  if (upper === 'COMPANY' || upper === 'INDUSTRIES' || upper === 'INDUSTRY') return 'BUYER';
  return upper;
}

/**
 * Check if a user's role satisfies the allowed roles list (with aliasing)
 */
export function isRoleAllowed(userRole, allowedRoles = []) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  return normalizedAllowed.includes(normalizedUserRole);
}

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
    if (decoded && decoded.role) {
      decoded.role = normalizeRole(decoded.role);
    }
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
 * @param {Array<string>} allowedRoles - Array of allowed roles (e.g., ['ADMIN', 'SELLER'])
 * @returns {Object} { user, error }
 */
export function verifyAuthWithRole(request, allowedRoles = []) {
  const { user, error } = verifyAuth(request);

  if (error) {
    return { user: null, error };
  }

  // Check if user's role is in allowed roles
  if (!isRoleAllowed(user.role, allowedRoles)) {
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
  if (!isRoleAllowed(result.user.role, allowedRoles)) {
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
