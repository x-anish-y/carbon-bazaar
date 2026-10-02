const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // Use a schemaless model bound to a guessed collection name; we'll also list collections.
  const db = mongoose.connection.db;
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  console.log('Collections:', collections.map((c) => c.name).sort());

  // Try both common collection names
  const candidates = ['landverifications', 'landverifications', 'landverifications', 'landverifications', 'landverifications', 'landverifications'];
  const uniqueCandidates = Array.from(new Set(candidates.concat(['landverifications', 'landVerifications', 'land_verifications', 'LandVerifications'])));

  const targetId = process.argv[2];
  if (targetId) console.log('Target _id:', targetId);

  for (const name of uniqueCandidates) {
    if (!collections.some((c) => c.name === name)) continue;
    const Model = mongoose.model(`LV_${name}`, new mongoose.Schema({}, { strict: false }), name);
    const count = await Model.countDocuments({});
    console.log(`\nCollection ${name} count:`, count);

    const latest = await Model.findOne({}).sort({ createdAt: -1 }).lean();
    console.log('Latest _id:', latest?._id?.toString());

    if (targetId) {
      const byId = await Model.findById(targetId).lean();
      console.log('findById:', !!byId);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
