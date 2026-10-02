import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/db/mongodb.js';
import CarbonListing from '../src/models/CarbonListing.js';
import CarbonBatch from '../src/models/CarbonBatch.js';

async function syncAll() {
  await connectDB();
  const listings = await CarbonListing.find({});
  for (const l of listings) {
    if (l.batchId) {
      if (l.status === 'SOLD_OUT' || l.availableCredits === 0) {
        await CarbonBatch.updateOne(
          { _id: l.batchId },
          { $set: { availableCredits: 0, status: 'FULLY_SOLD' } }
        );
      } else if (l.status === 'ACTIVE') {
        await CarbonBatch.updateOne(
          { _id: l.batchId },
          { $set: { availableCredits: l.availableCredits, status: 'MINTED' } }
        );
      }
    }
  }
  console.log('✓ Successfully synchronized all batch statuses and available credits with listings.');
  process.exit(0);
}

syncAll().catch(e => { console.error(e); process.exit(1); });
