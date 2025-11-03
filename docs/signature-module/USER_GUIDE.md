# Signature Module User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating Signature Requests](#creating-signature-requests)
4. [Signing Documents](#signing-documents)
5. [Using Templates](#using-templates)
6. [Bulk Operations](#bulk-operations)
7. [Analytics & Reporting](#analytics--reporting)
8. [Security Features](#security-features)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

The Signature Module provides a complete electronic signature workflow system with support for:
- Multiple signature types (simple, advanced, qualified)
- Sequential and parallel signing workflows
- TOTP/MFA verification for enhanced security
- Template-based document creation
- Comprehensive analytics and reporting
- Bulk operations for efficiency

---

## Getting Started

### Prerequisites

- Active user account with authentication
- Documents uploaded to the system
- Valid email addresses for signers

### Quick Start

1. **Upload a Document**: Upload your PDF or document to the system
2. **Create a Signature Request**: Specify signers and signing order
3. **Send for Signing**: Signers receive email notifications
4. **Track Progress**: Monitor signing status in real-time
5. **Download Completed Document**: Access signed document when complete

---

## Creating Signature Requests

### Basic Signature Request

```typescript
const request = {
  document_id: 'your-document-id',
  title: 'Employment Contract',
  description: 'Please review and sign the employment contract',
  signers: [
    {
      signer_email: 'employee@example.com',
      signer_name: 'John Doe',
      signing_order: 1
    }
  ],
  signature_type: 'simple',
  signing_order: 'parallel',
  expires_in_days: 30
}
```

### Signature Types

1. **Simple Signature**: Basic electronic signature
   - Use for: Internal documents, agreements
   - Security: Standard

2. **Advanced Signature**: Enhanced with identity verification
   - Use for: Contracts, legal documents
   - Security: TOTP/MFA optional

3. **Qualified Signature**: Highest level of security
   - Use for: Regulatory compliance, high-value contracts
   - Security: TOTP/MFA required

### Signing Order

**Parallel Signing:**
- All signers can sign simultaneously
- Faster completion
- Use when order doesn't matter

**Sequential Signing:**
- Signers must sign in specified order
- Each signer notified after previous completes
- Use for approval workflows

### Example: Sequential Signing

```typescript
const request = {
  document_id: 'contract-id',
  title: 'Approval Workflow',
  signers: [
    {
      signer_email: 'manager@example.com',
      signer_name: 'Manager',
      signing_order: 1  // Signs first
    },
    {
      signer_email: 'director@example.com',
      signer_name: 'Director',
      signing_order: 2  // Signs second
    },
    {
      signer_email: 'ceo@example.com',
      signer_name: 'CEO',
      signing_order: 3  // Signs last
    }
  ],
  signing_order: 'sequential'
}
```

---

## Signing Documents

### Signing Methods

1. **Draw Signature**: Draw with mouse or touch
2. **Type Signature**: Type name in signature font
3. **Upload Signature**: Upload image of signature

### Signing Process

1. **Receive Email**: Signer receives notification email
2. **Review Document**: View document in browser
3. **Place Signature**: Click signature field and sign
4. **TOTP Verification** (if required): Enter 6-digit code
5. **Submit**: Complete signing process

### TOTP/MFA Setup

For documents requiring TOTP:

1. Navigate to **Settings > Signing Setup**
2. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
3. Enter verification code to confirm
4. TOTP is now enabled for signing

### Offline Signing

If internet connection is lost during signing:

1. Signature is saved locally in browser
2. Automatic sync when connection restored
3. Check sync status in notification area

---

## Using Templates

### Creating Templates

Templates save time by pre-configuring signature requests:

```typescript
const template = {
  name: 'Standard Employment Contract',
  description: 'Template for new employee contracts',
  is_public: false,
  default_signers: [
    {
      email: 'hr@company.com',
      name: 'HR Manager',
      signing_order: 1
    },
    {
      email: 'placeholder@company.com',  // Will be replaced
      name: 'Employee',
      signing_order: 2
    }
  ],
  fields: [
    {
      type: 'signature',
      position: { x: 10, y: 80, width: 20, height: 8, page: 1 },
      assigned_to: 'hr@company.com',
      required: true
    },
    {
      type: 'signature',
      position: { x: 60, y: 80, width: 20, height: 8, page: 1 },
      assigned_to: 'placeholder@company.com',
      required: true
    },
    {
      type: 'date',
      position: { x: 10, y: 90, width: 15, height: 5, page: 1 },
      required: true
    }
  ]
}
```

### Applying Templates

```typescript
const request = {
  template_id: 'template-uuid',
  document_id: 'new-document-id',
  title: 'John Doe Employment Contract',
  signers: [
    {
      signer_email: 'john.doe@example.com',
      signer_name: 'John Doe'
    }
  ]
}
```

### Template Best Practices

- Use descriptive names
- Include all common fields
- Set appropriate default values
- Test templates before production use
- Keep templates updated

---

## Bulk Operations

### Sending Bulk Reminders

```typescript
const bulkReminder = {
  operation: 'remind',
  request_ids: ['uuid1', 'uuid2', 'uuid3']
}
```

### Bulk Cancellation

```typescript
const bulkCancel = {
  operation: 'cancel',
  request_ids: ['uuid1', 'uuid2']
}
```

### Bulk Export

```typescript
const bulkExport = {
  operation: 'export',
  request_ids: ['uuid1', 'uuid2', 'uuid3'],
  parameters: {
    format: 'json'  // or 'csv'
  }
}
```

### Extending Expiration

```typescript
const bulkExtend = {
  operation: 'extend_expiration',
  request_ids: ['uuid1', 'uuid2'],
  parameters: {
    days: 7  // Extend by 7 days
  }
}
```

### Rate Limits

- Maximum 5 bulk operations per hour
- Maximum 100 requests per bulk operation
- Use for efficiency, not abuse

---

## Analytics & Reporting

### Available Metrics

1. **Completion Rate**: Percentage of completed requests
2. **Signer Engagement**: How quickly signers respond
3. **Time to Sign**: Average time from send to completion
4. **Trends**: Historical data over time

### Viewing Analytics

```typescript
// Get completion rate
GET /api/v1/signatures/analytics?metric=completion_rate&from_date=2024-01-01&to_date=2024-01-31

// Get trends
GET /api/v1/signatures/analytics?metric=trends&group_by=week
```

### Interpreting Results

**Completion Rate:**
- >80%: Excellent
- 60-80%: Good
- <60%: Needs improvement

**Time to Sign:**
- <24 hours: Excellent
- 1-3 days: Good
- >7 days: Consider reminders

### Exporting Reports

Use bulk export to download data for external analysis:

```typescript
const export = {
  operation: 'export',
  request_ids: [...],
  parameters: { format: 'csv' }
}
```

---

## Security Features

### TOTP/MFA Verification

**When to Use:**
- High-value contracts
- Regulatory compliance
- Sensitive documents

**Setup:**
1. Enable in request: `require_totp: true`
2. Signer must have TOTP configured
3. 6-digit code required at signing

### Audit Trail

Every action is logged:
- Document viewed
- Signature placed
- Request cancelled
- Template applied

**Audit Log Includes:**
- Timestamp
- User ID
- IP address
- User agent
- Action details

### Access Control

**Authorization Checks:**
- Users can only access their own requests
- Signers can only sign assigned documents
- Templates have public/private visibility

### Data Security

- All data encrypted in transit (HTTPS)
- Signatures stored securely
- Automatic session expiration
- Rate limiting prevents abuse

---

## Troubleshooting

### Common Issues

**"Rate limit exceeded"**
- Wait for rate limit to reset (check `Retry-After` header)
- Reduce request frequency
- Use bulk operations instead of individual requests

**"TOTP verification failed"**
- Ensure time is synchronized on device
- Check TOTP code is current (30-second window)
- Re-scan QR code if persistent issues

**"Signature request not found"**
- Verify request ID is correct
- Check user has access to request
- Request may have been deleted

**"Offline signature not syncing"**
- Check internet connection
- Clear browser cache
- Re-sign if sync fails after 24 hours

### Getting Help

1. Check [API Reference](./API_REFERENCE.md)
2. Review [Migration Guide](./MIGRATION_GUIDE.md)
3. Contact support with:
   - Request ID
   - Error message
   - Steps to reproduce

---

## Best Practices

1. **Set Appropriate Expiration**: 7-30 days typical
2. **Use Templates**: Save time on repeated workflows
3. **Enable TOTP**: For sensitive documents
4. **Send Reminders**: After 3-5 days if not signed
5. **Monitor Analytics**: Track completion rates
6. **Test Workflows**: Before production use
7. **Keep Signers Informed**: Clear titles and descriptions

---

For more information:
- [API Reference](./API_REFERENCE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

