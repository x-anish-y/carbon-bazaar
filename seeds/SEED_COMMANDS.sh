#!/bin/bash
# Quick seed commands for India Carbon Credit Market
# Run these commands to populate your database with realistic test data

# ============================================================
# OPTION 1: Using Node Script (Recommended - Full Automation)
# ============================================================

# Make sure Node dependencies are installed
npm install

# Run the seed script (creates 5 farmers, 5 companies, 15 listings, 8 trades)
node seeds/india-market-seed.js

# Expected output:
# ✅ Connected to MongoDB
# 🌱 Starting database seeding...
# 🗑️  Clearing existing data...
# 👨‍🌾 Creating farmers...
# ✅ Rajesh Kumar (PB) - WHEAT
# ✅ Priya Sharma (HR) - RICE
# ... (continues for all users)
# 📊 SEED DATA SUMMARY
# ... (shows statistics)
# ✅ Seeding completed successfully!


# ============================================================
# OPTION 2: Using mongoimport (Direct JSON Import)
# ============================================================

# If using mongoimport (requires MongoDB CLI tools installed)
# This imports the raw JSON data directly

# Set MongoDB connection (update if using remote database)
MONGO_DB_URI="mongodb://localhost:27017/carbon-bazaar"

# Import all collections at once
mongoimport --uri "$MONGO_DB_URI" \
  --collection users \
  --file seeds/india-market-data.json \
  --jsonArray \
  --fields "_id,email,password,role,profile,farmerProfile,companyProfile,isVerified,verificationDate,createdAt,updatedAt"

mongoimport --uri "$MONGO_DB_URI" \
  --collection carbonlistings \
  --file seeds/india-market-data.json \
  --jsonArray \
  --fields "_id,sellerId,month,creditsAmount,creditsAvailable,pricePerCredit,cropType,state,areaInHectares,description,methodology,status,createdAt,updatedAt"

mongoimport --uri "$MONGO_DB_URI" \
  --collection transactions \
  --file seeds/india-market-data.json \
  --jsonArray \
  --fields "_id,sellerId,buyerId,listingId,month,creditsTraded,pricePerCredit,totalValue,cropType,state,status,paymentMethod,paymentStatus,transactionDate,completionDate"


# ============================================================
# OPTION 3: Using mongosh (Interactive Shell)
# ============================================================

# Start mongosh
mongosh

# Then run these commands:
# use carbon-bazaar;
# const fs = require('fs');
# const data = JSON.parse(fs.readFileSync('./seeds/india-market-data.json', 'utf8'));
# db.users.insertMany(data.users);
# db.carbonlistings.insertMany(data.carbonlistings);
# db.transactions.insertMany(data.transactions);
# db.users.countDocuments() // Should show 10
# db.carbonlistings.countDocuments() // Should show 15
# db.transactions.countDocuments() // Should show 8


# ============================================================
# VERIFY THE SEED DATA
# ============================================================

# Using mongosh to verify data was inserted correctly
mongosh carbon-bazaar << EOF

// Check users
console.log("=== FARMERS ===");
db.users.find({ role: "FARMER" }).forEach(u => {
  console.log("✅", u.profile.fullName, "(" + u.farmerProfile.state + ")");
});

console.log("\n=== COMPANIES ===");
db.users.find({ role: "COMPANY" }).forEach(u => {
  console.log("✅", u.profile.fullName, "(" + u.companyProfile.sector + ")");
});

// Check listings
console.log("\n=== LISTINGS SUMMARY ===");
console.log("Total listings:", db.carbonlistings.countDocuments());
console.log("Active listings:", db.carbonlistings.countDocuments({ status: "ACTIVE" }));
console.log("Partial listings:", db.carbonlistings.countDocuments({ status: "PARTIAL" }));
console.log("Sold listings:", db.carbonlistings.countDocuments({ status: "SOLD" }));

// Check trades
console.log("\n=== TRADES SUMMARY ===");
console.log("Total trades:", db.transactions.countDocuments());
const totalTraded = db.transactions.aggregate([
  { $group: { _id: null, total: { $sum: "$creditsTraded" } } }
]).toArray()[0].total;
console.log("Total credits traded:", totalTraded, "tCO2e");

// Check crop distribution
console.log("\n=== CROP DISTRIBUTION ===");
db.carbonlistings.aggregate([
  { $group: { _id: "$cropType", count: { $sum: 1 } } }
]).forEach(doc => {
  console.log(doc._id + ":", doc.count, "listings");
});

EOF


# ============================================================
# CLEAR SEED DATA (If you want to start over)
# ============================================================

# Option A: Drop entire database
mongosh carbon-bazaar --eval "db.dropDatabase()" --quiet

# Option B: Drop specific collections
mongosh carbon-bazaar --eval "
db.users.deleteMany({});
db.carbonlistings.deleteMany({});
db.transactions.deleteMany({});
" --quiet


