# Sign Module - Quick Reference Guide

## For Developers Working on the Sign Module

This is a quick reference guide for developers working on the Sign module. For comprehensive analysis, see [SIGN_MODULE_COMPREHENSIVE_ANALYSIS.md](./SIGN_MODULE_COMPREHENSIVE_ANALYSIS.md).

---

## Current Architecture

### Services (Business Logic)

```
src/lib/
├── signature-request-service.ts          ⚠️ LEGACY - Use unified-signature-service instead
├── unified-signature-service.ts          ✅ CURRENT - Main service for signature operations
├── multi-signature-service.ts            ⚠️ SPECIALIZED - Overlaps with unified service
├── signing-workflow-service.ts           ⚠️ WORKFLOW - Overlaps with multi-signature
├── multi-signature-workflow-service.ts   ⚠️ ADVANCED - Duplicate functionality
├── signature-recipient-service.ts        ✅ ACTIVE - Recipient operations
├── real-time-status-service.ts           ✅ ACTIVE - Real-time updates
├── qr-pdf-service.ts                     ✅ ACTIVE - PDF generation with QR codes
└── upstash-analytics.ts                  ✅ ACTIVE - Analytics tracking
```

**⚠️ WARNING:** Multiple overlapping services exist. Use `unified-signature-service.ts` for new code.

---

### API Routes

```
src/app/api/
├── signature-requests/
│   ├── route.ts                    GET, POST - List/Create requests
│   ├── sign/route.ts               POST - Sign a document
│   ├── generate-pdf/route.ts       POST - Generate PDF with QR
│   └── [id]/
│       └── remind/route.ts         POST - Send reminder
├── signing/
│   └── totp-verify/route.ts        POST - Verify TOTP token
├── signing-requests/
│   └── route.ts                    GET - List requests (duplicate?)
└── verify/
    └── [requestId]/route.ts        GET, POST - Verify signature
```

**⚠️ WARNING:** Inconsistent naming (`signature-requests` vs `signing-requests`).

---

### Components

```
components/features/documents/
├── request-signature-modal.tsx           ⚠️ LARGE (500+ lines) - Needs refactoring
├── unified-signing-requests-list.tsx     ⚠️ LARGE (800+ lines) - Needs refactoring
├── pdf-signing-screen.tsx                ⚠️ LARGE (600+ lines) - Needs refactoring
└── request-details-modal.tsx             ✅ OK

components/features/signature/
└── signature-pad.tsx                     ✅ GOOD - Focused component
```

**⚠️ WARNING:** Large components with multiple responsibilities. Consider breaking down.

---

## Common Tasks

### 1. Creating a Signature Request

**Current Approach:**

```typescript
import { UnifiedSignatureService } from '@/lib/unified-signature-service'

const result = await UnifiedSignatureService.createSignatureRequest({
  documentId: 'doc-uuid',
  documentTitle: 'Contract Agreement',
  signers: [
    { name: 'John Doe', email: 'john@example.com', order: 1 },
    { name: 'Jane Smith', email: 'jane@example.com', order: 2 }
  ],
  signingOrder: 'sequential', // or 'parallel'
  message: 'Please review and sign',
  dueDate: new Date('2025-12-31'),
  requireTOTP: true
})

if (result.success) {
  console.log('Request created:', result.data.id)
} else {
  console.error('Error:', result.error)
}
```

**⚠️ Issues:**
- No input validation (add Zod schema)
- Inconsistent error handling
- No type safety for return value

---

### 2. Signing a Document

**Current Approach:**

```typescript
import { UnifiedSignatureService } from '@/lib/unified-signature-service'

const result = await UnifiedSignatureService.signDocument({
  requestId: 'request-uuid',
  signerId: 'signer-uuid',
  signatureData: 'data:image/png;base64,...',
  totpToken: '123456', // If TOTP required
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
})

if (result.success) {
  console.log('Document signed successfully')
} else {
  console.error('Error:', result.error)
}
```

