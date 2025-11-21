#!/bin/bash

# API Testing Script

echo "🧪 Testing Kasioon Bot API..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${1:-http://localhost:3355}"

# Test 1: Health Check
echo "Test 1: Health Check"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$HEALTH" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed (HTTP $HEALTH)${NC}"
fi
echo ""

# Test 2: Analyze Message (Arabic - Car)
echo "Test 2: Analyze Message (Arabic - Car)"
ANALYZE=$(curl -s -X POST $API_URL/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"أريد تويوتا كامري في حلب","language":"ar"}')

if echo "$ANALYZE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Message analysis passed${NC}"
    echo "Response: $ANALYZE" | jq .
else
    echo -e "${RED}✗ Message analysis failed${NC}"
    echo "Response: $ANALYZE"
fi
echo ""

# Test 3: Search Marketplace
echo "Test 3: Search Marketplace"
SEARCH=$(curl -s -X POST $API_URL/api/search \
  -H "Content-Type: application/json" \
  -d '{"city":"Aleppo","category":"vehicles","carBrand":"Toyota"}')

if echo "$SEARCH" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Marketplace search passed${NC}"
    echo "Response: $SEARCH" | jq '.success, .count'
else
    echo -e "${RED}✗ Marketplace search failed${NC}"
    echo "Response: $SEARCH"
fi
echo ""

# Test 4: Analyze Message (English - Apartment)
echo "Test 4: Analyze Message (English - Apartment)"
ANALYZE_EN=$(curl -s -X POST $API_URL/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"I want an apartment for sale in Damascus","language":"en"}')

if echo "$ANALYZE_EN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ English message analysis passed${NC}"
    echo "Response: $ANALYZE_EN" | jq .
else
    echo -e "${RED}✗ English message analysis failed${NC}"
    echo "Response: $ANALYZE_EN"
fi
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo ""
echo "API URL: $API_URL"
echo ""
echo "If all tests passed, your API is working correctly!"
echo "If any tests failed, check the logs:"
echo "  docker-compose logs -f api"
echo ""

