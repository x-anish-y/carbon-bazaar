import mongoose from 'mongoose';

const carbonListingSchema = new mongoose.Schema(
  {
    // Seller Information
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    sellerType: {
      type: String,
      enum: ['FARMER', 'COMPANY'],
      required: true,
      default: 'FARMER',
    },

    // Legacy field for backward compatibility (kept as alias)
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Listing Details
    month: {
      type: String, // YYYY-MM format (e.g., "2026-02")
      required: true,
      validate: {
        validator: (v) => /^\d{4}-\d{2}$/.test(v),
        message: 'Month must be in YYYY-MM format',
      },
    },

    creditsAmount: {
      type: Number, // Amount in tCO2e (tonnes CO2 equivalent)
      required: true,
      min: [0.01, 'Credits amount must be greater than 0'],
      max: [1000000, 'Credits amount cannot exceed 1,000,000 tCO2e'],
      validate: {
        validator: function (v) {
          return /^\d+(\.\d{1,4})?$/.test(v.toString());
        },
        message: 'Credits amount must have maximum 4 decimal places',
      },
    },

    pricePerCredit: {
      type: Number, // Price in INR
      required: true,
      min: [1, 'Price must be at least ₹1'],
      max: [10000, 'Price cannot exceed ₹10,000 per credit'],
      validate: {
        validator: function (v) {
          return /^\d+(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Price must have maximum 2 decimal places',
      },
    },

    // Agricultural Information
    cropType: {
      type: String,
      enum: ['RICE', 'WHEAT', 'SUGARCANE', 'PULSES'], // INDIA-SPECIFIC: Only these crops allowed
      required: true,
      index: true,
    },

    // INDIA-SPECIFIC: State information
    state: {
      type: String,
      enum: [
        'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'CT', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP',
        'JK', 'JH', 'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
        'SK', 'TN', 'TG', 'TR', 'UP', 'UK', 'WB'
      ],
      required: true,
      index: true,
    },

    // Land Details (optional but helpful)
    areaInHectares: {
      type: Number,
      min: [0.1, 'Area must be at least 0.1 hectares'],
      max: [10000, 'Area cannot exceed 10,000 hectares'],
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^\d+(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Area must have maximum 2 decimal places',
      },
    },

    // Description and Details
    description: {
      type: String,
      required: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      trim: true,
    },

    // Methodology (optional - how credits were generated)
    methodology: {
      type: String,
      enum: ['REGENERATIVE_AGRICULTURE', 'CROP_ROTATION', 'AGROFORESTRY', 'CONSERVATION_TILLAGE', 'OTHER'],
    },

    // Listing Status
    status: {
      type: String,
      enum: ['ACTIVE', 'SOLD_OUT', 'DELISTED'],
      default: 'ACTIVE',
      index: true,
    },

    // Availability
    availableCredits: {
      type: Number, // How many credits are still available
      required: true,
      validate: {
        validator: function (v) {
          return v <= this.creditsAmount;
        },
        message: 'Available credits cannot exceed total credits amount',
      },
    },

    // Images (optional - URLs for verification)
    images: [
      {
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Verification Documents
    verificationDocuments: [
      {
        documentType: {
          type: String,
          enum: ['CARBON_AUDIT', 'LAND_CERTIFICATE', 'FARM_PHOTO', 'OTHER'],
        },
        documentUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Social Proof
    totalSold: {
      type: Number,
      default: 0,
      min: 0,
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Admin moderation
    flagged: {
      type: Boolean,
      default: false,
      index: true,
    },

    adminNotes: {
      type: String,
      default: null,
    },

    adminAction: {
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      action: String, // DELIST, ACTIVATE, etc.
      timestamp: Date,
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

    listedUntil: {
      type: Date, // When the listing expires
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

// Composite index for seller and month (prevent duplicate listings)
carbonListingSchema.index({ sellerId: 1, month: 1 }, { unique: true, sparse: true });

// Legacy index for farmer queries
carbonListingSchema.index({ farmerId: 1, month: 1 }, { sparse: true });

// Index for searching listings
carbonListingSchema.index({ cropType: 1, status: 1 });
carbonListingSchema.index({ pricePerCredit: 1 });
carbonListingSchema.index({ createdAt: -1 });
carbonListingSchema.index({ sellerType: 1 });

export default mongoose.models.CarbonListing || mongoose.model('CarbonListing', carbonListingSchema);
