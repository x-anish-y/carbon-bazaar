import mongoose from 'mongoose';

/**
 * RetirementRecord tracks the retirement (burning) of carbon credits.
 *
 * When a buyer retires credits:
 * 1. Credits are burned on-chain via CarbonCreditBatch.retireCredits()
 * 2. This record stores the proof (txHash, amounts, beneficiary)
 * 3. The CarbonBatch.retiredCredits counter is incremented
 *
 * This provides an auditable trail of carbon offsets.
 */
const retirementRecordSchema = new mongoose.Schema(
  {
    /** The carbon batch being retired from */
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarbonBatch',
      required: true,
      index: true,
    },

    /** ERC-1155 token ID */
    tokenId: {
      type: Number,
      required: true,
      index: true,
    },

    /** The user retiring the credits */
    retiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Number of credits retired (tCO2e) */
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Retirement amount must be greater than 0'],
    },

    /** On-chain transaction hash of the burn */
    retirementTxHash: {
      type: String,
      required: true,
      trim: true,
    },

    /** Block number of the retirement transaction */
    retirementBlockNumber: {
      type: Number,
    },

    /** Reason for retirement */
    retirementReason: {
      type: String,
      enum: [
        'CORPORATE_OFFSET',    // Company offsetting emissions
        'VOLUNTARY_OFFSET',    // Individual voluntary offset
        'COMPLIANCE',          // Regulatory compliance
        'CSR',                 // Corporate Social Responsibility
        'OTHER',
      ],
      default: 'VOLUNTARY_OFFSET',
    },

    /** Description of the offset purpose */
    retirementDescription: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
    },

    /** Who the offset is on behalf of */
    beneficiary: {
      type: String,
      maxlength: [200, 'Beneficiary name cannot exceed 200 characters'],
      trim: true,
    },

    /** Retirement confirmation status */
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },

    /** When the retirement was confirmed on-chain */
    confirmedAt: {
      type: Date,
    },

    /** Error message if retirement failed */
    errorMessage: {
      type: String,
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
retirementRecordSchema.index({ retiredBy: 1, status: 1 });
retirementRecordSchema.index({ batchId: 1, createdAt: -1 });
retirementRecordSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.RetirementRecord || mongoose.model('RetirementRecord', retirementRecordSchema);