# ============================================================
# TEST THE SEEDED DATA WITH API CALLS
# ============================================================

# Assuming your API is running on http://localhost:3000

# 1. Login as Farmer
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh.kumar@farmmail.com",
    "password": "farmer123"
  }'

# 2. Login as Company
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "procurement@indiacements.com",
    "password": "company123"
  }'

# 3. Get all active listings
curl http://localhost:3000/api/listings?status=ACTIVE

# 4. Filter listings by state (Punjab)
curl http://localhost:3000/api/listings?state=PB

# 5. Filter listings by crop (Wheat)
curl http://localhost:3000/api/listings?cropType=WHEAT

# 6. Get listing details
curl http://localhost:3000/api/listings/65b2001000000000000002

# 7. Get user profile
curl http://localhost:3000/api/users/65a1001000000000000001/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 8. Get transaction history
curl http://localhost:3000/api/transactions?buyerId=65a1001000000000000006


# ============================================================
# DATABASE STATISTICS QUERIES
# ============================================================

mongosh carbon-bazaar << EOF

// Price statistics
console.log("=== PRICE STATISTICS ===");
db.carbonlistings.aggregate([
  {
    $group: {
      _id: null,
      minPrice: { $min: "$pricePerCredit" },
      maxPrice: { $max: "$pricePerCredit" },
      avgPrice: { $avg: "$pricePerCredit" }
    }
  }
]).forEach(doc => {
  console.log("Min Price: ₹" + doc.minPrice);
  console.log("Max Price: ₹" + doc.maxPrice);
  console.log("Avg Price: ₹" + Math.round(doc.avgPrice));
});

// Credits statistics
console.log("\n=== CREDITS STATISTICS ===");
db.carbonlistings.aggregate([
  {
    $group: {
      _id: null,
      totalCredits: { $sum: "$creditsAmount" },
      availableCredits: { $sum: "$creditsAvailable" },
      avgPerListing: { $avg: "$creditsAmount" }
    }
  }
]).forEach(doc => {
  console.log("Total Credits Listed: " + doc.totalCredits.toLocaleString() + " tCO2e");
  console.log("Available Credits: " + doc.availableCredits.toLocaleString() + " tCO2e");
  console.log("Avg Per Listing: " + Math.round(doc.avgPerListing) + " tCO2e");
});

// State analysis
console.log("\n=== STATE ANALYSIS ===");
db.carbonlistings.aggregate([
  {
    $group: {
      _id: "$state",
      count: { $sum: 1 },
      totalValue: { $sum: { $multiply: ["$creditsAmount", "$pricePerCredit"] } }
    }
  },
  { $sort: { count: -1 } }
]).forEach(doc => {
  console.log(doc._id + ": " + doc.count + " listings, ₹" + Math.round(doc.totalValue).toLocaleString());
});

// Trade value analysis
console.log("\n=== TRADE VALUE ANALYSIS ===");
db.transactions.aggregate([
  {
    $group: {
      _id: null,
      totalValue: { $sum: "$totalValue" },
      avgValue: { $avg: "$totalValue" },
      maxValue: { $max: "$totalValue" }
    }
  }
]).forEach(doc => {
  console.log("Total Trade Value: ₹" + Math.round(doc.totalValue).toLocaleString());
  console.log("Avg Trade Value: ₹" + Math.round(doc.avgValue).toLocaleString());
  console.log("Max Trade Value: ₹" + Math.round(doc.maxValue).toLocaleString());
});

EOF


# ============================================================
# EXPORT SEED DATA FOR BACKUP
# ============================================================

# Backup collections to JSON
mongoexport --db carbon-bazaar --collection users --out users-backup.json
mongoexport --db carbon-bazaar --collection carbonlistings --out listings-backup.json
mongoexport --db carbon-bazaar --collection transactions --out transactions-backup.json

# Backup entire database
mongodump --db carbon-bazaar --out ./backup-2026-02

echo "✅ Backup created in ./backup-2026-02/"


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

# If using environment variables for MongoDB connection:
export MONGODB_URI="mongodb://localhost:27017/carbon-bazaar"
export MONGODB_USER="your_username"
export MONGODB_PASSWORD="your_password"

# Then run seed script
node seeds/india-market-seed.js


# ============================================================
# CLEANUP COMMANDS
# ============================================================

# Remove all collections (keep database)
mongosh carbon-bazaar --eval "
db.getCollectionNames().forEach(function(name) {
  db[name].deleteMany({});
});
" --quiet

# Remove all test data
mongosh carbon-bazaar --eval "
db.users.deleteMany({ 'profile.phone': { \$regex: '^\\+91' } });
db.carbonlistings.deleteMany({});
db.transactions.deleteMany({});
" --quiet

echo "✅ Cleanup complete"
