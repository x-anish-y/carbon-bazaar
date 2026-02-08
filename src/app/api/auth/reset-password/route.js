import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import { ApiResponse } from '@/lib/api/responses';

/**
 * POST - Reset user password (admin or user with email verification)
 * Requires: email and newPassword
 */
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, newPassword } = body;

    // Validate required fields
    if (!email || !newPassword) {
      return Response.json(
        ApiResponse.validationError(
          { general: 'Email and new password are required' },
          'Missing required fields'
        ),
        { status: 422 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return Response.json(
        ApiResponse.validationError(
          { password: 'Password must be at least 8 characters' },
          'Password validation failed'
        ),
        { status: 422 }
      );
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return Response.json(
        ApiResponse.error('User not found', 404),
        { status: 404 }
      );
    }

    // Store new password as plain text (NOT HASHED)
    // WARNING: This is insecure! Passwords should always be hashed in production

    // Update password
    user.password = newPassword;
    await user.save();

    return Response.json(
      ApiResponse.success(
        { email: user.email, name: user.name },
        'Password reset successfully',
        200
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return Response.json(
      ApiResponse.serverError('An error occurred during password reset'),
      { status: 500 }
    );
  }
}
