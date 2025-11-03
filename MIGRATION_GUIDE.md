# Migration Guide: Legacy Services to New Signature Module

**Date:** 2025-11-03  
**Status:** Required Action  
**Impact:** Breaking Changes

---

## Overview

The legacy signature services have been deleted and replaced with a new unified signature module. This guide will help you migrate your code to use the new services.

## Deleted Services

The following services have been removed:
- ❌ `src/lib/signature-request-service.ts`
- ❌ `src/lib/unified-signature-service.ts`
- ❌ `src/lib/multi-signature-service.ts`
- ❌ `src/lib/signing-workflow-service.ts`
- ❌ `src/lib/multi-signature-workflow-service.ts`

## New Service Structure

```
src/lib/signature/
├── core/
│   └── signature-service.ts          # Main unified service
├── templates/
│   └── template-service.ts           # Template management
├── bulk/
│   └── bulk-operations-service.ts    # Bulk operations
├── analytics/
│   └── analytics-service.ts          # Analytics & metrics
├── expiration/
│   └── expiration-service.ts         # Expiration management
├── fields/
│   └── field-service.ts              # Field positioning
├── offline/
│   └── offline-service.ts            # Offline support
├── types/
│   └── signature-types.ts            # TypeScript types
├── errors/
│   └── signature-errors.ts           # Error classes
├── validation/
│   └── signature-validation-schemas.ts # Zod schemas
└── config/
    └── signature-config.ts           # Configuration
```

---

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { SigningWorkflowService } from '@/lib/signing-workflow-service'
import { UnifiedSignatureService } from '@/lib/unified-signature-service'
import { MultiSignatureService } from '@/lib/multi-signature-service'
```

**After:**
```typescript
import { signatureService } from '@/lib/signature/core/signature-service'
import type { SignatureRequest, Signer } from '@/lib/signature/types/signature-types'
```

### Step 2: Update Method Calls

#### Creating a Signature Request

**Before:**
```typescript
const result = await SigningWorkflowService.createSigningRequest({
  documentId: 'doc-123',
  documentTitle: 'Contract',
  signers: [{ name: 'John', email: 'john@example.com' }],
  signingOrder: 'sequential',
  expiresInDays: 30
})
```

**After:**
```typescript
const result = await signatureService.createRequest({
  document_id: 'doc-123',
  title: 'Contract',
  signers: [{ 
    name: 'John', 
    email: 'john@example.com',
    signing_order: 1 
  }],
  signing_order: 'sequential',
  expires_in_days: 30,
  initiated_by: userId
})

if (result.success) {
  console.log('Request created:', result.data)
} else {
  console.error('Error:', result.error)
}
```

#### Getting Signature Requests

**Before:**
```typescript
const requests = await SigningWorkflowService.getSigningRequests(userId)
const received = await SigningWorkflowService.getReceivedSigningRequests(userEmail)
```

**After:**
```typescript
// Get sent requests
const sentResult = await signatureService.listRequests({
  initiated_by: userId,
  page: 1,
  page_size: 20
})

// Get received requests (filter by signer email)
const receivedResult = await signatureService.listRequests({
  signer_email: userEmail,
  page: 1,
  page_size: 20
})

if (sentResult.success) {
  const { data, total, page, page_size } = sentResult.data
  console.log(`Found ${total} requests`)
}
```

#### Signing a Document

**Before:**
```typescript
const result = await UnifiedSignatureService.signDocument({
  requestId: 'req-123',
  signerId: 'signer-123',
  signatureData: 'data:image/png;base64,...',
  totpToken: '123456'
})
```

**After:**
```typescript
const result = await signatureService.signDocument({
  request_id: 'req-123',
  signer_id: 'signer-123',
  signature_data: 'data:image/png;base64,...',
  totp_token: '123456',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...'
})

if (result.success) {
  console.log('Document signed successfully')
} else {
  console.error('Error:', result.error.message)
}
```

#### Updating Request Status

**Before:**
```typescript
await SigningWorkflowService.updateRequestStatus(requestId, 'cancelled')
```

**After:**
```typescript
const result = await signatureService.cancelRequest(requestId, userId)

if (result.success) {
  console.log('Request cancelled')
}
```

---

## Type Changes

### SigningRequestListItem → SignatureRequest

**Before:**
```typescript
import { type SigningRequestListItem } from '@/lib/signing-workflow-service'

interface MyComponent {
  request: SigningRequestListItem
}
```

**After:**
```typescript
import type { SignatureRequest } from '@/lib/signature/types/signature-types'

