#!/bin/bash

# Test script for Nutritionix Search API endpoint
# Usage: ./scripts/test-nutritionix-search.sh [query] [base-url]
#
# Examples:
#   ./scripts/test-nutritionix-search.sh "apple"
#   ./scripts/test-nutritionix-search.sh "chicken breast" "http://localhost:3000"
#   ./scripts/test-nutritionix-search.sh "coke" "https://your-domain.vercel.app"

set -e

# Configuration
QUERY="${1:-apple}"
BASE_URL="${2:-http://localhost:3000}"
TEST_USER_ID="test-user-nutritionix"

echo "======================================"
echo "Nutritionix Search API Test"
echo "======================================"
echo "Query: $QUERY"
echo "Base URL: $BASE_URL"
echo "User ID: $TEST_USER_ID"
echo "======================================"
echo ""

# Test 1: Search with valid query
echo "Test 1: Search for '$QUERY'"
echo "--------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/metabolic/nutritionix/search" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $TEST_USER_ID" \
  -d "{\"query\": \"$QUERY\"}")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.'

if [ "$http_code" -eq 200 ]; then
  result_count=$(echo "$body" | jq '.results | length')
  echo ""
  echo "✅ Test 1 PASSED: Found $result_count results"
else
  echo ""
  echo "❌ Test 1 FAILED: Expected 200, got $http_code"
  exit 1
fi

echo ""
echo ""

# Test 2: Empty query (should fail with 400)
echo "Test 2: Empty query (should fail with 400)"
echo "--------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/metabolic/nutritionix/search" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $TEST_USER_ID" \
  -d '{"query": ""}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.'

if [ "$http_code" -eq 400 ]; then
  echo ""
  echo "✅ Test 2 PASSED: Correctly rejected empty query"
else
  echo ""
  echo "❌ Test 2 FAILED: Expected 400, got $http_code"
  exit 1
fi

echo ""
echo ""

# Test 3: Missing authentication (should fail with 401)
echo "Test 3: Missing authentication (should fail with 401)"
echo "--------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/metabolic/nutritionix/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "apple"}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.'

if [ "$http_code" -eq 401 ]; then
  echo ""
  echo "✅ Test 3 PASSED: Correctly rejected missing authentication"
else
  echo ""
  echo "❌ Test 3 FAILED: Expected 401, got $http_code"
  exit 1
fi

echo ""
echo ""

# Test 4: Query too long (should fail with 400)
echo "Test 4: Query too long >100 chars (should fail with 400)"
echo "--------------------------------------"
long_query=$(printf 'a%.0s' {1..101})
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/metabolic/nutritionix/search" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $TEST_USER_ID" \
  -d "{\"query\": \"$long_query\"}")

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.'

if [ "$http_code" -eq 400 ]; then
  echo ""
  echo "✅ Test 4 PASSED: Correctly rejected query too long"
else
  echo ""
  echo "❌ Test 4 FAILED: Expected 400, got $http_code"
  exit 1
fi

echo ""
echo ""

# Test 5: Search for branded food
echo "Test 5: Search for branded food (coke)"
echo "--------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/metabolic/nutritionix/search" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $TEST_USER_ID" \
  -d '{"query": "coke"}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"

if [ "$http_code" -eq 200 ]; then
  result_count=$(echo "$body" | jq '.results | length')
  branded_count=$(echo "$body" | jq '[.results[] | select(.isCommon == false)] | length')
  echo "Total results: $result_count"
  echo "Branded results: $branded_count"
  echo ""
  echo "Sample result:"
  echo "$body" | jq '.results[0]'
  echo ""
  echo "✅ Test 5 PASSED: Found $branded_count branded foods"
else
  echo "Response:"
  echo "$body" | jq '.'
  echo ""
  echo "❌ Test 5 FAILED: Expected 200, got $http_code"
  exit 1
fi

echo ""
echo ""

# Summary
echo "======================================"
echo "All Tests Passed! ✅"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Test with real Nutritionix API credentials (set USE_MOCK_APIS=false)"
echo "2. Integrate into mobile app"
echo "3. Monitor API usage (stay within 500 requests/day on free tier)"
echo ""
