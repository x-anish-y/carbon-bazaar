import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

/**
 * GET - Fetch user profile
 * Accessible by authenticated users
 */
export async function GET(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(
      request,
      [],
      false
    );

    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    // Handle admin user (not in database)
    if (user.role === 'ADMIN' && user.userId === 'admin') {
      const adminData = {
        _id: 'admin',
        userId: 'admin',
        name: 'Administrator',
        email: user.email,
        role: 'ADMIN',
        isEmailVerified: true,
        verified: true,
      };
      return NextResponse.json(
        successResponse(adminData, 'Admin profile fetched successfully', 200),
        { status: 200 }
      );
    }

    const userData = await User.findById(user.userId);

    if (!userData) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(userData.toJSON(), 'User fetched successfully', 200),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while fetching user', 500),
      { status: 500 }
    );
  }
}

/**
 * PUT - Update user profile
 * Accessible by authenticated users
 * FARMER and COMPANY users must be email verified
 */
export async function PUT(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(
      request,
      [],
      false
    );

    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    // Check email verification for FARMER and COMPANY roles
    const userDoc = await User.findById(user.userId);
    if (
      (userDoc.role === 'FARMER' || userDoc.role === 'COMPANY') &&
      !userDoc.isEmailVerified
    ) {
      return NextResponse.json(
        errorResponse('Please verify your email before updating profile', 403),
        { status: 403 }
      );
    }

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = ['name', 'profile'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    // Don't allow updating critical fields
    delete updates.role;
    delete updates.email;
    delete updates.password;
    delete updates.isEmailVerified;

    const updatedUser = await User.findByIdAndUpdate(
      user.userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse(
        updatedUser.toJSON(),
        'User updated successfully',
        200
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while updating user', 500),
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete user account
 * Accessible by authenticated users
 */
export async function DELETE(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(
      request,
      [],
      false
    );

    if (error) {
      return NextResponse.json(error, { status: error.statusCode });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(user.userId);

    if (!deletedUser) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    // Clear the authentication cookie
    const response = NextResponse.json(
      successResponse(null, 'Account deleted successfully', 200),
      { status: 200 }
    );

    response.cookies.set('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Profile deletion error:', error);
    return NextResponse.json(
      errorResponse('An error occurred while deleting account', 500),
      { status: 500 }
    );
  }
}