interface MyComponent {
  request: SignatureRequest
}
```

### Field Mapping

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `documentId` | `document_id` | Snake case |
| `documentTitle` | `title` | Renamed |
| `requesterId` | `initiated_by` | Renamed |
| `expiresAt` | `expires_at` | Snake case |
| `createdAt` | `created_at` | Snake case |
| `updatedAt` | `updated_at` | Snake case |
| `signingOrder` | `signing_order` | Snake case |
| `requireTOTP` | `require_totp` | Snake case |

---

## Error Handling

### Before (Inconsistent)

```typescript
try {
  const result = await SigningWorkflowService.createSigningRequest(data)
  // Sometimes throws, sometimes returns { success: false }
} catch (error) {
  console.error(error)
}
```

### After (Standardized Result Pattern)

```typescript
const result = await signatureService.createRequest(data)

if (!result.success) {
  // Handle error
  console.error(result.error.message)
  console.error(result.error.code) // e.g., 'VALIDATION_ERROR'
  console.error(result.error.statusCode) // e.g., 400
  
  // Show recovery suggestions
  if (result.error.recoverySuggestions) {
    console.log('Try:', result.error.recoverySuggestions)
  }
  return
}

// Success - data is typed correctly
const request = result.data
console.log(request.id)
```

---

## Files That Need Updates

The following files import the deleted services and need to be updated:

1. ✅ **`src/app/api/signing-requests/route.ts`**
   - Replace `SigningWorkflowService` with `signatureService`
   - Update method calls

2. ✅ **`src/components/features/documents/received-requests-list.tsx`**
   - Replace `SigningWorkflowService` with `signatureService`
   - Update type imports

3. ✅ **`src/components/features/documents/unified-signing-requests-list.tsx`**
   - Replace type import from `signing-workflow-service`
   - Use new `SignatureRequest` type

4. ✅ **`src/components/features/documents/unified-signing-requests-list-redesigned.tsx`**
   - Replace type import
   - Use new types

5. ✅ **`src/components/features/documents/document-list.tsx`**
   - Replace `SigningWorkflowService` with `signatureService`
   - Update method calls and types

---

## New Features Available

### 1. Template System

```typescript
import { templateService } from '@/lib/signature/templates/template-service'

// Create a template
const result = await templateService.createTemplate({
  user_id: userId,
  name: 'Standard NDA',
  description: 'Non-disclosure agreement template',
  default_signers: [
    { name: 'Party A', email: '', signing_order: 1 },
    { name: 'Party B', email: '', signing_order: 2 }
  ],
  signing_order: 'sequential',
  expires_in_days: 30
})

// Apply template
const applyResult = await templateService.applyTemplate(templateId, {
  document_id: 'doc-123',
  signers: [
    { email: 'party-a@example.com' },
    { email: 'party-b@example.com' }
  ]
})
```

### 2. Bulk Operations

```typescript
import { bulkOperationsService } from '@/lib/signature/bulk/bulk-operations-service'

// Bulk remind
const result = await bulkOperationsService.executeBulkOperation({
  operation: 'remind',
  request_ids: ['req-1', 'req-2', 'req-3'],
  user_id: userId
})

console.log(`Success: ${result.success_count}, Failed: ${result.failure_count}`)
```

### 3. Analytics

```typescript
import { analyticsService } from '@/lib/signature/analytics/analytics-service'

// Get completion rate
const metrics = await analyticsService.getCompletionRate(userId, {
  start_date: '2025-01-01',
  end_date: '2025-12-31'
})

console.log(`Completion rate: ${metrics.completion_rate}%`)
```

---

## Testing Your Migration

1. **Run TypeScript compiler:**
   ```bash
   npm run type-check
   ```

2. **Test API endpoints:**
   ```bash
   curl http://localhost:3000/api/v1/signatures/requests
   ```

3. **Check for runtime errors:**
   - Test creating signature requests
   - Test signing documents
   - Test listing requests

---

## Support

If you encounter issues during migration:

1. Check the type definitions in `src/lib/signature/types/signature-types.ts`
2. Review error messages - they now include recovery suggestions
3. Consult `IMPLEMENTATION_SUMMARY.md` for complete API documentation
4. Check the new API routes in `src/app/api/v1/signatures/`

---

## Rollback Plan

If you need to rollback temporarily:

1. The legacy services are still in git history
2. You can restore them with:
   ```bash
   git checkout HEAD~1 -- src/lib/signature-request-service.ts
   git checkout HEAD~1 -- src/lib/unified-signature-service.ts
   git checkout HEAD~1 -- src/lib/multi-signature-service.ts
   git checkout HEAD~1 -- src/lib/signing-workflow-service.ts
   git checkout HEAD~1 -- src/lib/multi-signature-workflow-service.ts
   ```

However, we recommend migrating to the new services as they provide:
- ✅ Better type safety
- ✅ Standardized error handling
- ✅ Comprehensive validation
- ✅ New features (templates, bulk operations, analytics)
- ✅ Better performance
- ✅ Easier maintenance

---

**Migration Status:** 🔴 Required  
**Deadline:** Before next deployment  
**Estimated Time:** 2-4 hours

