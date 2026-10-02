require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Cleaning old test data...');
  await db.collection('users').deleteMany({});
  await db.collection('carbonlistings').deleteMany({});
  await db.collection('carbonbatches').deleteMany({});
  await db.collection('landverifications').deleteMany({});
  await db.collection('tradeoffers').deleteMany({});

  const plainPassword = 'Password@123';

  console.log('Creating users...');
  const users = [
    {
      name: 'Admin User',
      email: 'admin@carbonbazaar.in',
      password: plainPassword,
      role: 'ADMIN',
      verified: true,
      isVerified: true,
      isEmailVerified: true,
      profile: { fullName: 'Carbon Bazaar Admin', phone: '+91-9876543210' },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Rajesh Kumar',
      email: 'farmer.rajesh@carbonbazaar.in',
      password: plainPassword,
      role: 'FARMER',
      sellerType: 'FARMER',
      verified: true,
      isVerified: true,
      isEmailVerified: true,
      profile: {
        fullName: 'Rajesh Kumar',
        phone: '+91-9812345678',
        address: { district: 'Ludhiana', state: 'Punjab' }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Priya Sharma',
      email: 'farmer.priya@carbonbazaar.in',
      password: plainPassword,
      role: 'FARMER',
      sellerType: 'FARMER',
      verified: true,
      isVerified: true,
      isEmailVerified: true,
      profile: {
        fullName: 'Priya Sharma',
        phone: '+91-9823456789',
        address: { district: 'Karnal', state: 'Haryana' }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Vikramaditya Agrotech',
      email: 'fpo.vikram@carbonbazaar.in',
      password: plainPassword,
      role: 'SELLER',
      sellerType: 'AGGREGATOR',
      verified: true,
      isVerified: true,
      isEmailVerified: true,
      profile: {
        fullName: 'Vikramaditya FPO Agrotech',
        phone: '+91-9834567890',
        address: { district: 'Lucknow', state: 'Uttar Pradesh' }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Tata Steel Sustainability Division',
      email: 'procurement@tatasteel.com',
      password: plainPassword,
      role: 'COMPANY',
      verified: true,
      isVerified: true,
      isEmailVerified: true,
      profile: {
        fullName: 'Tata Steel Enterprise Procurement',
        phone: '+91-22-66658282',
        companyName: 'Tata Steel Ltd',
        sector: 'STEEL',
        cctsObligated: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'India Cement Decarbonization Hub',
      email: 'esg@indiacements.com',
      password: plainPassword,
      role: 'BUYER',
      verified: true,
      isVerified: true,
      isEmailVerified: true,
      profile: {
        fullName: 'India Cements ESG',
        phone: '+91-44-28521526',
        companyName: 'India Cements Ltd',
        sector: 'CEMENT',
        cctsObligated: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const userResult = await db.collection('users').insertMany(users);
  const userIds = userResult.insertedIds;
  const adminId = userIds[0];
  const rajeshId = userIds[1];
  const priyaId = userIds[2];
  const vikramFpoId = userIds[3];
  const tataSteelId = userIds[4];

  console.log('Creating carbon listings...');
  const listings = [
    {
      sellerId: rajeshId,
      farmerId: rajeshId,
      sellerType: 'SELLER',
      title: 'Ludhiana Stubble Management & Biochar Enrichment',
      description: 'Zero stubble burning project converting paddy residue to biochar with long-term soil carbon sequestration in 45 hectares.',
      month: '2026-02',
      creditsAmount: 850,
      carbonCredits: 850,
      creditsAvailable: 720,
      pricePerCredit: 980,
      creditType: 'AGRICULTURE',
      cropType: 'RICE',
      state: 'PB',
      district: 'Ludhiana',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isTokenized: true,
      tokenId: '1001',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      cctsCompliant: true,
      ndviScore: 0.78,
      soilOrganicCarbon: '1.42%',
      vintageYear: 2026,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      sellerId: priyaId,
      farmerId: priyaId,
      sellerType: 'SELLER',
      title: 'Karnal Direct Seeded Rice (DSR) Water & Methane Mitigation',
      description: 'Alternate wetting and drying with DSR technique reducing methane emissions by 42% across multi-crop rotational plots.',
      month: '2026-02',
      creditsAmount: 620,
      carbonCredits: 620,
      creditsAvailable: 620,
      pricePerCredit: 1120,
      creditType: 'AGRICULTURE',
      cropType: 'WHEAT',
      state: 'HR',
      district: 'Karnal',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isTokenized: true,
      tokenId: '1002',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      cctsCompliant: true,
      ndviScore: 0.82,
      soilOrganicCarbon: '1.25%',
      vintageYear: 2026,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      sellerId: vikramFpoId,
      farmerId: vikramFpoId,
      sellerType: 'SELLER',
      title: 'Awadh Regenerative Agroforestry & Sugarcane Intercropping',
      description: 'Aggregated FPO initiative of 120 smallholder farmers adopting regenerative tree borders and organic compost mulching.',
      month: '2026-03',
      creditsAmount: 2400,
      carbonCredits: 2400,
      creditsAvailable: 2150,
      pricePerCredit: 890,
      creditType: 'FORESTRY',
      cropType: 'SUGARCANE',
      state: 'UP',
      district: 'Lucknow',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isTokenized: true,
      tokenId: '1003',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      cctsCompliant: true,
      ndviScore: 0.74,
      soilOrganicCarbon: '1.58%',
      vintageYear: 2026,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      sellerId: rajeshId,
      farmerId: rajeshId,
      sellerType: 'SELLER',
      title: 'Punjab Winter Mustard Green Manuring Project',
      description: 'Leguminous cover cropping between crop seasons enhancing microbial biomass and atmospheric nitrogen-carbon sink.',
      month: '2026-03',
      creditsAmount: 480,
      carbonCredits: 480,
      creditsAvailable: 480,
      pricePerCredit: 1050,
      creditType: 'AGRICULTURE',
      cropType: 'PULSES',
      state: 'PB',
      district: 'Patiala',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isTokenized: true,
      tokenId: '1004',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      cctsCompliant: true,
      ndviScore: 0.81,
      soilOrganicCarbon: '1.38%',
      vintageYear: 2026,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      sellerId: vikramFpoId,
      farmerId: vikramFpoId,
      sellerType: 'SELLER',
      title: 'Bundelkhand Solar-Powered Micro-Irrigation Sink',
      description: 'Precision drip irrigation replacing diesel water pumps coupled with silvopasture carbon sequestration.',
      month: '2026-01',
      creditsAmount: 1300,
      carbonCredits: 1300,
      creditsAvailable: 950,
      pricePerCredit: 1250,
      creditType: 'RENEWABLE',
      cropType: 'PULSES',
      state: 'UP',
      district: 'Jhansi',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isTokenized: true,
      tokenId: '1005',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      cctsCompliant: true,
      ndviScore: 0.69,
      soilOrganicCarbon: '1.18%',
      vintageYear: 2026,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('carbonlistings').insertMany(listings);

  console.log('Creating sample land verification...');
  await db.collection('landverifications').insertOne({
    userId: rajeshId,
    farmerName: 'Rajesh Kumar',
    landLocation: 'Ludhiana, Punjab, India',
    coordinates: { latitude: 30.9010, longitude: 75.8573 },
    surveyNumber: 'PB-LDH-2026-8841',
    areaInHectares: 18.5,
    cropType: 'RICE',
    farmingPractices: ['ZERO_TILLAGE', 'BIOCHAR', 'COVER_CROPS'],
    status: 'APPROVED',
    ndviScore: 0.78,
    estimatedAnnualCredits: 95,
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
