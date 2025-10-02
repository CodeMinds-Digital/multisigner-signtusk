#!/bin/bash

# Redis & QStash End-to-End Test Script
# Tests all integrations to verify everything is working

echo "🧪 Redis & QStash End-to-End Test Suite"
echo "========================================"
echo ""

BASE_URL="http://localhost:3000"
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

info() {
    echo -e "${YELLOW}ℹ️  INFO${NC}: $1"
}

echo "📋 Test 1: Redis Health Check"
echo "------------------------------"
REDIS_HEALTH=$(curl -s "$BASE_URL/api/health/redis")
REDIS_STATUS=$(echo "$REDIS_HEALTH" | jq -r '.status')

if [ "$REDIS_STATUS" = "healthy" ]; then
    pass "Redis is healthy"
    
    # Check individual services
    CACHE_STATUS=$(echo "$REDIS_HEALTH" | jq -r '.services.cache.status')
    if [ "$CACHE_STATUS" = "healthy" ]; then
        pass "Cache service is healthy"
    else
        fail "Cache service is not healthy: $CACHE_STATUS"
    fi
    
    QUEUE_STATUS=$(echo "$REDIS_HEALTH" | jq -r '.services.jobQueue.status')
    if [ "$QUEUE_STATUS" = "healthy" ]; then
        pass "Job queue service is healthy"
    else
        fail "Job queue service is not healthy: $QUEUE_STATUS"
    fi
    
    ANALYTICS_STATUS=$(echo "$REDIS_HEALTH" | jq -r '.services.analytics.status')
    if [ "$ANALYTICS_STATUS" = "healthy" ]; then
        pass "Analytics service is healthy"
    else
        fail "Analytics service is not healthy: $ANALYTICS_STATUS"
    fi
else
    fail "Redis is not healthy: $REDIS_STATUS"
fi

echo ""
echo "📋 Test 2: QStash Configuration"
echo "------------------------------"
HAS_QSTASH=$(echo "$REDIS_HEALTH" | jq -r '.environment.hasQStashToken')
if [ "$HAS_QSTASH" = "true" ]; then
    pass "QStash token is configured"
else
    fail "QStash token is not configured"
fi

echo ""
echo "📋 Test 3: Cache Operations"
echo "------------------------------"
CACHE_OPS=$(echo "$REDIS_HEALTH" | jq -r '.services.cache.operations')
SET_OK=$(echo "$CACHE_OPS" | jq -r '.set')
GET_OK=$(echo "$CACHE_OPS" | jq -r '.get')
DELETE_OK=$(echo "$CACHE_OPS" | jq -r '.delete')

if [ "$SET_OK" = "true" ]; then
    pass "Cache SET operation works"
else
    fail "Cache SET operation failed"
fi

if [ "$GET_OK" = "true" ]; then
    pass "Cache GET operation works"
else
    fail "Cache GET operation failed"
fi

if [ "$DELETE_OK" = "true" ]; then
    pass "Cache DELETE operation works"
else
    fail "Cache DELETE operation failed"
fi

echo ""
echo "📋 Test 4: Job Queue Stats"
echo "------------------------------"
EMAIL_JOBS=$(echo "$REDIS_HEALTH" | jq -r '.services.jobQueue.stats.email.total')
PDF_JOBS=$(echo "$REDIS_HEALTH" | jq -r '.services.jobQueue.stats["pdf-generation"].total')
NOTIFICATION_JOBS=$(echo "$REDIS_HEALTH" | jq -r '.services.jobQueue.stats.notification.total')

info "Email jobs: $EMAIL_JOBS total"
info "PDF generation jobs: $PDF_JOBS total"
info "Notification jobs: $NOTIFICATION_JOBS total"

if [ "$EMAIL_JOBS" != "null" ]; then
    pass "Email job queue is accessible"
else
    fail "Email job queue is not accessible"
fi

