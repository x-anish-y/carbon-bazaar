import mongoose from 'mongoose';

const landVerificationSchema = new mongoose.Schema(
  {
    // Reference to the listing being verified
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarbonListing',
      required: true,
      index: true,
    },

    // Farmer's declared data about the land
    farmerDeclaredData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
      validate: {
        validator: function (v) {
          // Ensure it's an object with expected fields
          return v && typeof v === 'object' && !Array.isArray(v);
        },
        message: 'Farmer declared data must be a non-empty object',
      },
    },

    // AI/System observed data from satellite imagery or other sources
    aiObservedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v) {
          // Can be null/empty if not yet analyzed
          return v === undefined || v === null || (typeof v === 'object' && !Array.isArray(v));
        },
        message: 'AI observed data must be an object or null',
      },
    },

    // Match percentage between declared and observed data (0-100)
    matchPercentage: {
      type: Number,
      min: [0, 'Match percentage cannot be less than 0'],
      max: [100, 'Match percentage cannot exceed 100'],
      validate: {
        validator: function (v) {
          if (v === undefined || v === null) return true; // Can be null if not yet calculated
          return /^\d+(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Match percentage must be between 0 and 100 with max 2 decimal places',
      },
    },

    // Verification status
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },

    // Reason for rejection (if status is REJECTED)
    rejectionReason: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (this.status === 'REJECTED') {
            return v && v.trim().length > 0;
          }
          return true;
        },
        message: 'Rejection reason is required when status is REJECTED',
      },
    },

    // Metadata about the verification process
    verificationMetadata: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      verificationDate: {
        type: Date,
        default: null,
      },
      verificationMethod: {
        type: String,
        enum: ['MANUAL_REVIEW', 'MANUAL_ADMIN_REVIEW', 'AI_ANALYSIS', 'SATELLITE_IMAGERY', 'FIELD_VISIT', 'AUTOMATED'],
        default: 'MANUAL_REVIEW',
      },
      notes: {
        type: String,
        default: null,
      },
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Exclude sensitive fields
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient querying
landVerificationSchema.index({ createdAt: -1 });
landVerificationSchema.index({ status: 1, createdAt: -1 });
landVerificationSchema.index({ 'verificationMetadata.verifiedBy': 1 });

export default mongoose.models.LandVerification || mongoose.model('LandVerification', landVerificationSchema);
