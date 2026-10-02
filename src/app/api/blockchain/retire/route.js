import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import { verifyAuth } from '@/middleware/auth';
import { retireCredits as retireOnChain } from '@/lib/blockchain/carbonService';
import { ensureWallet } from '@/lib/blockchain/wallet';
import CarbonBatch from '@/models/CarbonBatch';
import RetirementRecord from '@/models/RetirementRecord';
import User from '@/models/User';

/**
 * POST /api/blockchain/retire
 * Retire (burn) carbon credits on-chain for carbon offset.
 *
 * Body: { batchId, amount, reason, description, beneficiary }
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (authError) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { batchId, amount, reason, description, beneficiary } = await request.json();

    if (!batchId || !amount) {
      return Response.json(
        { success: false, message: 'batchId and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return Response.json(
        { success: false, message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Fetch batch
    const batch = await CarbonBatch.findById(batchId);
    if (!batch || !batch.tokenId) {
      return Response.json(
        { success: false, message: 'Carbon batch not found or not minted' },
        { status: 404 }
      );
    }

    // Ensure user has a wallet
    let userDoc;
    if (mongoose.Types.ObjectId.isValid(user.userId)) {
      userDoc = await User.findById(user.userId).select('+wallet.encryptedPrivateKey');
    } else {
      userDoc = await User.findOne({ role: 'ADMIN' }).select('+wallet.encryptedPrivateKey');
    }

    if (!userDoc) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (userDoc.role === 'SELLER' || userDoc.role === 'FARMER') {
      return Response.json(
        { success: false, message: 'Credit retirement is reserved for buyers and corporate entities to offset emissions.' },
        { status: 403 }
      );
    }

    const { address: holderAddress } = await ensureWallet(userDoc);

    // Create retirement record (pending)
    const retirement = new RetirementRecord({
      batchId: batch._id,
      tokenId: batch.tokenId,
      retiredBy: userDoc._id,
      amount,
      retirementTxHash: 'pending', // Will be updated after on-chain tx
      retirementReason: reason || 'VOLUNTARY_OFFSET',
      retirementDescription: description || '',
      beneficiary: beneficiary || '',
      status: 'PENDING',
    });

    await retirement.save();

    // Execute on-chain retirement (burn)
    let retireResult;
    try {
      retireResult = await retireOnChain({
        holderAddress,
        tokenId: batch.tokenId,
        amount,
      });
    } catch (txError) {
      retirement.status = 'FAILED';
      retirement.errorMessage = txError.message;
      await retirement.save();

      console.error('On-chain retirement failed:', txError.message);
      return Response.json(
        { success: false, message: 'On-chain retirement failed: ' + txError.message },
        { status: 500 }
      );
    }

    // Update retirement record and batch
    retirement.retirementTxHash = retireResult.txHash;
    retirement.retirementBlockNumber = retireResult.blockNumber;
    retirement.status = 'CONFIRMED';
    retirement.confirmedAt = new Date();
    await retirement.save();

    batch.retiredCredits = (batch.retiredCredits || 0) + amount;
    if (batch.retiredCredits >= batch.totalCredits) {
      batch.status = 'RETIRED';
    }
    await batch.save();

    return Response.json(
      {
        success: true,
        message: 'Credits retired successfully',
        data: {
          retirementId: retirement._id,
          retirementTxHash: retireResult.txHash,
          blockNumber: retireResult.blockNumber,
          tokenId: batch.tokenId,
          amount,
          beneficiary: beneficiary || 'Self',
          reason: reason || 'VOLUNTARY_OFFSET',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Retirement error:', error);
    return Response.json(
      { success: false, message: 'Retirement failed: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/retire
 * Get retirement records for the authenticated user.
 */
export async function GET(request) {
  try {
    await dbConnect();

    const { user, error: authError } = verifyAuth(request);
    if (authError) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const skip = parseInt(searchParams.get('skip')) || 0;

    const records = await RetirementRecord.find({ retiredBy: user.userId })
      .populate('batchId', 'projectId tokenId contractAddress cropType')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await RetirementRecord.countDocuments({ retiredBy: user.userId });

    return Response.json({
      success: true,
      data: records,
      pagination: { total, limit, skip, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get retirements error:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch retirement records' },
      { status: 500 }
    );
  }
}
