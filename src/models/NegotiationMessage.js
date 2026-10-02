import mongoose from 'mongoose';

const negotiationMessageSchema = new mongoose.Schema(
  {
    // Related Trade Offer
    tradeOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TradeOffer',
      required: true,
      index: true,
    },

    // Message Details
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    senderRole: {
      type: String,
      enum: ['BUYER', 'SELLER'],
      required: true,
    },

    // Message Content
    messageType: {
      type: String,
      enum: ['TEXT', 'OFFER', 'COUNTER_OFFER', 'ACCEPT', 'REJECT'],
      default: 'TEXT',
    },

    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      trim: true,
    },

    // Optional: For offer/counter-offer messages
    proposedPrice: {
      type: Number,
      min: [0.01, 'Price must be at least ₹0.01'],
      max: [10000, 'Price cannot exceed ₹10,000 per credit'],
    },

    proposedCredits: {
      type: Number,
      min: 0.01,
    },

    // Optional: For rejection messages
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      trim: true,
    },

    // Attachments (optional - URLs or file paths)
    attachments: [
      {
        fileType: {
          type: String,
          enum: ['DOCUMENT', 'IMAGE', 'OTHER'],
        },
        fileUrl: String,
        fileName: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We're handling timestamps manually
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for efficient querying
negotiationMessageSchema.index({ tradeOfferId: 1, createdAt: -1 });
negotiationMessageSchema.index({ senderId: 1, isRead: 1 });

// Middleware to track read status
negotiationMessageSchema.pre('save', function () {
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
});


export default mongoose.models.NegotiationMessage || mongoose.model('NegotiationMessage', negotiationMessageSchema);
