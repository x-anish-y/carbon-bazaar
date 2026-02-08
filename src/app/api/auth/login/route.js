import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import { ApiResponse } from '@/lib/api/responses';
import jwt from 'jsonwebtoken';

// =====================================================
// HARDCODED ADMIN CREDENTIALS (Not stored in database)
// =====================================================
const ADMIN_EMAIL = 'admin@carbonbazaar.com';
const ADMIN_PASSWORD = 'admin123';

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return Response.json(
        ApiResponse.validationError(
          { general: 'Email and password are required' },
          'Missing required fields'
        ),
        { status: 422 }
      );
    }

    // =====================================================
    // ADMIN AUTHENTICATION (Hardcoded credentials)
    // =====================================================
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { userId: 'admin', email: ADMIN_EMAIL, role: 'ADMIN', isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const responseData = {
        userId: 'admin',
        name: 'Administrator',
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        isAdmin: true,
        token,
      };

      console.log('Admin login successful');

      return Response.json(
        ApiResponse.success(
          responseData,
          'Admin login successful',
          200
        ),
        { status: 200 }
      );
    }

    // =====================================================
    // USER AUTHENTICATION (Database lookup)
    // =====================================================
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return Response.json(
        ApiResponse.error('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Verify password (plain text comparison)
    const isPasswordValid = password === user.password;

    if (!isPasswordValid) {
      return Response.json(
        ApiResponse.error('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Generate JWT token for user
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const responseData = {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      state: user.state,
      isEmailVerified: user.isEmailVerified,
      token,
    };

    console.log('User login successful:', user.email);

    // Return success response
    return Response.json(
      ApiResponse.success(
        responseData,
        'Login successful',
        200
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      ApiResponse.serverError('An error occurred during login'),
      { status: 500 }
    );
  }
}
