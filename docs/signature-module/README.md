# Signature Module Documentation

## Overview

The Signature Module is a production-ready electronic signature system with comprehensive security, performance optimization, and enterprise features.

---

## Features

### Core Functionality
- ✅ Create and manage signature requests
- ✅ Multiple signature types (simple, advanced, qualified)
- ✅ Sequential and parallel signing workflows
- ✅ Template-based document creation
- ✅ Bulk operations for efficiency
- ✅ Real-time analytics and reporting

### Security
- ✅ TOTP/MFA verification for sensitive documents
- ✅ Complete audit trail with IP and user agent logging
- ✅ Cross-user signing prevention
- ✅ Row-level security with proper authorization
- ✅ Rate limiting to prevent abuse

### Performance
- ✅ Redis caching for templates (10 min TTL)
- ✅ Redis caching for analytics (5 min TTL)
- ✅ Optimized database indexes
- ✅ Efficient pagination
- ✅ Query parameter validation

### Developer Experience
- ✅ Comprehensive API documentation
- ✅ TypeScript type safety
- ✅ Zod schema validation
- ✅ Standardized error responses
- ✅ Rate limit headers
- ✅ Cache headers (X-Cache, ETag, Cache-Control)

---

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### 2. Configuration

Add to `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 3. Database Migration

```bash
# Run migration
psql -h your-host -U your-user -d your-db -f database/migrations/002_signature_indexes.sql
```

### 4. Start Development Server

```bash
npm run dev
```

---

## Documentation

### For Users
- **[User Guide](./USER_GUIDE.md)** - Complete guide for using the signature module
  - Creating signature requests
  - Signing documents
  - Using templates
  - Bulk operations
  - Analytics and reporting

### For Developers
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
  - All endpoints with examples
  - Request/response schemas
  - Error codes
  - Rate limiting
  - Caching behavior

### For DevOps
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Upgrade and migration instructions
  - Breaking changes
  - Database migrations
  - Code migration examples
  - Rollback procedures

### For QA
- **[Testing Guide](./TESTING_GUIDE.md)** - Comprehensive testing strategies
  - Unit tests
  - Integration tests
  - E2E tests
  - Security tests
  - Performance tests

---

## Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Caching**: Upstash Redis
- **Validation**: Zod
- **Authentication**: Supabase Auth
- **TOTP**: otplib
- **Language**: TypeScript

### Directory Structure

```
src/
├── app/api/v1/signatures/          # API routes
│   ├── requests/                   # Signature requests
│   ├── templates/                  # Templates
│   ├── analytics/                  # Analytics
│   └── ...
├── lib/signature/                  # Core logic
│   ├── core/                       # Core services
│   ├── validation/                 # Zod schemas
│   ├── middleware/                 # Rate limiting, caching
│   ├── templates/                  # Template service
│   ├── analytics/                  # Analytics service
│   ├── bulk/                       # Bulk operations
│   ├── fields/                     # Field management
│   └── offline/                    # Offline support
├── components/features/signatures/ # UI components
└── database/migrations/            # Database migrations
```

### Data Flow

```
Client Request
    ↓
API Route (rate limiting)
    ↓
Validation (Zod schemas)
    ↓
Cache Check (Redis)
    ↓
Service Layer
    ↓
Database (Supabase)
    ↓
Cache Update (Redis)
    ↓
