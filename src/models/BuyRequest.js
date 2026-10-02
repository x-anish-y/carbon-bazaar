import mongoose from 'mongoose';

const buyRequestSchema = new mongoose.Schema(
  {
    // Buyer Information
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Listing being purchased
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarbonListing',
      required: true,
      index: true,
    },

    // Seller information (denormalized for quick access)
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    sellerType: {
      type: String,
      enum: ['SELLER', 'BUYER', 'FARMER', 'COMPANY'],
      required: true,
      default: 'SELLER',
      set: function (val) {
        if (val === 'FARMER') return 'SELLER';
        if (val === 'COMPANY') return 'BUYER';
        return val;
      },
    },

    // Purchase Details
    creditsRequested: {
      type: Number, // Amount in tCO2e
      required: true,
      min: [0.01, 'Credits requested must be greater than 0'],
      validate: {
        validator: function (v) {
          return /^\d+(\.\d{1,4})?$/.test(v.toString());
        },
        message: 'Credits must have maximum 4 decimal places',
      },
    },

    pricePerCredit: {
      type: Number, // Price in INR at time of request
      required: true,
      min: [1, 'Price must be at least ₹1'],
      max: [10000, 'Price cannot exceed ₹10,000 per credit'],
    },

    totalPrice: {
      type: Number, // Total price = creditsRequested * pricePerCredit
      required: true,
      validate: {
        validator: function (v) {
          return /^\d+(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Total price must have maximum 2 decimal places',
      },
    },

    // Request Status
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    // Notes and Communication
    buyerMessage: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      trim: true,
    },

    sellerResponse: {
      type: String,
      maxlength: [500, 'Response cannot exceed 500 characters'],
      trim: true,
    },

    // Approval/Rejection Details
    respondedAt: {
      type: Date,
    },

    // Transaction Reference (if payment completed)
    transactionId: {
      type: String, // Reference to payment gateway transaction
    },

    completedAt: {
      type: Date,
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

    expiresAt: {
      type: Date, // Request expires after 7 days if not responded
      default: function () {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
buyRequestSchema.index({ buyerId: 1, status: 1 });
buyRequestSchema.index({ sellerId: 1, status: 1 });
buyRequestSchema.index({ listingId: 1, status: 1 });
buyRequestSchema.index({ createdAt: -1 });
buyRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired requests

// Middleware to calculate total price
buyRequestSchema.pre('save', function () {
  if (this.creditsRequested && this.pricePerCredit) {
    this.totalPrice = Math.round(this.creditsRequested * this.pricePerCredit * 100) / 100;
  }
  this.updatedAt = new Date();
});

export default mongoose.models.BuyRequest || mongoose.model('BuyRequest', buyRequestSchema);
