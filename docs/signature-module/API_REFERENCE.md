# Signature Module API Reference

## Overview

The Signature Module provides a comprehensive API for managing electronic signature workflows, including request creation, signing, templates, analytics, and bulk operations.

**Base URL:** `/api/v1/signatures`

**Authentication:** All endpoints require authentication via Supabase Auth. Include the user's session token in requests.

**Rate Limiting:**
- Standard operations: 100 requests/hour per user
- Bulk operations: 5 requests/hour per user
- Reminders: 20 requests/hour per user

---

## Endpoints

### Signature Requests

#### `GET /api/v1/signatures/requests`
List signature requests with pagination and filtering.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status (comma-separated: `pending,completed,expired,cancelled`)
- `view` (enum, optional): `sent` or `received`
- `search` (string, optional): Search by title or description

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Contract Agreement",
      "status": "pending",
      "total_signers": 3,
      "completed_signers": 1,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Timestamp when limit resets

---

#### `POST /api/v1/signatures/requests`
Create a new signature request.

**Request Body:**
```json
{
  "document_id": "uuid",
  "title": "Contract Agreement",
  "description": "Please sign this contract",
  "signers": [
    {
      "signer_email": "user@example.com",
      "signer_name": "John Doe",
      "signing_order": 1
    }
  ],
  "signature_type": "simple",
  "signing_order": "parallel",
  "require_totp": false,
  "expires_in_days": 30
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "title": "Contract Agreement",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

#### `GET /api/v1/signatures/requests/{id}`
Retrieve a single signature request.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Contract Agreement",
    "status": "pending",
    "signers": [
      {
        "id": "uuid",
        "signer_email": "user@example.com",
        "status": "pending",
        "signed_at": null
      }
    ]
  }
}
```

---

#### `PATCH /api/v1/signatures/requests/{id}`
Update a signature request.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

---

#### `DELETE /api/v1/signatures/requests/{id}`
Delete a signature request.

**Response:** `200 OK`

---

#### `POST /api/v1/signatures/requests/{id}/sign`
Sign a document.

**Request Body:**
```json
{
  "signature_data": "data:image/png;base64,...",
  "signature_method": "draw",
  "totp_code": "123456"
}
```

**Response:**
```json
{
  "data": {
    "request_id": "uuid",
    "status": "completed",
    "next_signer": null
  }
}
```

---

#### `POST /api/v1/signatures/requests/{id}/cancel`
Cancel a signature request.

**Response:** `200 OK`

---

### Bulk Operations

#### `POST /api/v1/signatures/requests/bulk`
Execute bulk operations on multiple requests.

**Request Body:**
```json
{
  "operation": "remind",
  "request_ids": ["uuid1", "uuid2"],
  "parameters": {
    "days": 7
  }
}
```

**Operations:**
- `remind`: Send reminder emails
- `cancel`: Cancel requests
- `delete`: Delete requests
- `extend_expiration`: Extend expiration date
- `export`: Export data

**Response:**
```json
{
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "errors": [],
    "duration": 1234,
    "payload": {
      "format": "json",
      "records": [...],
      "exported_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### Templates

#### `GET /api/v1/signatures/templates`
List signature templates.

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `is_public` (boolean): Filter by public/private
- `search`: Search by name

**Cache Headers:**
- `X-Cache`: `HIT` or `MISS`
- `Cache-Control`: Caching policy
- `ETag`: Entity tag for validation

---

#### `POST /api/v1/signatures/templates`
Create a new template.

**Request Body:**
```json
{
  "name": "Standard Contract",
  "description": "Template for contracts",
  "is_public": false,
  "default_signers": [
    {
      "email": "placeholder@example.com",
      "name": "Signer 1",
      "signing_order": 1
    }
  ],
  "fields": [
    {
      "type": "signature",
      "position": {
        "x": 10,
        "y": 20,
        "width": 20,
        "height": 8,
        "page": 1
      },
      "required": true
    }
  ]
}
```

---

#### `GET /api/v1/signatures/templates/{id}`
Retrieve a template (cached for 10 minutes).

---

#### `PATCH /api/v1/signatures/templates/{id}`
Update a template (invalidates cache).

---

#### `DELETE /api/v1/signatures/templates/{id}`
Delete a template (invalidates cache).

---

#### `POST /api/v1/signatures/templates/{id}/apply`
Apply a template to create a signature request.

**Request Body:**
```json
{
  "document_id": "uuid",
  "title": "Contract from Template",
  "signers": [
    {
      "signer_email": "actual@example.com",
      "signer_name": "John Doe"
    }
  ]
}
```

---

### Analytics

#### `GET /api/v1/signatures/analytics`
Retrieve analytics data (cached for 5 minutes).

**Query Parameters:**
- `metric` (required): `completion_rate`, `signer_engagement`, `time_to_sign`, `trends`
- `from_date` (ISO 8601): Start date
- `to_date` (ISO 8601): End date
- `group_by`: `day`, `week`, `month`

**Response:**
```json
{
  "data": {
    "completion_rate": 85.5,
    "total_requests": 100,
    "completed_requests": 85
  },
  "metadata": {
    "metric": "completion_rate",
    "from_date": "2024-01-01",
    "to_date": "2024-01-31",
    "calculated_at": "2024-01-31T12:00:00Z"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": ["Error message"]
    }
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

When rate limit is exceeded, you'll receive a `429` response:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset": "2024-01-01T13:00:00Z",
      "retryAfter": 3600
    }
  }
}
```

**Headers:**
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
- `Retry-After`: Seconds until retry

---

## Caching

Templates and analytics endpoints use Redis caching:

**Cache TTL:**
- Templates: 10 minutes
- Analytics: 5 minutes

**Cache Headers:**
- `X-Cache: HIT` - Served from cache
- `X-Cache: MISS` - Fresh from database
- `Cache-Control` - Caching policy
- `ETag` - Entity tag for validation

Cache is automatically invalidated when:
- Templates are updated or deleted
- Analytics data changes significantly

---

## Best Practices

1. **Pagination**: Always use pagination for list endpoints
2. **Rate Limiting**: Implement exponential backoff for 429 responses
3. **Caching**: Respect `Cache-Control` headers
4. **Error Handling**: Check error codes and handle appropriately
5. **TOTP**: Enable TOTP for sensitive documents
6. **Bulk Operations**: Use bulk endpoints for multiple operations
7. **Webhooks**: Subscribe to real-time updates (if available)

---

## SDK Examples

### JavaScript/TypeScript
```typescript
// Create signature request
const response = await fetch('/api/v1/signatures/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    document_id: 'uuid',
    title: 'Contract',
    signers: [{ signer_email: 'user@example.com' }]
  })
})

const { data } = await response.json()
```

### Python
```python
import requests

response = requests.post(
    'https://api.example.com/api/v1/signatures/requests',
    json={
        'document_id': 'uuid',
        'title': 'Contract',
        'signers': [{'signer_email': 'user@example.com'}]
    }
)

data = response.json()['data']
```

---

For more information, see:
- [User Guide](./USER_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

