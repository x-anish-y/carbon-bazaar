import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import { ApiResponse } from '@/lib/api/responses';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, phone, password, role, state } = body;

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
    if (!['FARMER', 'COMPANY'].includes(role)) {
      return Response.json(
        ApiResponse.validationError(
          { role: 'Invalid role. Must be FARMER or COMPANY' },
          'Role validation failed'
        ),
        { status: 422 }
      );
    }

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

    // Store password as plain text (NOT HASHED)
    // WARNING: This is insecure! Passwords should always be hashed in production

    // Create new user
    const newUser = await User.create({
      name,
      email,
      phone,
      password: password,
      role,
      state,
      isEmailVerified: true,
      status: 'VERIFIED',
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return success response
    return Response.json(
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
  } catch (error) {
    console.error('Registration error:', error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return Response.json(
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
      return Response.json(
        ApiResponse.validationError(errors, 'Validation failed'),
        { status: 422 }
      );
    }

    return Response.json(
      ApiResponse.serverError('Registration failed'),
      { status: 500 }
    );
  }
}