Response (with headers)
```

---

## API Endpoints

### Signature Requests
- `GET /api/v1/signatures/requests` - List requests
- `POST /api/v1/signatures/requests` - Create request
- `GET /api/v1/signatures/requests/:id` - Get request
- `PATCH /api/v1/signatures/requests/:id` - Update request
- `DELETE /api/v1/signatures/requests/:id` - Delete request
- `POST /api/v1/signatures/requests/:id/sign` - Sign document
- `POST /api/v1/signatures/requests/:id/cancel` - Cancel request

### Bulk Operations
- `POST /api/v1/signatures/requests/bulk` - Bulk operations

### Templates
- `GET /api/v1/signatures/templates` - List templates
- `POST /api/v1/signatures/templates` - Create template
- `GET /api/v1/signatures/templates/:id` - Get template
- `PATCH /api/v1/signatures/templates/:id` - Update template
- `DELETE /api/v1/signatures/templates/:id` - Delete template
- `POST /api/v1/signatures/templates/:id/apply` - Apply template

### Analytics
- `GET /api/v1/signatures/analytics` - Get analytics

See [API Reference](./API_REFERENCE.md) for complete documentation.

---

## Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Standard | 100 requests | 1 hour |
| Bulk | 5 requests | 1 hour |
| Reminders | 20 requests | 1 hour |

Rate limit headers included in all responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Caching

| Resource | TTL | Invalidation |
|----------|-----|--------------|
| Templates | 10 minutes | On update/delete |
| Analytics | 5 minutes | On data change |

Cache headers included:
- `X-Cache: HIT/MISS`
- `Cache-Control`
- `ETag`

---

## Security Features

### Authentication
- Supabase Auth required for all endpoints
- JWT token validation
- Session management

### Authorization
- Row-level security
- User can only access own requests
- Signers can only access assigned documents
- Cross-user signing prevention

### TOTP/MFA
- Optional TOTP verification for signing
- Setup in Settings > Signing Setup
- 6-digit code with 30-second window
- Uses otplib for verification

### Audit Trail
- All actions logged
- IP address captured
- User agent captured
- Timestamp recorded
- Immutable audit log

### Rate Limiting
- Prevents abuse
- Per-user limits
- Sliding window algorithm
- Automatic retry headers

---

## Performance

### Optimizations
- Database indexes on frequently queried columns
- Redis caching for templates and analytics
- Efficient pagination
- Query parameter validation
- Connection pooling

### Benchmarks
- List 100 requests: <500ms
- Get single request: <100ms
- Sign document: <200ms
- Template cache hit: <10ms

---

## Error Handling

All errors follow standard format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* Additional context */ }
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

---

## Testing

### Coverage Goals
- Unit tests: >80% coverage
- Integration tests: All API routes
- E2E tests: Critical workflows
- Security tests: Common vulnerabilities
- Performance tests: Benchmarks

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

See [Testing Guide](./TESTING_GUIDE.md) for details.

---

## Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (Upstash)
- Supabase project

### Steps

1. **Environment Setup**
   ```bash
   cp .env.example .env.production
   # Configure production variables
   ```

2. **Database Migration**
   ```bash
   psql -h prod-host -U prod-user -d prod-db -f database/migrations/002_signature_indexes.sql
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Deploy**
   ```bash
   npm run start
   ```

---

## Monitoring

### Metrics to Track
- Request rate
- Error rate
- Response time
- Cache hit rate
- Database query time
- Rate limit hits

### Logging
- Application logs: stdout
- Error logs: stderr
- Audit logs: database
- Access logs: web server

---

## Support

### Getting Help
1. Check documentation
2. Review [API Reference](./API_REFERENCE.md)
3. Check [Testing Guide](./TESTING_GUIDE.md)
4. Contact support

### Reporting Issues
Include:
- Request ID
- Error message
- Steps to reproduce
- Expected vs actual behavior
- Environment details

---

## Changelog

### Version 2.0.0 (Current)

**Security Fixes:**
- Fixed received view filtering for UUID/email auth
- Fixed authorization checks in getRequest
- Implemented real TOTP verification
- Added cross-user signing prevention
- Added audit context (IP, user agent)

**Performance:**
- Added rate limiting (100/5/20 req/hour)
- Added Redis caching (10/5 min TTL)
- Optimized database indexes

**API Improvements:**
- Query parameter validation
- Standardized error responses
- Rate limit headers
- Cache headers

**Breaking Changes:**
- SignatureField position structure (flat → nested)
- BulkOperationResult data → payload
- Service method signatures (added authUserEmail, IP, userAgent)

See [Migration Guide](./MIGRATION_GUIDE.md) for upgrade instructions.

---

## License

[Your License Here]

---

## Contributors

[Your Team Here]

---

**Last Updated:** 2024-01-31
**Version:** 2.0.0

