#!/usr/bin/env node
/**
 * MongoDB Database Initialization Script
 * Initializes database with proper indexes and sample data
 * 
 * Usage: node scripts/init-db.js
 */

import mongoose from 'mongoose';
import User from '../src/models/User.js';
import CarbonListing from '../src/models/CarbonListing.js';
import Document from '../src/models/Document.js';
import TradeOffer from '../src/models/TradeOffer.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon-bazaar';

async function initializeDatabase() {
  console.log('🔄 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create indexes
    console.log('\n📑 Creating indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await CarbonListing.collection.createIndex({ sellerId: 1 });
    await CarbonListing.collection.createIndex({ status: 1 });
    await TradeOffer.collection.createIndex({ listingId: 1 });
    await TradeOffer.collection.createIndex({ buyerId: 1 });
    await Document.collection.createIndex({ userId: 1 });
    console.log('✅ Indexes created');

    // Check if admin user exists
    console.log('\n👤 Checking admin user...');
    let adminUser = await User.findOne({ role: 'ADMIN', email: 'admin@carbenbazaar.in' });
    
    if (!adminUser) {
      console.log('Creating admin user...');
      adminUser = await User.create({
        name: 'Carbon Bazaar Admin',
        email: 'admin@carbenbazaar.in',
        password: 'Admin@123456',
        role: 'ADMIN',
        isEmailVerified: true,
        isActive: true,
      });
      console.log('✅ Admin user created');
      console.log(`   Email: admin@carbenbazaar.in`);
      console.log(`   Password: Admin@123456`);
    } else {
      console.log('✅ Admin user already exists');
    }

    // Check collections
    console.log('\n📊 Database Status:');
    const userCount = await User.countDocuments();
    const listingCount = await CarbonListing.countDocuments();
    const tradeCount = await TradeOffer.countDocuments();
    const docCount = await Document.countDocuments();

    console.log(`   Users: ${userCount}`);
    console.log(`   Listings: ${listingCount}`);
    console.log(`   Trades: ${tradeCount}`);
    console.log(`   Documents: ${docCount}`);

    console.log('\n✨ Database initialization complete!');
    console.log(`📍 Database: ${MONGODB_URI}`);
    
  } catch (error) {
    console.error('❌ Database initialization failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

initializeDatabase();
