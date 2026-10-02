import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import connectDB from '../src/lib/db/mongodb.js';
import CarbonListing from '../src/models/CarbonListing.js';
import CarbonBatch from '../src/models/CarbonBatch.js';

async function check() {
  await connectDB();
  const batchIds = [
    '6a8324edcfd0b535f35a118e',
    '6a8324eecfd0b535f35a1196',
    '6a8324eecfd0b535f35a119e',
    '6a8324eecfd0b535f35a11a2',
    '6a8324eecfd0b535f35a11a6'
  ];
  for (const id of batchIds) {
    const b = await CarbonBatch.findById(id);
    const listings = await CarbonListing.find({
      $or: [{ batchId: b._id }, { _id: { $in: b.listingIds || [] } }]
    });
    console.log('Batch ID:', b._id, 'Project:', b.projectId, 'Listings found:', listings.map(l => ({ id: l._id, status: l.status, sellerId: l.sellerId, batchId: l.batchId })));
  }
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