**⚠️ Issues:**
- Manual IP and user agent extraction
- No automatic next signer notification
- Inconsistent error codes

---

### 3. Getting Signature Request Status

**Current Approach:**

```typescript
import { supabaseAdmin } from '@/lib/supabase-admin'

const { data: request, error } = await supabaseAdmin
  .from('signing_requests')
  .select(`
    *,
    signers:signing_request_signers(*)
  `)
  .eq('id', requestId)
  .single()

if (error) {
  console.error('Error:', error)
  return null
}

// Calculate status
const allSigned = request.signers.every(s => s.status === 'signed')
const status = allSigned ? 'completed' : 'pending'
```

**⚠️ Issues:**
- Direct database access instead of service
- Manual status calculation
- No caching

---

### 4. Sending Reminders

**Current Approach:**

```typescript
// API route: POST /api/signature-requests/[id]/remind
const response = await fetch(`/api/signature-requests/${requestId}/remind`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})

const result = await response.json()
```

**⚠️ Issues:**
- No rate limiting check on client side
- No feedback on reminder status
- Hardcoded 24-hour cooldown

---

### 5. Real-Time Status Updates

**Current Approach:**

```typescript
import { RealTimeStatusService } from '@/lib/real-time-status-service'

// Subscribe to updates
const unsubscribe = await RealTimeStatusService.subscribeToRequestUpdates(
  requestId,
  (update) => {
    console.log('Status update:', update)
    // Update UI
  }
)

// Clean up on unmount
useEffect(() => {
  return () => {
    unsubscribe()
  }
}, [])
```

**✅ Good:** Proper cleanup handling

---

## Database Schema

### Main Tables

**signing_requests**
```sql
id                UUID PRIMARY KEY
document_id       UUID REFERENCES documents(id)
initiated_by      UUID REFERENCES auth.users(id)
title             VARCHAR(255)
status            VARCHAR(20) -- 'pending', 'in_progress', 'completed', 'cancelled', 'expired'
signing_order     VARCHAR(20) -- 'sequential', 'parallel'
message           TEXT
due_date          TIMESTAMP
require_totp      BOOLEAN
created_at        TIMESTAMP
updated_at        TIMESTAMP
completed_at      TIMESTAMP
```

**signing_request_signers**
```sql
id                    UUID PRIMARY KEY
signing_request_id    UUID REFERENCES signing_requests(id) ON DELETE CASCADE
signer_name           VARCHAR(255)
signer_email          VARCHAR(255)
signing_order         INTEGER
status                VARCHAR(20) -- 'pending', 'signed', 'declined', 'expired'
signature_data        TEXT
signed_at             TIMESTAMP
ip_address            VARCHAR(45)
user_agent            TEXT
totp_verified         BOOLEAN
```

**⚠️ Missing Indexes:**
```sql
-- Add these for better performance
CREATE INDEX idx_signing_requests_user_status ON signing_requests(initiated_by, status);
CREATE INDEX idx_signing_request_signers_email_status ON signing_request_signers(signer_email, status);
CREATE INDEX idx_signing_requests_created_at ON signing_requests(created_at DESC);
```

---

## Common Pitfalls

### 1. Service Selection ❌

**Wrong:**
```typescript
import { SignatureRequestService } from '@/lib/signature-request-service' // Legacy!
```

**Right:**
```typescript
import { UnifiedSignatureService } from '@/lib/unified-signature-service'
```

---

### 2. Error Handling ❌

**Wrong:**
```typescript
const result = await someService.doSomething()
if (!result) {
  // Lost error context!
  return null
}
```

**Right:**
```typescript
const result = await someService.doSomething()
if (!result.success) {
  console.error('Error:', result.error)
  throw new Error(result.error)
}
```

---

### 3. Direct Database Access ❌

**Wrong:**
```typescript
const { data } = await supabaseAdmin.from('signing_requests').select('*')
```

**Right:**
```typescript
const result = await UnifiedSignatureService.getSignatureRequests(userId)
```

---

