import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['SELLER', 'BUYER', 'ADMIN', 'FARMER', 'COMPANY'],
      required: [true, 'Please select a role'],
      set: function (role) {
        if (role === 'FARMER') return 'SELLER';
        if (role === 'COMPANY') return 'BUYER';
        return role;
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    profile: {
      phone: String,
      companyName: String,
      businessType: String,
      location: String,
      bio: String,
      documentUrl: String,
    },
    totalIncome: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Blockchain Wallet (custodial, server-managed)
    wallet: {
      address: {
        type: String, // Public Ethereum address
        sparse: true,
        index: true,
      },
      encryptedPrivateKey: {
        type: String, // AES-256-GCM encrypted private key
        select: false, // Never returned in queries by default
      },
      createdAt: {
        type: Date,
      },
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Normalize legacy roles on toJSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.role === 'FARMER') obj.role = 'SELLER';
  if (obj.role === 'COMPANY') obj.role = 'BUYER';
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

export default mongoose.models.User || mongoose.model('User', userSchema);
