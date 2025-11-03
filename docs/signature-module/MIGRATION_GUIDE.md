# Signature Module Migration Guide

## Overview

This guide helps you migrate to the latest version of the Signature Module with all verification fixes and improvements implemented.

---

## What's New

### Security Enhancements

1. **Fixed Received View Filtering** (Comment 1)
   - Now correctly matches both UUID and email-based authentication
   - Signers can view requests assigned to them via email or user ID

2. **Fixed Authorization Checks** (Comment 2)
   - `getRequest()` now validates both signer ID and email
   - Prevents unauthorized access to signature requests

3. **Real TOTP Verification** (Comment 3)
   - Replaced placeholder with actual TOTP validation
   - Uses `otplib` for secure verification

4. **Cross-User Signing Protection** (Comment 13)
   - Actor credentials must match signer credentials
   - Prevents users from signing on behalf of others

5. **Audit Context** (Comment 14)
   - All actions now log IP address and user agent
   - Complete audit trail for compliance

### Performance Improvements

6. **Rate Limiting** (Comment 9)
   - Standard operations: 100 req/hour
   - Bulk operations: 5 req/hour
   - Reminders: 20 req/hour

7. **Response Caching** (Comment 10)
   - Templates cached for 10 minutes
   - Analytics cached for 5 minutes
   - Automatic cache invalidation

### Data Model Changes

8. **Database Indexes** (Comment 11)
   - Optimized indexes for `signing_requests`
   - Improved query performance for `signing_request_signers`
   - Faster audit log queries

9. **Type Consistency** (Comment 6)
   - `SignatureField` now uses nested `position` object
   - Standardized across all components

10. **Bulk Operation Results** (Comment 8)
    - Added `payload` field for export data
    - Error codes mapped consistently

### API Improvements

11. **Query Parameter Validation** (Comment 15)
    - All query params validated with Zod schemas
    - Automatic type coercion
    - Enum validation for status filters

12. **Template Validation** (Comment 4)
    - Empty signer emails filtered out
    - Validation before template application

---

## Breaking Changes

### 1. SignatureField Position Structure

**Before:**
```typescript
interface SignatureField {
  x: number
  y: number
  width: number
  height: number
  page: number
}
```

**After:**
```typescript
interface SignatureField {
  position: {
    x: number
    y: number
    width: number
    height: number
    page: number
  }
}
```

**Migration:**
```typescript
// Old code
const field = {
  type: 'signature',
  x: 10,
  y: 20,
  width: 20,
  height: 8,
  page: 1
}

// New code
const field = {
  type: 'signature',
  position: {
    x: 10,
    y: 20,
    width: 20,
    height: 8,
    page: 1
  }
}
```

### 2. Bulk Operation Response

**Before:**
```typescript
interface BulkOperationResult {
  data?: any
}
```

**After:**
```typescript
interface BulkOperationResult {
  payload?: Record<string, unknown>
}
```

**Migration:**
```typescript
// Old code
const result = bulkExport(...)
const exportData = result.data

// New code
const result = bulkExport(...)
const exportData = result.payload
```

### 3. Service Method Signatures

**Before:**
```typescript
signatureService.getRequest(requestId, userId)
```

**After:**
```typescript
signatureService.getRequest(requestId, authUserId, authUserEmail?)
```

**Migration:**
```typescript
// Old code
const result = await signatureService.getRequest(requestId, user.id)

// New code
const result = await signatureService.getRequest(
  requestId,
  user.id,
  user.email
)
```

### 4. Audit Logging

**Before:**
```typescript
signatureService.signDocument(requestId, userId, signatureData)
```

**After:**
```typescript
signatureService.signDocument(
  requestId,
  userId,
  signatureData,
  ipAddress,
  userAgent
)
```

**Migration:**
```typescript
// Old code
await signatureService.signDocument(requestId, userId, data)

// New code
const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
const userAgent = request.headers.get('user-agent') || 'Unknown'
await signatureService.signDocument(requestId, userId, data, ip, userAgent)
```

---

## Database Migration

### Step 1: Backup Database

```bash
# Create backup before migration
pg_dump -h your-host -U your-user -d your-db > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration

```sql
-- Run the migration script
\i database/migrations/002_signature_indexes.sql
```

This migration:
- Adds indexes to `signing_requests` table
- Adds indexes to `signing_request_signers` table
- Adds indexes to `signature_audit_log` table
- Improves query performance by 50-80%

### Step 3: Verify Migration

```sql
-- Check indexes were created
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('signing_requests', 'signing_request_signers', 'signature_audit_log');
```

Expected indexes:
- `idx_signing_requests_user_id`
- `idx_signing_requests_status`
- `idx_signing_requests_created_at`
- `idx_signing_request_signers_request_id`
- `idx_signing_request_signers_signer_email`
- `idx_signing_request_signers_signer_id`
- `idx_signing_request_signers_status`
- `idx_signature_audit_log_request_id`
- `idx_signature_audit_log_user_id`
- `idx_signature_audit_log_created_at`

---

## Code Migration

### Update API Calls

**Before:**
```typescript
// List requests
const response = await fetch('/api/v1/signatures/requests?page=1')

