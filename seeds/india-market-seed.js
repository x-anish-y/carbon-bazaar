/**
 * India Carbon Credit Market - Seed Data
 * Generates realistic dummy data for testing the India-specific platform
 * 
 * Usage:
 * node scripts/seed-data.js
 * 
 * This creates:
 * - 5 Farmers (different states, different crops)
 * - 5 Companies (cement, steel, power sectors)
 * - 15 Carbon Listings (priced ₹700-₹1200)
 * - 8 Completed Trades (across different months)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sample data generators
const farmerData = [
  {
    name: 'Rajesh Kumar',
    state: 'PB',
    cropType: 'WHEAT',
    farmSize: 15,
    email: 'rajesh.kumar@farmmail.com',
    phone: '+91-98765-43210',
    district: 'Ludhiana',
    experience: 20,
  },
  {
    name: 'Priya Sharma',
    state: 'HR',
    cropType: 'RICE',
    farmSize: 8,
    email: 'priya.sharma@farmmail.com',
    phone: '+91-98765-43211',
    district: 'Karnal',
    experience: 12,
  },
  {
    name: 'Vikram Singh',
    state: 'UP',
    cropType: 'SUGARCANE',
    farmSize: 12,
    email: 'vikram.singh@farmmail.com',
    phone: '+91-98765-43212',
    district: 'Lucknow',
    experience: 18,
  },
  {
    name: 'Anita Patel',
    state: 'GJ',
    cropType: 'PULSES',
    farmSize: 6,
    email: 'anita.patel@farmmail.com',
    phone: '+91-98765-43213',
    district: 'Ahmedabad',
    experience: 10,
  },
  {
    name: 'Harjeet Singh',
    state: 'MH',
    cropType: 'WHEAT',
    farmSize: 18,
    email: 'harjeet.singh@farmmail.com',
    phone: '+91-98765-43214',
    district: 'Nashik',
    experience: 22,
  },
];

const companyData = [
  {
    name: 'India Cement Ltd',
    sector: 'CEMENT',
    email: 'procurement@indiacements.com',
    phone: '+91-11-2345-6789',
    registrationNumber: 'CRN-2024-001',
    headquarters: 'Delhi',
    employees: 5000,
  },
  {
    name: 'Tata Steel Corporation',
    sector: 'STEEL',
    email: 'sustainability@tatasteel.com',
    phone: '+91-22-2345-6789',
    registrationNumber: 'CRN-2024-002',
    headquarters: 'Mumbai',
    employees: 25000,
  },
  {
    name: 'NTPC Power Limited',
    sector: 'POWER',
    email: 'green@ntpc.co.in',
    phone: '+91-11-3456-7890',
    registrationNumber: 'CRN-2024-003',
    headquarters: 'New Delhi',
    employees: 50000,
  },
  {
    name: 'Ambuja Cements',
    sector: 'CEMENT',
    email: 'credits@ambujacements.com',
    phone: '+91-98-2345-6789',
    registrationNumber: 'CRN-2024-004',
    headquarters: 'Bangalore',
    employees: 3000,
  },
  {
    name: 'Vedanta Power',
    sector: 'POWER',
    email: 'carbon@vedantapower.com',
    phone: '+91-98-3456-7890',
    registrationNumber: 'CRN-2024-005',
    headquarters: 'Pune',
    employees: 8000,
  },
];

// Function to create seed data
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Import models
    const User = require('../src/models/User');
    const CarbonListing = require('../src/models/CarbonListing');
    const Transaction = require('../src/models/Transaction');

    // Clear existing data (optional - comment out to preserve)
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await CarbonListing.deleteMany({});
    await Transaction.deleteMany({});

    // Create farmers
    console.log('👨‍🌾 Creating farmers...');
    const farmers = [];
    for (const farmer of farmerData) {
      const hashedPassword = await bcrypt.hash('farmer123', 10);
      const farmerDoc = await User.create({
        email: farmer.email,
        password: hashedPassword,
        role: 'FARMER',
        profile: {
          fullName: farmer.name,
          phone: farmer.phone,
          address: {
            district: farmer.district,
            state: farmer.state,
          },
        },
        farmerProfile: {
          farmName: `${farmer.name}'s Farm`,
          farmSize: farmer.farmSize,
          crops: [farmer.cropType],
          district: farmer.district,
          state: farmer.state,
          yearsOfExperience: farmer.experience,
          certifications: ['Organic Certified'],
        },
        isVerified: true,
        verificationDate: new Date(),
      });
      farmers.push({ doc: farmerDoc, ...farmer });
      console.log(`  ✅ ${farmer.name} (${farmer.state}) - ${farmer.cropType}`);
    }

    // Create companies
    console.log('\n🏢 Creating companies...');
    const companies = [];
    for (const company of companyData) {
      const hashedPassword = await bcrypt.hash('company123', 10);
      const companyDoc = await User.create({
        email: company.email,
        password: hashedPassword,
        role: 'COMPANY',
        profile: {
          fullName: company.name,
          phone: company.phone,
          address: {
            city: company.headquarters,
            state: 'DL', // Default for now
          },
        },
        companyProfile: {
          companyName: company.name,
          sector: company.sector,
          registrationNumber: company.registrationNumber,
          headquarters: company.headquarters,
          employees: company.employees,
          yearEstablished: 1990,
        },
        isVerified: true,
        verificationDate: new Date(),
      });
      companies.push({ doc: companyDoc, ...company });
      console.log(`  ✅ ${company.name} (${company.sector})`);
    }

    // Create listings
    console.log('\n📋 Creating carbon listings...');
    const listings = [];
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
    const priceRange = { min: 700, max: 1200 };

    const listingDetails = [
      // Farmer 1 (Rajesh Kumar - Wheat, Punjab)
      { farmerId: 0, month: 0, credits: 500, price: 850, description: 'High-quality wheat from regenerative agriculture practices' },
      { farmerId: 0, month: 1, credits: 750, price: 920, description: 'Premium wheat credits with conservation tillage methodology' },
      
      // Farmer 2 (Priya Sharma - Rice, Haryana)
      { farmerId: 1, month: 0, credits: 400, price: 780, description: 'Organic rice production with crop rotation benefits' },
      { farmerId: 1, month: 2, credits: 600, price: 1050, description: 'Rice credits from sustainable farming in Karnal district' },
      
      // Farmer 3 (Vikram Singh - Sugarcane, UP)
      { farmerId: 2, month: 1, credits: 1000, price: 950, description: 'Sugarcane production with agroforestry integration' },
      { farmerId: 2, month: 3, credits: 800, price: 880, description: 'Large-scale sugarcane credits from conservation practices' },
      
      // Farmer 4 (Anita Patel - Pulses, Gujarat)
      { farmerId: 3, month: 0, credits: 300, price: 1100, description: 'Premium pulse credits with crop rotation methodology' },
      { farmerId: 3, month: 2, credits: 450, price: 1180, description: 'Pulses from sustainable farming reducing carbon footprint' },
      
      // Farmer 5 (Harjeet Singh - Wheat, Maharashtra)
      { farmerId: 4, month: 1, credits: 650, price: 900, description: 'Wheat credits from regenerative agriculture in Nashik' },
      { farmerId: 4, month: 4, credits: 550, price: 1050, description: 'Wheat production with soil carbon enhancement practices' },
      
      // Additional diverse listings
      { farmerId: 0, month: 3, credits: 400, price: 1000, description: 'Wheat from no-till farming reducing soil degradation' },
      { farmerId: 1, month: 3, credits: 700, price: 890, description: 'Rice credits with methane reduction through water management' },
      { farmerId: 2, month: 4, credits: 900, price: 950, description: 'Sugarcane production with bagasse utilization benefits' },
      { farmerId: 3, month: 4, credits: 350, price: 1150, description: 'Pulses reducing fertilizer usage and carbon emissions' },
      { farmerId: 4, month: 2, credits: 600, price: 910, description: 'Wheat credits from improved agronomic practices' },
    ];

    for (const details of listingDetails) {
      const farmer = farmers[details.farmerId];
      const listing = await CarbonListing.create({
        sellerId: farmer.doc._id,
        month: months[details.month],
        creditsAmount: details.credits,
        pricePerCredit: details.price,
        cropType: farmer.cropType,
        state: farmer.state,
        areaInHectares: farmer.farmSize,
        description: details.description,
        methodology: ['REGENERATIVE_AGRICULTURE', 'CROP_ROTATION', 'AGROFORESTRY', 'CONSERVATION_TILLAGE'][
          Math.floor(Math.random() * 4)
        ],
        status: Math.random() > 0.3 ? 'ACTIVE' : 'PARTIAL', // 70% active, 30% partial
        creditsAvailable: details.credits,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
      });
      listings.push(listing);
    }
    console.log(`  ✅ ${listings.length} listings created`);

    // Create transactions/trades
    console.log('\n💼 Creating trades...');
    const trades = [];
    const tradeScenarios = [
      { listingIdx: 0, buyerIdx: 0, creditsTraded: 250, price: 850 }, // Half of listing
      { listingIdx: 1, buyerIdx: 1, creditsTraded: 750, price: 920 }, // Full listing
      { listingIdx: 2, buyerIdx: 2, creditsTraded: 400, price: 780 }, // Full listing
      { listingIdx: 4, buyerIdx: 0, creditsTraded: 500, price: 950 }, // Half of listing
      { listingIdx: 5, buyerIdx: 1, creditsTraded: 800, price: 880 }, // Full listing
      { listingIdx: 6, buyerIdx: 3, creditsTraded: 300, price: 1100 }, // Full listing
      { listingIdx: 8, buyerIdx: 4, creditsTraded: 650, price: 900 }, // Full listing
      { listingIdx: 10, buyerIdx: 0, creditsTraded: 200, price: 1000 }, // Half of listing
    ];

    for (const trade of tradeScenarios) {
      const listing = listings[trade.listingIdx];
      const buyer = companies[trade.buyerIdx].doc;

      const transaction = await Transaction.create({
        sellerId: listing.sellerId,
        buyerId: buyer._id,
        listingId: listing._id,
        creditsTraded: trade.creditsTraded,
        pricePerCredit: trade.price,
        totalValue: trade.creditsTraded * trade.price,
        status: 'COMPLETED',
        month: listing.month,
        cropType: listing.cropType,
        state: listing.state,
        transactionDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
        completionDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'COMPLETED',
      });
      trades.push(transaction);

      // Update listing credits available
      listing.creditsAvailable -= trade.creditsTraded;
      if (listing.creditsAvailable <= 0) {
        listing.status = 'SOLD';
      }
      await listing.save();
    }
    console.log(`  ✅ ${trades.length} completed trades created`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEED DATA SUMMARY');
    console.log('='.repeat(60));
    console.log(`
👨‍🌾 Farmers: ${farmers.length}
   ${farmers.map(f => `${f.name} (${f.state}) - ${f.cropType}`).join('\n   ')}

🏢 Companies: ${companies.length}
   ${companies.map(c => `${c.name} (${c.sector})`).join('\n   ')}

📋 Listings: ${listings.length}
   Price Range: ₹${priceRange.min} - ₹${priceRange.max} per credit
   Total Credits Available: ${listings.reduce((sum, l) => sum + l.creditsAvailable, 0).toLocaleString('en-IN')} tCO2e

💼 Trades: ${trades.length}
   Total Value Traded: ₹${trades.reduce((sum, t) => sum + t.totalValue, 0).toLocaleString('en-IN')}
   Total Credits Traded: ${trades.reduce((sum, t) => sum + t.creditsTraded, 0).toLocaleString('en-IN')} tCO2e

🌾 Crop Distribution:
   ${['RICE', 'WHEAT', 'SUGARCANE', 'PULSES'].map(crop => {
     const count = listings.filter(l => l.cropType === crop).length;
     return `${crop}: ${count} listings`;
   }).join('\n   ')}

🗺️  State Distribution:
   ${Array.from(new Set(listings.map(l => l.state))).sort().map(state => {
     const count = listings.filter(l => l.state === state).length;
     return `${state}: ${count} listings`;
   }).join('\n   ')}
`);
    console.log('='.repeat(60));
    console.log('✅ Seeding completed successfully!\n');

    return {
      farmers: farmers.map(f => f.doc),
      companies: companies.map(c => c.doc),
      listings,
      trades,
    };
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { seedDatabase, farmerData, companyData };

// Run if executed directly
if (require.main === module) {
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon-bazaar';

  mongoose
    .connect(dbUri)
    .then(() => {
      console.log('✅ Connected to MongoDB\n');
      return seedDatabase();
    })
    .then(() => {
      console.log('Disconnecting from database...');
      return mongoose.disconnect();
    })
    .then(() => {
      console.log('✅ Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