echo ""
echo "📋 Test 5: Analytics Tracking"
echo "------------------------------"
HAS_ANALYTICS=$(echo "$REDIS_HEALTH" | jq -r '.services.analytics.hasAnalytics')
HAS_PERFORMANCE=$(echo "$REDIS_HEALTH" | jq -r '.services.analytics.hasPerformanceMetrics')

if [ "$HAS_ANALYTICS" = "true" ]; then
    pass "Analytics tracking is enabled"
else
    fail "Analytics tracking is not enabled"
fi

if [ "$HAS_PERFORMANCE" = "true" ]; then
    pass "Performance metrics tracking is enabled"
else
    fail "Performance metrics tracking is not enabled"
fi

TODAY_VIEWS=$(echo "$REDIS_HEALTH" | jq -r '.services.analytics.todayViews')
TODAY_SIGS=$(echo "$REDIS_HEALTH" | jq -r '.services.analytics.todaySignatures')
info "Today's document views: $TODAY_VIEWS"
info "Today's signatures: $TODAY_SIGS"

echo ""
echo "📋 Test 6: Job Handlers Availability"
echo "------------------------------"

# Test email job handler
EMAIL_HANDLER=$(curl -s "$BASE_URL/api/jobs/send-email")
EMAIL_SERVICE=$(echo "$EMAIL_HANDLER" | jq -r '.service')
if [ "$EMAIL_SERVICE" = "Email Job Handler" ]; then
    pass "Email job handler is available"
else
    fail "Email job handler is not available"
fi

# Test PDF generation job handler
PDF_HANDLER=$(curl -s "$BASE_URL/api/jobs/generate-pdf")
PDF_SERVICE=$(echo "$PDF_HANDLER" | jq -r '.service')
if [ "$PDF_SERVICE" = "PDF Generation Job Handler" ]; then
    pass "PDF generation job handler is available"
else
    fail "PDF generation job handler is not available"
fi

# Test notification job handler
NOTIF_HANDLER=$(curl -s "$BASE_URL/api/jobs/send-notification")
NOTIF_SERVICE=$(echo "$NOTIF_HANDLER" | jq -r '.service')
if [ "$NOTIF_SERVICE" = "Notification Job Handler" ]; then
    pass "Notification job handler is available"
else
    fail "Notification job handler is not available"
fi

# Test analytics aggregation job handler
ANALYTICS_HANDLER=$(curl -s "$BASE_URL/api/jobs/aggregate-analytics")
ANALYTICS_SERVICE=$(echo "$ANALYTICS_HANDLER" | jq -r '.service')
if [ "$ANALYTICS_SERVICE" = "Analytics Aggregation Job Handler" ]; then
    pass "Analytics aggregation job handler is available"
else
    fail "Analytics aggregation job handler is not available"
fi

echo ""
echo "📋 Test 7: Integration Code Check"
echo "------------------------------"

# Check if email queuing code exists
if grep -q "UpstashJobQueue.queueEmail" src/app/api/signature-requests/route.ts; then
    pass "Email queuing integration code is present"
else
    fail "Email queuing integration code is missing"
fi

# Check if analytics tracking exists
if grep -q "UpstashAnalytics.trackDocumentView" src/app/api/signature-requests/\[id\]/route.ts; then
    pass "Document view analytics code is present"
else
    fail "Document view analytics code is missing"
fi

if grep -q "UpstashAnalytics.trackSignatureCompletion" src/app/api/signature-requests/sign/route.ts; then
    pass "Signature completion analytics code is present"
else
    fail "Signature completion analytics code is missing"
fi

# Check if caching code exists
if grep -q "RedisCacheService.getDocument" src/app/api/signature-requests/\[id\]/route.ts; then
    pass "Document caching code is present"
else
    fail "Document caching code is missing"
fi

if grep -q "RedisCacheService.invalidateDocument" src/app/api/signature-requests/sign/route.ts; then
    pass "Cache invalidation code is present"
else
    fail "Cache invalidation code is missing"
fi

echo ""
echo "========================================"
echo "📊 Test Results Summary"
echo "========================================"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Redis & QStash integration is working perfectly!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the failures above.${NC}"
    exit 1
fi