### 4. No Input Validation ❌

**Wrong:**
```typescript
const body = await request.json()
const { documentId, signers } = body // No validation!
```

**Right:**
```typescript
import { z } from 'zod'

const schema = z.object({
  documentId: z.string().uuid(),
  signers: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email()
  }))
})

const body = await request.json()
const validatedData = schema.parse(body) // Throws if invalid
```

---

### 5. Missing Cleanup ❌

**Wrong:**
```typescript
useEffect(() => {
  RealTimeStatusService.subscribeToRequestUpdates(requestId, handleUpdate)
  // No cleanup!
}, [])
```

**Right:**
```typescript
useEffect(() => {
  const unsubscribe = RealTimeStatusService.subscribeToRequestUpdates(
    requestId,
    handleUpdate
  )
  return () => unsubscribe()
}, [requestId])
```

---

## Best Practices

### ✅ DO

1. **Use UnifiedSignatureService** for all signature operations
2. **Validate inputs** with Zod schemas
3. **Handle errors** consistently with proper error codes
4. **Clean up subscriptions** in useEffect
5. **Use caching** for frequently accessed data
6. **Add loading states** for async operations
7. **Test your code** with unit and integration tests

### ❌ DON'T

1. **Don't use legacy services** (signature-request-service.ts)
2. **Don't access database directly** - use services
3. **Don't ignore errors** - handle them properly
4. **Don't hardcode values** - use configuration
5. **Don't skip validation** - always validate inputs
6. **Don't forget cleanup** - unsubscribe from listeners
7. **Don't create large components** - break them down

---

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest'
import { UnifiedSignatureService } from '@/lib/unified-signature-service'

describe('UnifiedSignatureService', () => {
  it('should create a signature request', async () => {
    const params = {
      documentId: 'doc-123',
      documentTitle: 'Test',
      signers: [{ name: 'John', email: 'john@example.com' }]
    }

    const result = await UnifiedSignatureService.createSignatureRequest(params)

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id')
  })
})
```

### Integration Test Example

```typescript
import { POST } from '@/app/api/signature-requests/route'

describe('POST /api/signature-requests', () => {
  it('should create a signature request', async () => {
    const request = new NextRequest('http://localhost/api/signature-requests', {
      method: 'POST',
      body: JSON.stringify({
        documentId: 'doc-123',
        documentTitle: 'Test',
        signers: [{ name: 'John', email: 'john@example.com' }]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

---

## Debugging Tips

### 1. Check Service Logs

```typescript
// Add logging to services
console.log('[SignatureService] Creating request:', params)
```

### 2. Inspect Database

```sql
-- Check request status
SELECT id, title, status, created_at 
FROM signing_requests 
WHERE id = 'request-uuid';

-- Check signer status
SELECT signer_name, signer_email, status, signed_at
FROM signing_request_signers
WHERE signing_request_id = 'request-uuid';
```

### 3. Monitor Real-Time Updates

```typescript
// Add debug logging
RealTimeStatusService.subscribeToRequestUpdates(requestId, (update) => {
  console.log('[RealTime] Update received:', update)
})
```

### 4. Check Redis Cache

```typescript
import { RedisCacheService } from '@/lib/redis-cache-service'

const cached = await RedisCacheService.get(`signature:${requestId}`)
console.log('Cached data:', cached)
```

---

## Quick Links

- **Full Analysis:** [SIGN_MODULE_COMPREHENSIVE_ANALYSIS.md](./SIGN_MODULE_COMPREHENSIVE_ANALYSIS.md)
- **Executive Summary:** [SIGN_MODULE_EXECUTIVE_SUMMARY.md](./SIGN_MODULE_EXECUTIVE_SUMMARY.md)
- **Services:** `/src/lib/`
- **API Routes:** `/src/app/api/signature-requests/`
- **Components:** `/src/components/features/documents/`
- **Database Schema:** `/database/SUPABASE_SETUP.sql`

---

**Last Updated:** 2025-11-03  
**Version:** 1.0

