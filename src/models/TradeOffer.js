import mongoose from 'mongoose';

const tradeOfferSchema = new mongoose.Schema(
  {
    // Parties Involved
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Listing Information
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarbonListing',
      required: true,
      index: true,
    },

    // Credits and Pricing
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

    // Original listing price (reference)
    originalPricePerCredit: {
      type: Number,
      required: true,
    },

    // Current negotiated price
    negotiatedPricePerCredit: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be at least ₹0.01'],
      max: [10000, 'Price cannot exceed ₹10,000 per credit'],
    },

    // Calculated totals
    originalTotalPrice: {
      type: Number,
      required: true,
    },

    negotiatedTotalPrice: {
      type: Number,
      required: true,
    },

    // Discount percentage (if negotiated lower than original)
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Trade Status
    status: {
      type: String,
      enum: ['OFFERED', 'COUNTER_OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'COMPLETED', 'CANCELLED', 'SETTLING', 'SETTLED', 'RETIRED'],
      default: 'OFFERED',
      index: true,
    },

    // Who made the last offer (for tracking counter-offers)
    lastOfferedBy: {
      type: String,
      enum: ['BUYER', 'SELLER'],
      default: 'BUYER',
    },

    // Acceptance/Rejection Details
    respondedAt: {
      type: Date,
    },

    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    responseReason: {
      type: String,
      maxlength: [500, 'Response reason cannot exceed 500 characters'],
      trim: true,
    },

    // Transaction Reference (Razorpay payment ID)
    transactionId: {
      type: String,
    },

    // Blockchain Settlement
    settlementTxHash: {
      type: String, // On-chain transfer transaction hash
      trim: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarbonBatch',
    },

    tokenId: {
      type: Number, // ERC-1155 token ID
    },

    settled: {
      type: Boolean, // Whether on-chain transfer has been executed
      default: false,
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
      type: Date, // Offer expires after 14 days
      default: function () {
        const date = new Date();
        date.setDate(date.getDate() + 14);
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

// Calculate totals and discount on save
tradeOfferSchema.pre('save', function () {
  if (this.creditsRequested && this.negotiatedPricePerCredit) {
    this.negotiatedTotalPrice = Math.round(this.creditsRequested * this.negotiatedPricePerCredit * 100) / 100;
  }

  if (this.originalPricePerCredit && this.negotiatedPricePerCredit) {
    const discount = ((this.originalPricePerCredit - this.negotiatedPricePerCredit) / this.originalPricePerCredit) * 100;
    this.discountPercentage = Math.max(0, Math.round(discount * 100) / 100);
  }

  this.updatedAt = new Date();
});

// Indexes
tradeOfferSchema.index({ buyerId: 1, status: 1 });
tradeOfferSchema.index({ sellerId: 1, status: 1 });
tradeOfferSchema.index({ listingId: 1, status: 1 });
tradeOfferSchema.index({ createdAt: -1 });
tradeOfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.models.TradeOffer || mongoose.model('TradeOffer', tradeOfferSchema);
