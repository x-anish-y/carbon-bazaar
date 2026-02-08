/**
 * MongoDB Health Check and Validation Script
 * Validates database configuration and connectivity
 * 
 * Usage: node scripts/check-db.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon-bazaar';

async function checkMongoDB() {
  console.log('🔍 MongoDB Health Check\n');
  console.log(`📍 Connection URI: ${MONGODB_URI}`);
  console.log('-----------------------------------\n');

  try {
    // Test connection
    console.log('⏳ Testing MongoDB connection...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    console.log('✓ Successfully connected to MongoDB\n');

    // Get server info
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    console.log('📊 Server Information:');
    console.log(`  • MongoDB Version: ${serverStatus.version}`);
    console.log(`  • Uptime: ${Math.round(serverStatus.uptime / 60)} minutes`);
    console.log(`  • Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
    console.log(`  • Operations: ${serverStatus.opcounters.query + serverStatus.opcounters.insert + serverStatus.opcounters.update + serverStatus.opcounters.delete} total\n`);

    // Get database stats
    console.log('📈 Database Statistics:');
    const dbStats = await mongoose.connection.db.stats();
    console.log(`  • Database: carbon-bazaar`);
    console.log(`  • Collections: ${dbStats.collections}`);
    console.log(`  • Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  • Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  • Indexes: ${dbStats.indexes}\n`);

    // List collections
    console.log('📦 Collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('  ⚠️  No collections found. Database is empty.');
    } else {
      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`  • ${col.name}: ${count} documents`);
      }
    }
    console.log();

    // Check indexes
    console.log('🔑 Indexes Status:');
    const collections_list = await mongoose.connection.db.listCollections().toArray();
    let totalIndexes = 0;

    for (const col of collections_list) {
      const indexes = await mongoose.connection.db.collection(col.name).getIndexes();
      totalIndexes += Object.keys(indexes).length;
    }

    if (totalIndexes > 0) {
      console.log(`  ✓ ${totalIndexes} indexes found\n`);
    } else {
      console.log('  ⚠️  No indexes found. Run: node scripts/init-db.js\n');
    }

    // Connection readiness check
    const readyState = mongoose.connection.readyState;
    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };

    console.log('✅ Validation Results:');
    console.log(`  • Connection Status: ${states[readyState]} (${readyState})`);
    console.log(`  • Database Accessible: Yes`);
    console.log(`  • Collections Present: ${collections.length > 0 ? 'Yes' : 'No'}`);
    console.log(`  • Indexes Present: ${totalIndexes > 0 ? 'Yes' : 'No'}\n`);

    // Recommendations
    if (collections.length === 0) {
      console.log('💡 Recommendations:');
      console.log('  1. Run: node scripts/init-db.js (to create indexes)');
      console.log('  2. Run: node scripts/seed-db.js (to seed sample data)');
      console.log('  3. Start dev server: npm run dev\n');
    } else if (totalIndexes === 0) {
      console.log('💡 Recommendations:');
      console.log('  1. Run: node scripts/init-db.js (to create indexes)\n');
    } else {
      console.log('💡 Database is ready for development!\n');
    }

    console.log('✓ MongoDB health check completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ MongoDB Health Check Failed\n');
    console.error(`Error: ${error.message}\n`);

    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('⚠️  MongoDB is not running.');
      console.log('\nTo start MongoDB:');
      console.log('  Windows (WSL): sudo service mongod start');
      console.log('  macOS: brew services start mongodb-community');
      console.log('  Linux: sudo systemctl start mongod');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('⚠️  Cannot resolve MongoDB host.');
      console.log('Check MONGODB_URI in .env.local');
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Verify MongoDB is running');
    console.log('  2. Check MONGODB_URI in .env.local');
    console.log('  3. Ensure MongoDB service is started\n');

    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

checkMongoDB();