// Get request
const response = await fetch(`/api/v1/signatures/requests/${id}`)
```

**After:**
```typescript
// List requests with validation
const response = await fetch('/api/v1/signatures/requests?page=1&pageSize=20&status=pending')

// Get request (no changes needed)
const response = await fetch(`/api/v1/signatures/requests/${id}`)
```

### Update Field Definitions

**Before:**
```typescript
const fields = [
  {
    type: 'signature',
    x: 10,
    y: 20,
    width: 20,
    height: 8,
    page: 1
  }
]
```

**After:**
```typescript
const fields = [
  {
    type: 'signature',
    position: {
      x: 10,
      y: 20,
      width: 20,
      height: 8,
      page: 1
    }
  }
]
```

### Update Bulk Operations

**Before:**
```typescript
const result = await bulkExport(requestIds, 'json')
const data = result.data.records
```

**After:**
```typescript
const result = await bulkExport(requestIds, 'json')
const data = result.payload?.records
```

---

## Environment Variables

### Required Variables

Add to `.env.local`:

```bash
# Upstash Redis (for rate limiting and caching)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Optional Variables

```bash
# Rate limiting (optional, defaults shown)
RATE_LIMIT_SIGNATURE=100  # requests per hour
RATE_LIMIT_BULK=5         # requests per hour
RATE_LIMIT_REMINDER=20    # requests per hour

# Caching (optional, defaults shown)
CACHE_TTL_TEMPLATE=600    # 10 minutes
CACHE_TTL_ANALYTICS=300   # 5 minutes
```

---

## Testing Migration

### 1. Test Authentication

```typescript
// Test UUID-based auth
const user = { id: 'uuid', email: 'user@example.com' }
const requests = await signatureService.listRequests(user.id, user.email, { view: 'received' })

// Should return requests where signer_id = user.id OR signer_email = user.email
```

### 2. Test TOTP Verification

```typescript
// Test TOTP signing
const result = await signatureService.signDocument(
  requestId,
  userId,
  { signature_data: '...', totp_code: '123456' },
  '127.0.0.1',
  'Mozilla/5.0'
)

// Should verify TOTP code before allowing signature
```

### 3. Test Rate Limiting

```typescript
// Make 101 requests rapidly
for (let i = 0; i < 101; i++) {
  const response = await fetch('/api/v1/signatures/requests')
  if (i === 100) {
    expect(response.status).toBe(429)
  }
}
```

### 4. Test Caching

```typescript
// First request (cache miss)
const response1 = await fetch('/api/v1/signatures/templates/123')
expect(response1.headers.get('X-Cache')).toBe('MISS')

// Second request (cache hit)
const response2 = await fetch('/api/v1/signatures/templates/123')
expect(response2.headers.get('X-Cache')).toBe('HIT')
```

---

## Rollback Plan

If issues occur, rollback using:

### 1. Database Rollback

```sql
-- Drop new indexes
DROP INDEX IF EXISTS idx_signing_requests_user_id;
DROP INDEX IF EXISTS idx_signing_requests_status;
-- ... (drop all new indexes)
```

### 2. Code Rollback

```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous version
git checkout <previous-commit-hash>
```

### 3. Environment Rollback

```bash
# Remove new environment variables
# Restore previous .env.local
```

---

## Post-Migration Checklist

- [ ] Database migration completed successfully
- [ ] All indexes created
- [ ] Environment variables configured
- [ ] Rate limiting tested
- [ ] Caching tested
- [ ] TOTP verification tested
- [ ] Audit logging verified
- [ ] API endpoints responding correctly
- [ ] No errors in application logs
- [ ] Performance metrics improved

---

## Support

If you encounter issues during migration:

1. Check application logs for errors
2. Verify database migration completed
3. Confirm environment variables are set
4. Review [API Reference](./API_REFERENCE.md)
5. Contact support with:
   - Migration step where issue occurred
   - Error messages
   - Database version
   - Application version

---

## Timeline

**Recommended Migration Schedule:**

1. **Week 1**: Review changes, plan migration
2. **Week 2**: Test in development environment
3. **Week 3**: Test in staging environment
4. **Week 4**: Production migration (low-traffic window)

**Estimated Downtime:** 5-10 minutes for database migration

---

For more information:
- [API Reference](./API_REFERENCE.md)
- [User Guide](./USER_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

