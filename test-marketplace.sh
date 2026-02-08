#!/bin/bash

# Carbon Bazaar - Marketplace Test Script
# This script demonstrates a complete buy/sell transaction

BASE_URL="http://localhost:3000"
FARMER_TOKEN=""
COMPANY_TOKEN=""
LISTING_ID=""
FARMER_ID=""
COMPANY_ID=""

echo "🌾 Carbon Bazaar - Marketplace Test"
echo "===================================="
echo ""

# Step 1: Register Farmer
echo "Step 1: Register Farmer..."
FARMER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Farmer",
    "email": "testfarmer@example.com",
    "phone": "9999999999",
    "password": "farmer123",
    "role": "FARMER",
    "state": "MH"
  }')

FARMER_ID=$(echo $FARMER_RESPONSE | jq -r '.data._id // .data.userId')
echo "✅ Farmer registered: $FARMER_ID"
echo ""

# Step 2: Register Company
echo "Step 2: Register Company..."
COMPANY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "testcompany@example.com",
    "phone": "8888888888",
    "password": "company123",
    "role": "COMPANY",
    "state": "PB"
  }')

COMPANY_ID=$(echo $COMPANY_RESPONSE | jq -r '.data._id // .data.userId')
echo "✅ Company registered: $COMPANY_ID"
echo ""

# Step 3: Login as Farmer
echo "Step 3: Login as Farmer..."
FARMER_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testfarmer@example.com",
    "password": "farmer123"
  }')

FARMER_TOKEN=$(echo $FARMER_LOGIN | jq -r '.data.token')
echo "✅ Farmer logged in"
echo "   Token: ${FARMER_TOKEN:0:20}..."
echo ""

# Step 4: Login as Company
echo "Step 4: Login as Company..."
COMPANY_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testcompany@example.com",
    "password": "company123"
  }')

COMPANY_TOKEN=$(echo $COMPANY_LOGIN | jq -r '.data.token')
echo "✅ Company logged in"
echo "   Token: ${COMPANY_TOKEN:0:20}..."
echo ""

# Step 5: Verify Farmer (Required to create listings)
echo "Step 5: Upload verification documents for Farmer..."
# Note: In real scenario, would upload actual documents
# For now, we'll manually mark as verified via admin or direct DB
echo "⚠️  Verification required - would need document upload in UI"
echo ""

# Step 6: Create Listing as Farmer
echo "Step 6: Create Carbon Credit Listing..."
LISTING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -d '{
    "month": "2026-02",
    "creditsAmount": 500,
    "pricePerCredit": 450,
    "cropType": "RICE",
    "state": "MH",
    "areaInHectares": 25,
    "description": "High-quality sustainable rice credits from Maharashtra",
    "methodology": "Direct measurement and third-party verification"
  }')

STATUS=$(echo $LISTING_RESPONSE | jq -r '.success')
if [ "$STATUS" = "true" ]; then
  LISTING_ID=$(echo $LISTING_RESPONSE | jq -r '.data._id')
  echo "✅ Listing created: $LISTING_ID"
  echo "   Credits: 500 tCO₂e @ ₹450/credit"
  echo "   Total Value: ₹225,000"
else
  ERROR=$(echo $LISTING_RESPONSE | jq -r '.message')
  echo "❌ Failed to create listing: $ERROR"
  echo "   (This might be due to unverified status)"
fi
echo ""

# Step 7: View Marketplace
echo "Step 7: Fetch Marketplace Listings (ACTIVE status)..."
curl -s "$BASE_URL/api/listings?status=ACTIVE&limit=3" | jq '.' | head -30
echo ""

# Step 8: Place Buy Offer as Company
if [ ! -z "$LISTING_ID" ] && [ "$LISTING_ID" != "null" ]; then
  echo "Step 8: Company places offer on listing..."
  OFFER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/trade-offers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $COMPANY_TOKEN" \
    -d "{
      \"listingId\": \"$LISTING_ID\",
      \"creditsRequested\": 100,
      \"negotiatedPricePerCredit\": 420
    }")

  OFFER_STATUS=$(echo $OFFER_RESPONSE | jq -r '.success')
  if [ "$OFFER_STATUS" = "true" ]; then
    OFFER_ID=$(echo $OFFER_RESPONSE | jq -r '.data._id')
    TOTAL=$(echo $OFFER_RESPONSE | jq -r '.data.negotiatedTotalPrice')
    DISCOUNT=$(echo $OFFER_RESPONSE | jq -r '.data.discountPercentage')
    
    echo "✅ Offer created: $OFFER_ID"
    echo "   Offered Amount: 100 tCO₂e"
    echo "   Offered Price: ₹420/credit"
    echo "   Total: ₹$TOTAL"
    echo "   Discount: $DISCOUNT%"
  else
    ERROR=$(echo $OFFER_RESPONSE | jq -r '.message')
    echo "❌ Failed to create offer: $ERROR"
  fi
else
  echo "⚠️  Skipping offer step - no listing created"
fi
echo ""

# Step 9: Summary
echo "===================================="
echo "✅ Test Complete!"
echo ""
echo "Summary:"
echo "- Farmer ID: $FARMER_ID"
echo "- Company ID: $COMPANY_ID"
echo "- Listing ID: $LISTING_ID"
echo ""
echo "Next Steps:"
echo "1. Verify farmer documents via admin panel"
echo "2. Check marketplace at http://localhost:3000/marketplace"
echo "3. Accept/reject offer in seller's notifications"
echo "4. View transaction history in dashboards"
