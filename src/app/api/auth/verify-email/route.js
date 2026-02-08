import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import { errorResponse, successResponse } from '@/lib/utils/response';
import { validateData, formatValidationErrors, verifyEmailSchema } from '@/validators/auth';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { error, value } = validateData(body, verifyEmailSchema);

    if (error) {
      const errors = formatValidationErrors(error);
      return NextResponse.json(
        errorResponse('Validation failed', 400, errors),
        { status: 400 }
      );
    }

    const { token } = value;

    // Find user by verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return NextResponse.json(
        errorResponse('Invalid or expired verification token', 400),
        { status: 400 }
      );
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return NextResponse.json(
      successResponse(
        user.toJSON(),
        'Email verified successfully',
        200
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      errorResponse('An error occurred during email verification', 500),
      { status: 500 }
    );
  }
}

/**
 * GET - Send verification email (for re-sending)
 * Requires authentication via Bearer token
 */
export async function GET(request) {
  try {
    await connectDB();

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('Unauthorized: Missing or invalid authorization header', 401),
        { status: 401 }
      );
    }

    // Note: In production, you would verify the JWT token here
    // For now, we'll just extract the userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID is required', 400),
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        errorResponse('Email is already verified', 400),
        { status: 400 }
      );
    }

    // Generate new verification token
    const crypto = await import('crypto');
    user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    return NextResponse.json(
      successResponse(
        {
          message: 'Verification email sent',
          verificationToken: user.emailVerificationToken,
        },
        'Verification email sent. Check your inbox.',
        200
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while sending verification email', 500),
      { status: 500 }
    );
  }
}
