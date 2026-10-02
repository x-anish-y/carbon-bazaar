import crypto from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { verifyAuthWithRoleAndVerification } from '@/middleware/auth';
import { mintCreditBatch } from '@/lib/blockchain/carbonService';
import { ensureWallet } from '@/lib/blockchain/wallet';
import CarbonListing from '@/models/CarbonListing';
import CarbonBatch from '@/models/CarbonBatch';
import Document from '@/models/Document';
import LandVerification from '@/models/LandVerification';
import User from '@/models/User';
import { createListingSchema, updateListingSchema, validateData, validateMonth } from '@/validators/listings';

/**
 * POST /api/listings
 * Create a new carbon credit listing
 */
export async function POST(request) {
  try {
    await connectDB();

    const { user, error } = verifyAuthWithRoleAndVerification(request, ['SELLER', 'ADMIN']);
    if (error) {
      return Response.json(
        { success: false, message: 'Only Sellers can create listings. Buyers cannot sell carbon credits.' },
        { status: 403 }
      );
    }

    const userDoc = await User.findById(user.userId);
    if (!userDoc || (!userDoc.verified && !userDoc.isEmailVerified)) {
      return Response.json({ success: false, message: 'User verification required' }, { status: 403 });
    }

    if (userDoc.role === 'BUYER' || userDoc.role === 'COMPANY') {
      return Response.json(
        { success: false, message: 'Buyers cannot sell carbon credits. Only Sellers can create listings.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateData(body, createListingSchema);
    
    if (!validation.isValid) {
      return Response.json(
        { success: false, message: 'Validation error', errors: validation.errors },
        { status: 400 }
      );
    }

    const {
      month,
      creditsAmount,
      carbonCredits,
      pricePerCredit,
      creditType,
      cropType,
      description,
      projectMethodologyDescription,
      areaInHectares,
      methodology,
      state,
    } = validation.value;

    const numCredits = creditsAmount || carbonCredits;
    const finalDesc = (description || projectMethodologyDescription || '').trim();
    const finalCreditType = creditType ? creditType.toUpperCase() : 'BASELINE';

    const monthValidation = validateMonth(month);
    if (!monthValidation.isValid) {
      return Response.json({ success: false, message: monthValidation.message }, { status: 400 });
    }

    // Ensure seller has initial credits and check available in-hand balance
    const { ensureSellerInitialCredits, getSellerCreditBreakdown } = await import('@/lib/blockchain/sellerCredits');
    await ensureSellerInitialCredits(userDoc);

    const creditBreakdown = await getSellerCreditBreakdown(user.userId);
    if (numCredits > creditBreakdown.totalOwnedInHand) {
      return Response.json(
        {
          success: false,
          message: `Insufficient in-wallet credits. You currently have ${creditBreakdown.totalOwnedInHand} tCO2e available in your wallet to list on the market.`,
        },
        { status: 400 }
      );
    }

    const listing = await CarbonListing.create({
      sellerId: user.userId,
      farmerId: user.userId,
      sellerType: userDoc.role,
      month,
      creditsAmount: numCredits,
      pricePerCredit,
      creditType: finalCreditType,
      cropType: cropType || undefined,
      description: finalDesc,
      projectMethodologyDescription: finalDesc,
      areaInHectares: areaInHectares || undefined,
      methodology: methodology || 'OTHER',
      state: state || userDoc.state || 'MH',
      availableCredits: numCredits,
    });

    // Directly mint ERC-1155 token on Polygon PoS and register batch
    try {
      const sellerWithWallet = await User.findById(user.userId).select('+wallet.encryptedPrivateKey');
      const { address: issuerAddress } = await ensureWallet(sellerWithWallet || userDoc);

      const verificationData = JSON.stringify({
        listingId: listing._id.toString(),
        sellerId: user.userId.toString(),
        creditType: finalCreditType,
        creditsAmount: numCredits,
        verifiedAt: new Date().toISOString(),
      });
      const verificationHash = crypto.createHash('sha256').update(verificationData).digest('hex');

      const projectData = JSON.stringify({
        sellerId: user.userId.toString(),
        creditType: finalCreditType,
        cropType: cropType || undefined,
        state: state || userDoc.state || 'MH',
        month,
        methodology: methodology || 'OTHER',
        creditsAmount: numCredits,
        areaInHectares: areaInHectares || undefined,
      });
      const projectHash = `sha256:${crypto.createHash('sha256').update(projectData).digest('hex')}`;

      const projectId = `CB-${new Date().getFullYear()}-${state || userDoc.state || 'MH'}-${listing._id.toString().slice(-6).toUpperCase()}`;
      const metadataURI = `https://api.carbonbazaar.in/metadata/${projectId}`;

      // Find next unique sequential tokenId
      const lastBatch = await CarbonBatch.findOne({ tokenId: { $exists: true, $ne: null } })
        .sort({ tokenId: -1 })
        .lean();
      const nextTokenId = (lastBatch && typeof lastBatch.tokenId === 'number' && lastBatch.tokenId >= 1000)
        ? lastBatch.tokenId + 1
        : 1001;

      // Mint token on Polygon
      const mintResult = await mintCreditBatch({
        issuerAddress,
        amount: numCredits,
        projectHash,
        metadataURI,
        suggestedTokenId: nextTokenId,
      });

      // Create CarbonBatch record for active marketplace listing
      const batch = await CarbonBatch.create({
        projectId,
        issuerId: user.userId,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        mintTxHash: mintResult.txHash,
        mintBlockNumber: mintResult.blockNumber,
        totalCredits: numCredits,
        availableCredits: numCredits,
        creditType: finalCreditType,
        cropType: cropType || undefined,
        methodology: methodology || 'OTHER',
        verificationHash,
        projectHash,
        geography: {
          state: state || userDoc.state || 'MH',
        },
        vintage: month,
        status: 'MINTED',
        listingIds: [listing._id],
        metadataURI,
      });

      // Deduct numCredits from seller's unlisted in-wallet batches
      let remainingToDeduct = numCredits;
      const unlistedBatches = await CarbonBatch.find({
        issuerId: user.userId,
        _id: { $ne: batch._id },
        availableCredits: { $gt: 0 },
        $or: [
          { listingIds: { $size: 0 } },
          { listingIds: { $exists: false } },
          { projectId: { $regex: /INIT/ } },
        ],
      }).sort({ createdAt: 1 });

      for (const ub of unlistedBatches) {
        if (remainingToDeduct <= 0) break;
        const deductAmount = Math.min(ub.availableCredits, remainingToDeduct);
        ub.availableCredits -= deductAmount;
        if (ub.availableCredits <= 0) {
          ub.status = 'FULLY_SOLD';
        }
        await ub.save();
        remainingToDeduct -= deductAmount;
      }

      // Update listing with token and batch metadata
      listing.batchId = batch._id;
      listing.tokenId = mintResult.tokenId;
      listing.contractAddress = mintResult.contractAddress;
      listing.isTokenized = true;
      await listing.save();
    } catch (mintError) {
      console.error('Direct minting failed during listing creation:', mintError);
    }

    return Response.json(
      { success: true, message: 'Carbon credits minted and listed successfully', data: listing },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/listings error:', error);
    return Response.json(
      { success: false, message: error.message || 'Failed to create listing' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/listings
 * Get listings with filters
 * Public endpoint - anyone can view
 */
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId') || searchParams.get('farmerId'); // Support both
    const limit = Math.min(parseInt(searchParams.get('limit')) || (sellerId ? 100 : 20), 100);
    const skip = parseInt(searchParams.get('skip')) || 0;
    const status = searchParams.get('status') || 'ACTIVE';
    const creditType = searchParams.get('creditType');
    const cropType = searchParams.get('cropType');
    const sellerType = searchParams.get('sellerType'); // Filter by SELLER / AGGREGATOR / FARMER
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const month = searchParams.get('month');
    const sortBy = searchParams.get('sortBy') || 'createdAt';

    // Build filter
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (creditType && creditType !== 'ALL') {
      filter.creditType = creditType.toUpperCase();
    }

    if (cropType && !creditType) {
      filter.cropType = cropType;
    }

    if (sellerId) {
      filter.sellerId = sellerId;
    }

    if (sellerType) {
      filter.sellerType = sellerType;
    }

    // Price filters
    if (minPrice || maxPrice) {
      filter.pricePerCredit = {};
      if (minPrice) filter.pricePerCredit.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerCredit.$lte = parseFloat(maxPrice);
    }

    // Month filter
    if (month) {
      filter.month = month;
    }

    // Valid sort options
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      cheapest: { pricePerCredit: 1 },
      expensive: { pricePerCredit: -1 },
      mostAvailable: { availableCredits: -1 },
      mostSold: { totalSold: -1 },
      rating: { averageRating: -1 },
    };

    const sortOption = sortOptions[sortBy] || sortOptions.newest;

    // Get total count for pagination
    const total = await CarbonListing.countDocuments(filter);

    // Get listings
    const listings = await CarbonListing.find(filter)
      .populate('sellerId', 'name email role verified trustStatus')
      .populate('farmerId', 'name email')
      .populate('batchId')
      .sort(sortOption)
      .limit(limit)
      .skip(skip)
      .lean();

    // Attach latest land verification status per listing (used to disable buying for pending listings)
    const listingIds = Array.from(
      new Set((listings || []).map((l) => l?._id).filter(Boolean).map((id) => id.toString()))
    );

    if (listingIds.length > 0) {
      const verifications = await LandVerification.find(
        { listingId: { $in: listingIds } },
        { listingId: 1, status: 1, createdAt: 1, updatedAt: 1 }
      )
        .sort({ createdAt: -1 })
        .lean();

      const latestStatusByListingId = {};
      for (const v of verifications) {
        const lid = v?.listingId?.toString?.();
        if (!lid) continue;
        if (latestStatusByListingId[lid]) continue; // sorted newest-first
        latestStatusByListingId[lid] = v?.status || null;
      }

      for (const listing of listings) {
        const lid = listing?._id?.toString?.();
        const landVerificationStatus = lid ? (latestStatusByListingId[lid] || null) : null;
        listing.landVerificationStatus = landVerificationStatus;
        listing.isLandVerified = landVerificationStatus === 'APPROVED';
      }
    }

    // Enrich listings with seller trust status (used by marketplace badges)
    const sellerIds = Array.from(
      new Set(
        (listings || [])
          .map((l) => l?.sellerId?._id || l?.sellerId)
          .filter(Boolean)
          .map((id) => id.toString())
      )
    );

    let trustStatusBySellerId = {};
    if (sellerIds.length > 0) {
      const docs = await Document.find(
        { userId: { $in: sellerIds } },
        { userId: 1, verificationStatus: 1 }
      )
        .lean();

      const countsByUserId = {};
      for (const doc of docs) {
        const uid = doc?.userId?.toString();
        if (!uid) continue;
        if (!countsByUserId[uid]) {
          countsByUserId[uid] = { approved: 0, pending: 0, rejected: 0 };
        }
        if (doc.verificationStatus === 'APPROVED') countsByUserId[uid].approved += 1;
        else if (doc.verificationStatus === 'REJECTED') countsByUserId[uid].rejected += 1;
        else countsByUserId[uid].pending += 1;
      }

      for (const listing of listings) {
        const sellerObj = listing?.sellerId;
        const sellerIdStr = (sellerObj?._id || listing?.sellerId)?.toString?.();
        if (!sellerIdStr) continue;

        const counts = countsByUserId[sellerIdStr] || { approved: 0, pending: 0, rejected: 0 };
        let trustStatus = 'PENDING';

        if (counts.rejected > 0) {
          trustStatus = 'CONFLICTED';
        } else if (sellerObj?.verified) {
          trustStatus = 'TRUSTED';
        } else if (counts.pending === 0 && counts.approved > 0) {
          trustStatus = 'TRUSTED';
        }

        trustStatusBySellerId[sellerIdStr] = trustStatus;

        // Attach in two convenient places without breaking existing shape
        listing.sellerTrustStatus = trustStatus;
        if (sellerObj && typeof sellerObj === 'object') {
          sellerObj.trustStatus = trustStatus;
        }
      }
    }

    return Response.json(
      {
        success: true,
        data: listings,
        pagination: {
          total,
          count: listings.length,
          skip,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get listings error:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/listings?id=[listingId]
 * Get a single listing by ID
 */
export async function GET_SINGLE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('id');

    if (!listingId) {
      return Response.json(
        { success: false, message: 'Listing ID is required' },
        { status: 400 }
      );
    }

    const listing = await CarbonListing.findById(listingId)
      .populate('sellerId', 'name email role')
      .populate('farmerId', 'name email');

    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      );
    }

    return Response.json(
      { success: true, data: listing },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get single listing error:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch listing' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/listings?id=[listingId]
 * Update a listing (only by owner FARMER or COMPANY)
 */
export async function PUT(request) {
  try {
    await connectDB();

    // Authenticate user
    const user = await verifyAuthWithRoleAndVerification(request, ['FARMER', 'COMPANY']);
    if (!user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('id');

    if (!listingId) {
      return Response.json(
        { success: false, message: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // Check listing exists
    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (listing.sellerId.toString() !== user.userId && listing.farmerId.toString() !== user.userId) {
      return Response.json(
        { success: false, message: 'You can only update your own listings' },
        { status: 403 }
      );
    }

    // Parse and validate update data
    const body = await request.json();
    const validation = validateData(body, updateListingSchema);
    if (!validation.isValid) {
      return Response.json(
        { success: false, message: 'Validation error', errors: validation.errors },
        { status: 400 }
      );
    }

    // Update listing
    Object.assign(listing, validation.value);
    await listing.save();

    return Response.json(
      {
        success: true,
        message: 'Listing updated successfully',
        data: listing,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update listing error:', error);
    return Response.json(
      { success: false, message: 'Failed to update listing' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/listings?id=[listingId]
 * Delete a listing (only by owner FARMER or COMPANY)
 */
export async function DELETE(request) {
  try {
    await connectDB();

    // Authenticate user
    const user = await verifyAuthWithRoleAndVerification(request, ['FARMER', 'COMPANY']);
    if (!user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('id');

    if (!listingId) {
      return Response.json(
        { success: false, message: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // Check listing exists
    const listing = await CarbonListing.findById(listingId);
    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (listing.sellerId.toString() !== user.userId && listing.farmerId.toString() !== user.userId) {
      return Response.json(
        { success: false, message: 'You can only delete your own listings' },
        { status: 403 }
      );
    }

    // Delete listing
    await CarbonListing.findByIdAndDelete(listingId);

    return Response.json(
      { success: true, message: 'Listing deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete listing error:', error);
    return Response.json(
      { success: false, message: 'Failed to delete listing' },
      { status: 500 }
    );
  }
}
