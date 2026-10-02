import mongoose from 'mongoose';

/**
 * CarbonBatch represents a verified, tokenized carbon credit batch.
 *
 * This is the core asset model that links off-chain verification
 * to on-chain token ownership. A CarbonBatch is created when:
 * 1. A farmer/company submits land verification
 * 2. Admin approves the verification
 * 3. Backend mints an ERC-1155 token on Polygon
 *
 * Listings reference batches (a listing is a "sell intent" against a batch).
 * The canonical ownership is on-chain; MongoDB tracks metadata and references.
 */
const carbonBatchSchema = new mongoose.Schema(
  {
    // ── Project Identity ───────────────────────────────────────────

    /** Unique project identifier (e.g., "CB-2026-MH-001") */
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    /** The farmer/company who produced these credits */
    issuerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── On-chain Data ──────────────────────────────────────────────

    /** ERC-1155 token ID on the smart contract */
    tokenId: {
      type: Number,
      sparse: true,
    },

    /** Smart contract address */
    contractAddress: {
      type: String,
      trim: true,
    },

    /** Transaction hash of the mint operation */
    mintTxHash: {
      type: String,
      trim: true,
    },

    /** Block number where the mint occurred */
    mintBlockNumber: {
      type: Number,
    },

    // ── Batch Details ──────────────────────────────────────────────

    /** Total credits in this batch (tCO2e) */
    totalCredits: {
      type: Number,
      required: true,
      min: [0.01, 'Total credits must be greater than 0'],
    },

    /** Credits still available for listing/sale */
    availableCredits: {
      type: Number,
      required: true,
      min: 0,
    },

    /** Credits that have been retired (burned on-chain) */
    retiredCredits: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Provenance ─────────────────────────────────────────────────

    /** Carbon sequestration methodology */
    methodology: {
      type: String,
      enum: [
        'REGENERATIVE_AGRICULTURE',
        'CROP_ROTATION',
        'AGROFORESTRY',
        'CONSERVATION_TILLAGE',
        'OTHER',
      ],
    },

    /** SHA-256 hash of the verification documents */
    verificationHash: {
      type: String,
      trim: true,
    },

    /** Hash of project metadata stored on-chain */
    projectHash: {
      type: String,
      trim: true,
    },

    /** Geography information */
    geography: {
      state: {
        type: String,
        enum: [
          'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'CT', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HR', 'HP',
          'JK', 'JH', 'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
          'SK', 'TN', 'TG', 'TR', 'UP', 'UK', 'WB',
        ],
      },
      coordinates: {
        type: [Number], // [latitude, longitude]
      },
    },

    /** Credit vintage (year or year-month) */
    vintage: {
      type: String,
      trim: true,
    },

    /** Serial number range */
    serialStart: {
      type: String,
      trim: true,
    },

    serialEnd: {
      type: String,
      trim: true,
    },

    /** Credit Quality Tier */
    creditType: {
      type: String,
      enum: ['PREMIUM', 'MEDIUM', 'BASELINE'],
      default: 'BASELINE',
    },

    /** Crop type associated with these credits (Deprecated) */
    cropType: {
      type: String,
    },

    // ── Lifecycle ──────────────────────────────────────────────────

    /** Current status of this batch */
    status: {
      type: String,
      enum: [
        'PENDING_VERIFICATION', // Land verification submitted
        'VERIFIED',             // Admin approved, not yet minted
        'PENDING_MINT',         // Mint transaction submitted
        'MINTED',               // Successfully minted on-chain
        'PARTIALLY_SOLD',       // Some credits sold
        'FULLY_SOLD',           // All credits sold
        'RETIRED',              // All credits retired
      ],
      default: 'PENDING_VERIFICATION',
      index: true,
    },

    // ── References ─────────────────────────────────────────────────

    /** Listings that sell from this batch */
    listingIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarbonListing',
    }],

    /** Land verification that backs this batch */
    landVerificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LandVerification',
    },

    // ── Metadata URI for on-chain reference ────────────────────────

    /** URI pointing to the full batch metadata JSON */
    metadataURI: {
      type: String,
      trim: true,
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
carbonBatchSchema.index({ issuerId: 1, status: 1 });
carbonBatchSchema.index({ tokenId: 1, contractAddress: 1 });
carbonBatchSchema.index({ status: 1, createdAt: -1 });
export default mongoose.models.CarbonBatch || mongoose.model('CarbonBatch', carbonBatchSchema);
