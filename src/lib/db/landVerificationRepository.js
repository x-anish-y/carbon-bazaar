import LandVerification from '@/models/LandVerification';
import CarbonListing from '@/models/CarbonListing';

/**
 * LandVerificationRepository
 * Provides data access layer for LandVerification operations
 */

export class LandVerificationRepository {
  /**
   * Create a new land verification record
   * @param {Object} data - Verification data
   * @returns {Promise<Object>} Created verification document
   */
  static async create(data) {
    const verification = await LandVerification.create(data);
    return verification.toJSON();
  }

  /**
   * Find verification by ID
   * @param {String} id - Verification ID
   * @returns {Promise<Object>} Verification document
   */
  static async findById(id) {
    const verification = await LandVerification.findById(id)
      .populate('listingId')
      .populate('verificationMetadata.verifiedBy', 'email name');
    return verification ? verification.toJSON() : null;
  }

  /**
   * Find verification by listing ID
   * @param {String} listingId - Listing ID
   * @returns {Promise<Object>} Verification document
   */
  static async findByListingId(listingId) {
    const verification = await LandVerification.findOne({ listingId })
      .populate('listingId')
      .populate('verificationMetadata.verifiedBy', 'email name');
    return verification ? verification.toJSON() : null;
  }

  /**
   * Find all verifications with filters and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Array>} Array of verification documents
   */
  static async findMany(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = -1,
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder };

    const verifications = await LandVerification.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('listingId')
      .populate('verificationMetadata.verifiedBy', 'email name');

    return verifications.map(v => v.toJSON());
  }

  /**
   * Count verifications matching filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Number>} Count of matching documents
   */
  static async count(filters = {}) {
    return await LandVerification.countDocuments(filters);
  }

  /**
   * Update verification by ID
   * @param {String} id - Verification ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated verification document
   */
  static async updateById(id, data) {
    const verification = await LandVerification.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('listingId')
      .populate('verificationMetadata.verifiedBy', 'email name');

    return verification ? verification.toJSON() : null;
  }

  /**
   * Approve a verification
   * @param {String} id - Verification ID
   * @param {String} verifiedById - ID of user performing verification
   * @param {String} verificationMethod - Method used for verification
   * @param {String} notes - Additional notes
   * @returns {Promise<Object>} Updated verification document
   */
  static async approve(id, verifiedById, verificationMethod = 'MANUAL_REVIEW', notes = null) {
    const update = {
      status: 'APPROVED',
      'verificationMetadata.verificationDate': new Date(),
      'verificationMetadata.verificationMethod': verificationMethod,
      'verificationMetadata.notes': notes,
    };

    if (verifiedById) {
      update['verificationMetadata.verifiedBy'] = verifiedById;
    }

    return this.updateById(id, update);
  }

  /**
   * Reject a verification
   * @param {String} id - Verification ID
   * @param {String} reason - Rejection reason
   * @param {String} verifiedById - ID of user performing verification
   * @param {String} verificationMethod - Method used for verification
   * @param {String} notes - Additional notes
   * @returns {Promise<Object>} Updated verification document
   */
  static async reject(id, reason, verifiedById, verificationMethod = 'MANUAL_REVIEW', notes = null) {
    const update = {
      status: 'REJECTED',
      rejectionReason: reason,
      'verificationMetadata.verificationDate': new Date(),
      'verificationMetadata.verificationMethod': verificationMethod,
      'verificationMetadata.notes': notes,
    };

    if (verifiedById) {
      update['verificationMetadata.verifiedBy'] = verifiedById;
    }

    return this.updateById(id, update);
  }

  /**
   * Get verification statistics
   * @returns {Promise<Object>} Statistics object
   */
  static async getStatistics() {
    const stats = await LandVerification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgMatchPercentage: { $avg: '$matchPercentage' },
        },
      },
    ]);

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      avgMatchPercentage: 0,
      total: 0,
    };

    let totalMatch = 0;
    let countWithMatch = 0;

    stats.forEach(stat => {
      result[stat._id.toLowerCase()] = stat.count;
      result.total += stat.count;
      if (stat.avgMatchPercentage !== null) {
        totalMatch += stat.avgMatchPercentage * stat.count;
        countWithMatch += stat.count;
      }
    });

    if (countWithMatch > 0) {
      result.avgMatchPercentage = Math.round((totalMatch / countWithMatch) * 100) / 100;
    }

    return result;
  }

  /**
   * Delete verification by ID
   * @param {String} id - Verification ID
   * @returns {Promise<Boolean>} True if deleted, false if not found
   */
  static async deleteById(id) {
    const result = await LandVerification.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Get verifications pending review
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Pending verification documents
   */
  static async getPending(options = {}) {
    return this.findMany({ status: 'PENDING' }, options);
  }

  /**
   * Get all verifications for a listing
   * @param {String} listingId - Listing ID
   * @returns {Promise<Array>} All verification documents for listing
   */
  static async getByListingId(listingId) {
    return this.findMany({ listingId });
  }

  /**
   * Check if a listing has been verified
   * @param {String} listingId - Listing ID
   * @returns {Promise<Object>} Verification status object
   */
  static async getListingVerificationStatus(listingId) {
    const verification = await this.findByListingId(listingId);

    if (!verification) {
      return {
        verified: false,
        status: null,
        matchPercentage: null,
      };
    }

    return {
      verified: verification.status === 'APPROVED',
      status: verification.status,
      matchPercentage: verification.matchPercentage,
      verificationId: verification._id,
    };
  }
}

export default LandVerificationRepository;
