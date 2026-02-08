import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    documentType: {
      type: String,
      enum: ['AADHAAR', 'LAND_RECORD', 'PAN', 'GST_CERTIFICATE'],
      required: [true, 'Document type is required'],
    },
    documentNumber: {
      type: String,
      required: [true, 'Document number is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileData: {
      type: Buffer,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    adminNotes: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user and document type combination (non-unique to allow multiple uploads)
documentSchema.index({ userId: 1, documentType: 1 });

// Remove file data from JSON response
documentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.fileData;
  return obj;
};

export default mongoose.models.Document || mongoose.model('Document', documentSchema);
