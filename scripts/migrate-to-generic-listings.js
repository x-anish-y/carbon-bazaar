/**
 * Database Migration Script: Migrate Listings and Batches to Generic Credit Quality Tiers
 * 
 * Backfills:
 * - creditType ('PREMIUM', 'MEDIUM', 'BASELINE')
 * - projectMethodologyDescription
 * 
 * Safely preserves legacy cropType and areaInHectares fields as deprecated.
 * 
 * Usage: node scripts/migrate-to-generic-listings.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon-bazaar';

const cropToTierMap = {
  RICE: 'PREMIUM',
  SUGARCANE: 'PREMIUM',
  WHEAT: 'MEDIUM',
  PULSES: 'MEDIUM',
  COTTON: 'BASELINE',
  MAIZE: 'BASELINE',
  SOYBEAN: 'MEDIUM',
  FRUITS: 'PREMIUM',
  OTHER: 'BASELINE',
};

async function runMigration() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Migrate CarbonListings collection
  const listingsCollection = db.collection('carbonlistings');
  const listings = await listingsCollection.find({}).toArray();
  console.log(`\nFound ${listings.length} carbon listings to inspect.`);

  let listingsUpdated = 0;
  for (const listing of listings) {
    const updates = {};
    
    // Backfill creditType if missing or invalid
    if (!listing.creditType || !['PREMIUM', 'MEDIUM', 'BASELINE'].includes(listing.creditType)) {
      const mappedTier = cropToTierMap[listing.cropType] || 'BASELINE';
      updates.creditType = mappedTier;
    }

    // Backfill projectMethodologyDescription if missing
    if (!listing.projectMethodologyDescription && listing.description) {
      updates.projectMethodologyDescription = listing.description;
    }

    // Ensure creditsAmount is present
    if (!listing.creditsAmount && listing.creditsEarned) {
      updates.creditsAmount = listing.creditsEarned;
    }

    if (Object.keys(updates).length > 0) {
      await listingsCollection.updateOne(
        { _id: listing._id },
        { $set: updates }
      );
      listingsUpdated++;
    }
  }
  console.log(`✓ CarbonListings migration complete: ${listingsUpdated}/${listings.length} documents updated.`);

  // 2. Migrate CarbonBatches collection
  const batchesCollection = db.collection('carbonbatches');
  const batches = await batchesCollection.find({}).toArray();
  console.log(`\nFound ${batches.length} carbon batches to inspect.`);

  let batchesUpdated = 0;
  for (const batch of batches) {
    const updates = {};

    if (!batch.creditType || !['PREMIUM', 'MEDIUM', 'BASELINE'].includes(batch.creditType)) {
      const mappedTier = cropToTierMap[batch.cropType] || 'BASELINE';
      updates.creditType = mappedTier;
    }

    if (Object.keys(updates).length > 0) {
      await batchesCollection.updateOne(
        { _id: batch._id },
        { $set: updates }
      );
      batchesUpdated++;
    }
  }
  console.log(`✓ CarbonBatches migration complete: ${batchesUpdated}/${batches.length} documents updated.`);

  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Listings Processed: ${listings.length} (Updated: ${listingsUpdated})`);
  console.log(`Batches Processed: ${batches.length} (Updated: ${batchesUpdated})`);
  console.log('Schema migration to generic multi-sector listings successful.\n');
}

runMigration()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    mongoose.disconnect();
    process.exit(1);
  });
