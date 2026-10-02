import crypto from 'crypto';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuthWithRole } from '@/middleware/auth';
import { mintCreditBatch } from '@/lib/blockchain/carbonService';
import { ensureWallet } from '@/lib/blockchain/wallet';
import CarbonBatch from '@/models/CarbonBatch';
import CarbonListing from '@/models/CarbonListing';
import LandVerification from '@/models/LandVerification';
import User from '@/models/User';

/**
 * POST /api/blockchain/mint
 * Mint a new carbon credit batch on-chain.
 * Admin-only endpoint, called after land verification is approved.
 *
 * Body: { listingId, landVerificationId }
 */
export async function POST(request) {
  try {
    await dbConnect();

    // Admin-only
    const auth = verifyAuthWithRole(request, ['ADMIN']);
    if (auth.error) {
      return Response.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { listingId, landVerificationId } = await request.json();

    if (!listingId) {
      return Response.json(
        { success: false, message: 'listingId is required' },
        { status: 400 }
      );
    }

    // Fetch listing
    const listing = await CarbonListing.findById(listingId).populate('sellerId');
    if (!listing) {
      return Response.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if listing is already tokenized
    if (listing.isTokenized) {
      return Response.json(
        { success: false, message: 'Listing is already tokenized' },
        { status: 409 }
      );
    }

    // Fetch land verification if provided (optional)
    let verification = null;
    if (landVerificationId) {
      verification = await LandVerification.findById(landVerificationId);
    }

    // Ensure the seller has a wallet
    const seller = await User.findById(listing.sellerId._id).select('+wallet.encryptedPrivateKey');
    if (!seller) {
      return Response.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    const { address: issuerAddress } = await ensureWallet(seller);

    // Compute verification hash from listing and verification data
    const verificationData = JSON.stringify({
      listingId: listing._id.toString(),
      sellerId: listing.sellerId._id.toString(),
      creditType: listing.creditType || 'BASELINE',
      verifiedAt: new Date().toISOString(),
    });
    const verificationHash = crypto
      .createHash('sha256')
      .update(verificationData)
      .digest('hex');

    // Compute project hash
    const projectData = JSON.stringify({
      sellerId: listing.sellerId._id.toString(),
      creditType: listing.creditType || 'BASELINE',
      cropType: listing.cropType,
      state: listing.state,
      month: listing.month,
      methodology: listing.methodology,
      creditsAmount: listing.creditsAmount,
      areaInHectares: listing.areaInHectares,
    });
    const projectHash = `sha256:${crypto.createHash('sha256').update(projectData).digest('hex')}`;

    // Generate project ID
    const projectId = `CB-${new Date().getFullYear()}-${listing.state || 'IN'}-${listing._id.toString().slice(-6).toUpperCase()}`;

    // Metadata URI (in production, upload to IPFS or your API)
    const metadataURI = `https://api.carbonbazaar.in/metadata/${projectId}`;

    // Create CarbonBatch record (pending mint)
    const batch = new CarbonBatch({
      projectId,
      issuerId: listing.sellerId._id,
      totalCredits: listing.creditsAmount,
      availableCredits: listing.creditsAmount,
      creditType: listing.creditType || 'BASELINE',
      cropType: listing.cropType,
      methodology: listing.methodology,
      verificationHash,
      projectHash,
      geography: {
        state: listing.state,
      },
      vintage: listing.month,
      status: 'PENDING_MINT',
      listingIds: [listing._id],
      landVerificationId: verification?._id || undefined,
      metadataURI,
    });

    await batch.save();

    // Find next unique sequential tokenId
    const lastBatch = await CarbonBatch.findOne({ tokenId: { $exists: true, $ne: null } })
      .sort({ tokenId: -1 })
      .lean();
    const nextTokenId = (lastBatch && typeof lastBatch.tokenId === 'number' && lastBatch.tokenId >= 1000)
      ? lastBatch.tokenId + 1
      : 1001;

    // Mint on-chain
    let mintResult;
    try {
      mintResult = await mintCreditBatch({
        issuerAddress,
        amount: listing.creditsAmount,
        projectHash,
        metadataURI,
        suggestedTokenId: nextTokenId,
      });
    } catch (mintError) {
      // Update batch status to reflect failed mint
      batch.status = 'VERIFIED'; // Revert to pre-mint state
      await batch.save();

      console.error('On-chain mint failed:', mintError.message);
      return Response.json(
        { success: false, message: 'On-chain minting failed: ' + mintError.message },
        { status: 500 }
      );
    }

    // Update batch with on-chain data
    batch.tokenId = mintResult.tokenId;
    batch.contractAddress = mintResult.contractAddress;
    batch.mintTxHash = mintResult.txHash;
    batch.mintBlockNumber = mintResult.blockNumber;
    batch.status = 'MINTED';
    await batch.save();

    // Update listing with blockchain reference
    listing.batchId = batch._id;
    listing.tokenId = mintResult.tokenId;
    listing.contractAddress = mintResult.contractAddress;
    listing.isTokenized = true;
    await listing.save();

    return Response.json(
      {
        success: true,
        message: 'Carbon credit batch minted successfully',
        data: {
          batch: {
            _id: batch._id,
            projectId: batch.projectId,
            tokenId: batch.tokenId,
            contractAddress: batch.contractAddress,
            mintTxHash: batch.mintTxHash,
            totalCredits: batch.totalCredits,
            status: batch.status,
          },
          listing: {
            _id: listing._id,
            isTokenized: listing.isTokenized,
            tokenId: listing.tokenId,
          },
          issuerWallet: issuerAddress,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Mint error:', error);
    return Response.json(
      { success: false, message: 'Failed to mint carbon credits: ' + error.message },
      { status: 500 }
    );
  }
}
