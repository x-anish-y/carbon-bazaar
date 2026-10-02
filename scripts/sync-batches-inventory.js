import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/db/mongodb.js';
import CarbonListing from '../src/models/CarbonListing.js';
import CarbonBatch from '../src/models/CarbonBatch.js';

async function sync() {
  await connectDB();
  const listings = await CarbonListing.find({ status: 'ACTIVE' });
  for (const l of listings) {
    if (l.batchId) {
      await CarbonBatch.updateOne(
        { _id: l.batchId },
        { $set: { availableCredits: l.availableCredits } }
      );
    }
  }
  console.log('✓ Synced all active batches with active listings');
  process.exit(0);
}

sync().catch(e => { console.error(e); process.exit(1); });
