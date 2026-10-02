#!/bin/bash
# MongoDB Setup Commands
# Copy and run these commands to set up the database

echo "🚀 Carbon Bazaar MongoDB Setup"
echo "================================"
echo ""

# Step 1: Start MongoDB
echo "📍 Step 1: Starting MongoDB..."
echo ""
echo "Choose your operating system:"
echo ""
echo "Windows (WSL/Git Bash):"
echo "  sudo service mongod start"
echo ""
echo "macOS:"
echo "  brew services start mongodb-community"
echo ""
echo "Linux:"
echo "  sudo systemctl start mongod"
echo ""
echo "Then press Enter to continue..."
read -p "MongoDB started? (y/n) " -n 1 -r
echo ""

# Step 2: Verify Connection
echo "📍 Step 2: Verifying connection..."
node scripts/check-db.js

if [ $? -ne 0 ]; then
  echo "❌ Connection failed. Start MongoDB and try again."
  exit 1
fi

echo ""
echo "✅ Connection successful!"
echo ""

# Step 3: Initialize Database
echo "📍 Step 3: Initializing database..."
node scripts/init-db.js

if [ $? -ne 0 ]; then
  echo "❌ Initialization failed."
  exit 1
fi

echo ""
echo "✅ Database initialized!"
echo ""

# Step 4: Load Sample Data
echo "📍 Step 4: Loading sample data (optional)..."
read -p "Load sample data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  node scripts/seed-db.js
  
  if [ $? -ne 0 ]; then
    echo "❌ Seeding failed."
    exit 1
  fi
  
  echo ""
  echo "✅ Sample data loaded!"
  echo ""
  echo "Test Credentials:"
  echo "  Farmer:   (seeded users) / farmer123"
  echo "  Company:  (seeded users) / company123"
  echo "  Admin:    admin@carbonbazaar.com / admin123"
  echo ""
fi

# Step 5: Start Development Server
echo "📍 Step 5: Starting development server..."
echo ""
echo "Run: npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo ""

echo "✅ All setup complete!"
echo ""
echo "📚 Documentation:"
echo "  - Quick Reference: MONGODB_QUICK_REFERENCE.md"
echo "  - Complete Guide: README_MONGODB.md"
echo "  - Technical Ref: MONGODB_CONFIG.md"
echo ""
