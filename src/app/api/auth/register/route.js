import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import { ApiResponse } from '@/lib/api/responses';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    let { name, email, phone, password, role, state } = body;

    // Normalize role
    if (role === 'FARMER') role = 'SELLER';
    if (role === 'COMPANY') role = 'BUYER';

    // Validate required fields
    if (!name || !email || !phone || !password || !role || !state) {
      return Response.json(
        ApiResponse.validationError(
          { general: 'All fields are required' },
          'Missing required fields'
        ),
        { status: 422 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        ApiResponse.validationError(
          { email: 'Invalid email format' },
          'Email validation failed'
        ),
        { status: 422 }
      );
    }

    // Validate phone format (10+ digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return Response.json(
        ApiResponse.validationError(
          { phone: 'Phone number must be at least 10 digits' },
          'Phone validation failed'
        ),
        { status: 422 }
      );
    }

    // Validate role
    if (!['SELLER', 'BUYER', 'ADMIN', 'FARMER', 'COMPANY'].includes(role)) {
      return Response.json(
        ApiResponse.validationError(
          { role: 'Invalid role. Must be SELLER or BUYER' },
          'Role validation failed'
        ),
        { status: 422 }
      );
    }

    const canonicalRole = role === 'FARMER' ? 'SELLER' : (role === 'COMPANY' ? 'BUYER' : role);

    // Validate password length
    if (password.length < 8) {
      return Response.json(
        ApiResponse.validationError(
          { password: 'Password must be at least 8 characters' },
          'Password validation failed'
        ),
        { status: 422 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json(
        ApiResponse.validationError(
          { email: 'Email already registered' },
          'User already exists'
        ),
        { status: 422 }
      );
    }

    // Create new user
    const newUser = await User.create({
      name,
      email,
      phone,
      password: password,
      role: canonicalRole,
      state,
      isEmailVerified: true,
      verified: true,
      status: 'VERIFIED',
    });

    // Grant starting verified credits to newly registered sellers
    if (canonicalRole === 'SELLER') {
      try {
        const { ensureSellerInitialCredits } = await import('@/lib/blockchain/sellerCredits');
        await ensureSellerInitialCredits(newUser);
      } catch (grantErr) {
        console.error('Initial credit allocation notice:', grantErr.message);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const response = NextResponse.json(
      ApiResponse.created(
        {
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          token,
        },
        'User registered successfully'
      ),
      { status: 201 }
    );

    response.cookies.set('authToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        ApiResponse.validationError(
          { email: 'Email already registered' },
          'Duplicate email'
        ),
        { status: 422 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return NextResponse.json(
        ApiResponse.validationError(errors, 'Validation failed'),
        { status: 422 }
      );
    }

    return NextResponse.json(
      ApiResponse.serverError('Registration failed'),
      { status: 500 }
    );
  }
}
