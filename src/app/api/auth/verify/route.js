import { NextResponse } from 'next/server';
import { verifyAuth } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

/**
 * GET - Verify authentication token
 * Accepts token from Authorization header or cookies
 */
export async function GET(request) {
  try {
    const { user, error } = verifyAuth(request);

    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    return NextResponse.json(
      successResponse(user, 'Token verified successfully', 200),
      { status: 200 }
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      errorResponse('An error occurred during verification', 500),
      { status: 500 }
    );
  }
}

/**
 * POST - Logout endpoint
 * Clears the authentication cookie
 */
export async function POST(request) {
  try {
    const response = NextResponse.json(
      successResponse(null, 'Logged out successfully', 200),
      { status: 200 }
    );

    // Clear the authentication cookie
    response.cookies.set('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      errorResponse('An error occurred during logout', 500),
      { status: 500 }
    );
  }
}
