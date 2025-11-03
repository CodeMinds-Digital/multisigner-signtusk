# Signature Module Testing Guide

## Overview

This guide provides comprehensive testing strategies and examples for the Signature Module.

**Testing Goals:**
- >80% code coverage
- All critical paths tested
- Security vulnerabilities prevented
- Performance benchmarks met

---

## Table of Contents

1. [Unit Tests](#unit-tests)
2. [Integration Tests](#integration-tests)
3. [E2E Tests](#e2e-tests)
4. [Security Tests](#security-tests)
5. [Performance Tests](#performance-tests)
6. [Test Data](#test-data)

---

## Unit Tests

### Testing Services

#### signature-service.ts

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signatureService } from '@/lib/signature/core/signature-service'

describe('SignatureService', () => {
  describe('listRequests', () => {
    it('should list requests for authenticated user', async () => {
      const result = await signatureService.listRequests(
        'user-id',
        'user@example.com',
        { page: 1, pageSize: 20 }
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBeInstanceOf(Array)
      expect(result.pagination).toBeDefined()
    })

    it('should filter by status', async () => {
      const result = await signatureService.listRequests(
        'user-id',
        'user@example.com',
        { status: ['pending'] }
      )
      
      expect(result.success).toBe(true)
      result.data?.forEach(req => {
        expect(req.status).toBe('pending')
      })
    })

    it('should filter received view by email OR user ID', async () => {
      const result = await signatureService.listRequests(
        'user-id',
        'user@example.com',
        { view: 'received' }
      )
      
      expect(result.success).toBe(true)
      // Verify query used .or() filter
    })

    it('should clamp pageSize to maximum', async () => {
      const result = await signatureService.listRequests(
        'user-id',
        'user@example.com',
        { pageSize: 1000 }
      )
      
      expect(result.pagination?.pageSize).toBeLessThanOrEqual(100)
    })
  })

  describe('getRequest', () => {
    it('should get request for authorized user', async () => {
      const result = await signatureService.getRequest(
        'request-id',
        'user-id',
        'user@example.com'
      )
      
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('request-id')
    })

    it('should deny access for unauthorized user', async () => {
      const result = await signatureService.getRequest(
        'request-id',
        'wrong-user-id',
        'wrong@example.com'
      )
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('FORBIDDEN')
    })

    it('should authorize by signer email', async () => {
      const result = await signatureService.getRequest(
        'request-id',
        undefined,
        'signer@example.com'
      )
      
      expect(result.success).toBe(true)
    })
  })

  describe('signDocument', () => {
    it('should verify TOTP when required', async () => {
      const result = await signatureService.signDocument(
        'request-id',
        'user-id',
        {
          signature_data: 'data:image/png;base64,...',
          totp_code: '123456'
        },
        '127.0.0.1',
        'Mozilla/5.0'
      )
      
      // Should call TOTPService.verifyTOTP
      expect(result.success).toBe(true)
    })

    it('should reject invalid TOTP', async () => {
      const result = await signatureService.signDocument(
        'request-id',
        'user-id',
        {
          signature_data: 'data:image/png;base64,...',
          totp_code: 'invalid'
        },
        '127.0.0.1',
        'Mozilla/5.0'
      )
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TOTP_VERIFICATION_FAILED')
    })

    it('should prevent cross-user signing', async () => {
      const result = await signatureService.signDocument(
        'request-id',
        'wrong-user-id',  // Different from assigned signer
        { signature_data: '...' },
        '127.0.0.1',
        'Mozilla/5.0'
      )
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('FORBIDDEN')
    })

    it('should log audit trail with IP and user agent', async () => {
      const result = await signatureService.signDocument(
        'request-id',
        'user-id',
        { signature_data: '...' },
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      )
      
      // Verify audit log created with IP and user agent
      expect(result.success).toBe(true)
    })
  })
})
```

#### bulk-operations-service.ts

```typescript
describe('BulkOperationsService', () => {
  describe('bulkExport', () => {
    it('should export data in payload field', async () => {
      const result = await bulkOperationsService.bulkExport(
        ['req1', 'req2'],
        'user-id',
        'json'
      )
      
      expect(result.success).toBe(true)
      expect(result.data?.payload).toBeDefined()
      expect(result.data?.payload?.format).toBe('json')
      expect(result.data?.payload?.records).toBeInstanceOf(Array)
    })
  })

  describe('extractErrors', () => {
    it('should map error reasons to codes', () => {
      const errors = [
        { status: 'rejected', reason: { message: 'not found' } },
        { status: 'rejected', reason: { message: 'permission denied' } },
        { status: 'rejected', reason: { code: 'CUSTOM_ERROR' } }
      ]
      
      const result = bulkOperationsService.extractErrors(errors)
      
      expect(result[0].code).toBe('NOT_FOUND')
      expect(result[1].code).toBe('PERMISSION_DENIED')
      expect(result[2].code).toBe('CUSTOM_ERROR')
    })
  })
})
```

#### field-service.ts

```typescript
describe('FieldService', () => {
  describe('validateField', () => {
    it('should validate nested position structure', () => {
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
      
      const result = fieldService.validateField(field)
      expect(result.success).toBe(true)
    })

    it('should reject flat position structure', () => {
      const field = {
        type: 'signature',
        x: 10,
        y: 20,
        width: 20,
        height: 8,
        page: 1
      }
      
      const result = fieldService.validateField(field)
      expect(result.success).toBe(false)
    })
  })

  describe('detectOverlap', () => {
    it('should detect overlapping fields', () => {
      const field1 = {
        position: { x: 10, y: 10, width: 20, height: 10, page: 1 }
      }
      const field2 = {
        position: { x: 15, y: 15, width: 20, height: 10, page: 1 }
      }
      
      const overlap = fieldService.detectOverlap(field1, field2)
      expect(overlap).toBe(true)
    })

    it('should not detect overlap on different pages', () => {
      const field1 = {
        position: { x: 10, y: 10, width: 20, height: 10, page: 1 }
      }
      const field2 = {
        position: { x: 10, y: 10, width: 20, height: 10, page: 2 }
      }
      
      const overlap = fieldService.detectOverlap(field1, field2)
      expect(overlap).toBe(false)
    })
  })
})
```

---

## Integration Tests

### API Route Tests

```typescript
import { describe, it, expect } from 'vitest'
import { GET, POST } from '@/app/api/v1/signatures/requests/route'

describe('GET /api/v1/signatures/requests', () => {
  it('should require authentication', async () => {
    const request = new Request('http://localhost/api/v1/signatures/requests')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
  })

  it('should validate query parameters', async () => {
    const request = new Request(
      'http://localhost/api/v1/signatures/requests?status=invalid'
    )
    const response = await GET(request)
    
    expect(response.status).toBe(400)
  })

  it('should enforce rate limiting', async () => {
    // Make 101 requests
    for (let i = 0; i < 101; i++) {
      const request = new Request('http://localhost/api/v1/signatures/requests')
      const response = await GET(request)
      
      if (i === 100) {
        expect(response.status).toBe(429)
        expect(response.headers.get('Retry-After')).toBeDefined()
      }
    }
  })

  it('should return rate limit headers', async () => {
    const request = new Request('http://localhost/api/v1/signatures/requests')
    const response = await GET(request)
    
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })
})

describe('POST /api/v1/signatures/requests', () => {
  it('should create signature request', async () => {
    const request = new Request('http://localhost/api/v1/signatures/requests', {
      method: 'POST',
      body: JSON.stringify({
        document_id: 'doc-id',
        title: 'Test Request',
        signers: [{ signer_email: 'test@example.com' }]
      })
    })
    
    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  it('should validate request body', async () => {
    const request = new Request('http://localhost/api/v1/signatures/requests', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

### Template Caching Tests

```typescript
describe('GET /api/v1/signatures/templates/:id', () => {
  it('should return cache miss on first request', async () => {
    const response = await fetch('/api/v1/signatures/templates/123')
    expect(response.headers.get('X-Cache')).toBe('MISS')
  })

  it('should return cache hit on second request', async () => {
    await fetch('/api/v1/signatures/templates/123')
    const response = await fetch('/api/v1/signatures/templates/123')
    expect(response.headers.get('X-Cache')).toBe('HIT')
  })

  it('should invalidate cache on update', async () => {
    await fetch('/api/v1/signatures/templates/123')
    
    await fetch('/api/v1/signatures/templates/123', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' })
    })
    
    const response = await fetch('/api/v1/signatures/templates/123')
    expect(response.headers.get('X-Cache')).toBe('MISS')
  })
})
```

---

## E2E Tests

### Complete Signature Workflow

```typescript
describe('Signature Workflow E2E', () => {
  it('should complete full signature workflow', async () => {
    // 1. Create signature request
    const createResponse = await fetch('/api/v1/signatures/requests', {
      method: 'POST',
      body: JSON.stringify({
        document_id: 'doc-id',
        title: 'E2E Test',
        signers: [{ signer_email: 'signer@example.com' }]
      })
    })
    const { data: request } = await createResponse.json()
    
    // 2. Get request as signer
    const getResponse = await fetch(`/api/v1/signatures/requests/${request.id}`)
    expect(getResponse.status).toBe(200)
    
    // 3. Sign document
    const signResponse = await fetch(
      `/api/v1/signatures/requests/${request.id}/sign`,
      {
        method: 'POST',
        body: JSON.stringify({
          signature_data: 'data:image/png;base64,...'
        })
      }
    )
    expect(signResponse.status).toBe(200)
    
    // 4. Verify completion
    const finalResponse = await fetch(`/api/v1/signatures/requests/${request.id}`)
    const { data: finalRequest } = await finalResponse.json()
    expect(finalRequest.status).toBe('completed')
  })
})
```

---

## Security Tests

```typescript
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const response = await fetch(
      `/api/v1/signatures/requests?search='; DROP TABLE signing_requests; --`
    )
    expect(response.status).not.toBe(500)
  })

  it('should prevent XSS in titles', async () => {
    const response = await fetch('/api/v1/signatures/requests', {
      method: 'POST',
      body: JSON.stringify({
        title: '<script>alert("XSS")</script>',
        document_id: 'doc-id',
        signers: [{ signer_email: 'test@example.com' }]
      })
    })
    
    const { data } = await response.json()
    expect(data.title).not.toContain('<script>')
  })

  it('should enforce CORS', async () => {
    const response = await fetch('/api/v1/signatures/requests', {
      headers: { 'Origin': 'https://evil.com' }
    })
    
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  })
})
```

---

## Performance Tests

```typescript
describe('Performance Tests', () => {
  it('should list 100 requests in <500ms', async () => {
    const start = Date.now()
    await fetch('/api/v1/signatures/requests?pageSize=100')
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(500)
  })

  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      fetch('/api/v1/signatures/requests')
    )
    
    const responses = await Promise.all(requests)
    responses.forEach(r => expect(r.status).toBe(200))
  })
})
```

---

## Test Data

### Sample Signature Request

```typescript
export const mockSignatureRequest = {
  id: 'test-request-id',
  document_id: 'test-doc-id',
  title: 'Test Contract',
  description: 'Test description',
  status: 'pending',
  signature_type: 'simple',
  signing_order: 'parallel',
  require_totp: false,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString()
}
```

### Sample Template

```typescript
export const mockTemplate = {
  id: 'test-template-id',
  name: 'Test Template',
  description: 'Test template description',
  is_public: false,
  fields: [
    {
      type: 'signature',
      position: { x: 10, y: 80, width: 20, height: 8, page: 1 },
      required: true
    }
  ]
}
```

---

For more information:
- [API Reference](./API_REFERENCE.md)
- [User Guide](./USER_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

