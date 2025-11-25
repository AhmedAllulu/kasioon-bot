#!/bin/bash

# Test Queries for Qasioun MCP Search Server
# Usage: ./test-queries.sh

API_URL="${API_URL:-http://localhost:3355}"

echo "========================================="
echo "Qasioun MCP Search Server - Test Suite"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/api/health"

# Test 2: Arabic Car Search
test_endpoint "Arabic Car Search" "POST" "/api/search" \
'{
  "query": "بدي سيارة في دمشق",
  "language": "ar"
}'

# Test 3: Arabic Apartment Search
test_endpoint "Arabic Apartment Search" "POST" "/api/search" \
'{
  "query": "شقة للإيجار في دمشق غرفتين",
  "language": "ar"
}'

# Test 4: Arabic Phone Search
test_endpoint "Arabic Phone Search" "POST" "/api/search" \
'{
  "query": "موبايل سامسونج مستعمل",
  "language": "ar"
}'

# Test 5: English Search
test_endpoint "English Search" "POST" "/api/search" \
'{
  "query": "car for sale in Damascus",
  "language": "en"
}'

# Test 6: Query Analysis
test_endpoint "Query Analysis" "POST" "/api/analyze" \
'{
  "query": "موبايل ايفون 14 في حلب",
  "language": "ar"
}'

# Test 7: Complex Query with Attributes
test_endpoint "Complex Query with Attributes" "POST" "/api/search" \
'{
  "query": "سيارة تويوتا موديل 2020 رخيصة في حمص",
  "language": "ar"
}'

echo ""
echo "========================================="
echo "Test suite completed!"
echo "========================================="
