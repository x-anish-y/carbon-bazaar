/**
 * MongoDB Database Seeding Script
 * Seeds initial data for development and testing
 * 
 * Usage: node scripts/seed-db.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Import models
import User from '../src/models/User.js';
import CarbonListing from '../src/models/CarbonListing.js';
import TradeOffer from '../src/models/TradeOffer.js';
import BuyRequest from '../src/models/BuyRequest.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon-bazaar';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function clearCollections() {
  try {
    await User.deleteMany({});
    await CarbonListing.deleteMany({});
    await TradeOffer.deleteMany({});
    await BuyRequest.deleteMany({});
    console.log('✓ Cleared existing collections');
  } catch (error) {
    console.error('✗ Error clearing collections:', error.message);
  }
}

async function seedUsers() {
  const users = [
    {
      name: 'Anish Kumar',
      email: 'anish@carbenbazaar.in',
      phone: '+919876543210',
      password: 'Farmer@123456',
      role: 'FARMER',
      state: 'MH',
      isEmailVerified: true,
      verified: true,
      createdAt: new Date('2024-01-15'),
    },
    {
      name: 'Priya Sharma',
      email: 'priya@carbenbazaar.in',
      phone: '+918765432109',
      password: 'Farmer@123456',
      role: 'FARMER',
      state: 'PB',
      isEmailVerified: true,
      verified: true,
      createdAt: new Date('2024-01-20'),
    },
    {
      name: 'Green Energy Corp',
      email: 'company@greenenergy.in',
      phone: '+919123456789',
      password: 'Company@123456',
      role: 'COMPANY',
      state: 'DL',
      isEmailVerified: true,
      verified: true,
      createdAt: new Date('2024-01-10'),
    },
    {
      name: 'Carbon Solutions Ltd',
      email: 'contact@carbonsolutions.in',
      phone: '+918765012345',
      password: 'Company@123456',
      role: 'COMPANY',
      state: 'KA',
      isEmailVerified: true,
      verified: true,
      createdAt: new Date('2024-01-12'),
    },
    {
      name: 'Admin User',
      email: 'admin@carbenbazaar.in',
      phone: '+919000000000',
      password: 'Admin@123456',
      role: 'ADMIN',
      state: 'DL',
      isEmailVerified: true,
      verified: true,
      createdAt: new Date('2024-01-01'),
    },
  ];

  try {
    const createdUsers = await User.insertMany(users);
    console.log(`✓ Seeded ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    console.error('✗ Error seeding users:', error.message);
    return [];
  }
}

async function seedListings(users) {
  const farmers = users.filter((u) => u.role === 'FARMER');

  if (farmers.length === 0) {
    console.log('No farmers found, skipping listings');
    return [];
  }

  const listings = [
    {
      sellerId: farmers[0]._id,
      cropType: 'WHEAT',
      creditsAvailable: 500,
      creditsOffered: 500,
      pricePerCredit: 450,
      month: 'January 2024',
      verificationStatus: 'VERIFIED',
      status: 'OPEN',
      description: 'Certified organic wheat credits from Punjab farmland',
      createdAt: new Date('2024-01-15'),
    },
    {
      sellerId: farmers[1]._id,
      cropType: 'RICE',
      creditsAvailable: 750,
      creditsOffered: 750,
      pricePerCredit: 400,
      month: 'January 2024',
      verificationStatus: 'VERIFIED',
      status: 'OPEN',
      description: 'High-quality rice credits from sustainable farming',
      createdAt: new Date('2024-01-20'),
    },
    {
      sellerId: farmers[0]._id,
      cropType: 'COTTON',
      creditsAvailable: 300,
      creditsOffered: 300,
      pricePerCredit: 500,
      month: 'February 2024',
      verificationStatus: 'VERIFIED',
      status: 'PARTIAL',
      description: 'Organic cotton with complete documentation',
      createdAt: new Date('2024-01-25'),
    },
  ];

  try {
    const createdListings = await CarbonListing.insertMany(listings);
    console.log(`✓ Seeded ${createdListings.length} listings`);
    return createdListings;
  } catch (error) {
    console.error('✗ Error seeding listings:', error.message);
    return [];
  }
}

async function seedTradeOffers(users, listings) {
  const companies = users.filter((u) => u.role === 'COMPANY');

  if (companies.length === 0 || listings.length === 0) {
    console.log('No companies or listings found, skipping trade offers');
    return [];
  }

  const tradeOffers = [
    {
      listingId: listings[0]._id,
      buyerId: companies[0]._id,
      sellerId: listings[0].sellerId,
      creditsRequested: 250,
      pricePerCredit: 450,
      totalPrice: 112500,
      status: 'PENDING',
      messageHistory: [
        {
          sender: companies[0]._id,
          message: 'Interested in buying 250 credits at ₹450 each',
          timestamp: new Date('2024-02-01T10:00:00'),
        },
      ],
      createdAt: new Date('2024-02-01'),
    },
    {
      listingId: listings[1]._id,
      buyerId: companies[1]._id,
      sellerId: listings[1].sellerId,
      creditsRequested: 500,
      pricePerCredit: 400,
      totalPrice: 200000,
      status: 'ACCEPTED',
      messageHistory: [
        {
          sender: companies[1]._id,
          message: 'Would like to purchase 500 rice credits',
          timestamp: new Date('2024-02-02T09:00:00'),
        },
        {
          sender: listings[1].sellerId,
          message: 'Deal accepted!',
          timestamp: new Date('2024-02-02T10:30:00'),
        },
      ],
      createdAt: new Date('2024-02-02'),
      acceptedAt: new Date('2024-02-02T10:30:00'),
    },
  ];

  try {
    const createdOffers = await TradeOffer.insertMany(tradeOffers);
    console.log(`✓ Seeded ${createdOffers.length} trade offers`);
    return createdOffers;
  } catch (error) {
    console.error('✗ Error seeding trade offers:', error.message);
    return [];
  }
}

async function seedBuyRequests(users, listings) {
  const companies = users.filter((u) => u.role === 'COMPANY');

  if (companies.length === 0) {
    console.log('No companies found, skipping buy requests');
    return [];
  }

  const buyRequests = [
    {
      buyerId: companies[0]._id,
      cropType: 'WHEAT',
      creditsWanted: 1000,
      maxPricePerCredit: 500,
      state: 'Punjab',
      month: 'January 2024',
      status: 'OPEN',
      description: 'Looking to buy wheat credits for carbon offset',
      createdAt: new Date('2024-01-18'),
    },
    {
      buyerId: companies[1]._id,
      cropType: 'SOLAR',
      creditsWanted: 2000,
      maxPricePerCredit: 600,
      state: 'Karnataka',
      month: 'February 2024',
      status: 'OPEN',
      description: 'Solar energy credits needed for compliance',
      createdAt: new Date('2024-01-22'),
    },
  ];

  try {
    const createdRequests = await BuyRequest.insertMany(buyRequests);
    console.log(`✓ Seeded ${createdRequests.length} buy requests`);
    return createdRequests;
  } catch (error) {
    console.error('✗ Error seeding buy requests:', error.message);
    return [];
  }
}

async function createIndexes() {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });

    // CarbonListing indexes
    await CarbonListing.collection.createIndex({ sellerId: 1 });
    await CarbonListing.collection.createIndex({ status: 1 });
    await CarbonListing.collection.createIndex({ cropType: 1 });

    // TradeOffer indexes
    await TradeOffer.collection.createIndex({ listingId: 1 });
    await TradeOffer.collection.createIndex({ buyerId: 1 });
    await TradeOffer.collection.createIndex({ sellerId: 1 });
    await TradeOffer.collection.createIndex({ status: 1 });

    // BuyRequest indexes
    await BuyRequest.collection.createIndex({ buyerId: 1 });
    await BuyRequest.collection.createIndex({ status: 1 });

    console.log('✓ Created database indexes');
  } catch (error) {
    console.error('✗ Error creating indexes:', error.message);
  }
}

async function displayStats() {
  try {
    const userCount = await User.countDocuments();
    const listingCount = await CarbonListing.countDocuments();
    const tradeCount = await TradeOffer.countDocuments();
    const buyRequestCount = await BuyRequest.countDocuments();

    console.log('\n📊 Database Statistics:');
    console.log(`  • Users: ${userCount}`);
    console.log(`  • Carbon Listings: ${listingCount}`);
    console.log(`  • Trade Offers: ${tradeCount}`);
    console.log(`  • Buy Requests: ${buyRequestCount}`);
  } catch (error) {
    console.error('✗ Error getting stats:', error.message);
  }
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    await connectDB();
    await clearCollections();
    
    const users = await seedUsers();
    const listings = await seedListings(users);
    await seedTradeOffers(users, listings);
    await seedBuyRequests(users, listings);
    await createIndexes();
    await displayStats();

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\n📧 Test Credentials:');
    console.log('  Farmer: anish@carbenbazaar.in / Farmer@123456');
    console.log('  Company: company@greenenergy.in / Company@123456');
    console.log('  Admin: admin@carbenbazaar.in / Admin@123456');
  } catch (error) {
    console.error('\n✗ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

main();
