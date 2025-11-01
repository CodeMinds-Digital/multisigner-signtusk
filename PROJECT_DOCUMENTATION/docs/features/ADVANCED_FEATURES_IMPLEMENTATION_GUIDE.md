# 🚀 Advanced Features Implementation Guide for SignTusk

## Overview

This guide explains how to implement the three critical missing features to compete with DocuSign and Adobe Sign:
1. **Webhooks** - Real-time event notifications
2. **Conditional Logic** - Dynamic document behavior
3. **Mobile Apps** - Native iOS/Android applications

---

## 1. 🔗 Webhooks Implementation

### **Timeline**: 2-4 weeks
### **Priority**: 🔴 Critical (Enterprise requirement)
### **Complexity**: Medium

### Architecture

```
SignTusk Event → Event Queue (QStash) → Webhook Dispatcher → Customer Endpoint
                                      ↓
                                  Retry Logic
                                      ↓
                                  Webhook Logs
```

### Database Schema

```sql
-- Webhook configurations table
CREATE TABLE webhook_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_key TEXT NOT NULL, -- For HMAC signature
    events TEXT[] NOT NULL, -- ['document.signed', 'document.completed']
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhook_configurations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'retrying'
    response_code INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
```

### Implementation Steps

#### Step 1: Webhook Service (src/lib/webhook-service.ts)

```typescript
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: any;
}

export class WebhookService {
  /**
   * Trigger webhook for an event
   */
  static async triggerWebhook(
    userId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    // Get all active webhooks for this user and event type
    const { data: webhooks } = await supabaseAdmin
      .from('webhook_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (!webhooks || webhooks.length === 0) return;

    // Queue webhook deliveries
    for (const webhook of webhooks) {
      await this.queueWebhookDelivery(webhook, eventType, data);
    }
  }

  /**
   * Queue webhook delivery
   */
  private static async queueWebhookDelivery(
    webhook: any,
    eventType: string,
    data: any
  ): Promise<void> {
    const payload: WebhookEvent = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data
    };

    // Create delivery record
    const { data: delivery } = await supabaseAdmin
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        status: 'pending'
      })
      .select()
      .single();

    // Send webhook using QStash for reliability
    await this.sendWebhook(webhook, payload, delivery.id);
  }

  /**
   * Send webhook with retry logic
   */
  private static async sendWebhook(
    webhook: any,
    payload: WebhookEvent,
    deliveryId: string
  ): Promise<void> {
    try {
      // Generate HMAC signature
      const signature = this.generateSignature(
        JSON.stringify(payload),
        webhook.secret_key
      );

      // Send HTTP request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SignTusk-Signature': signature,
          'X-SignTusk-Event': payload.event,
          'User-Agent': 'SignTusk-Webhooks/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
      });

      // Update delivery status
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          status: response.ok ? 'success' : 'failed',
          response_code: response.status,
          response_body: await response.text(),
          attempts: 1,
          delivered_at: response.ok ? new Date().toISOString() : null
        })
        .eq('id', deliveryId);

      // Schedule retry if failed
      if (!response.ok && webhook.retry_count > 0) {
        await this.scheduleRetry(deliveryId, webhook, payload, 1);
      }
    } catch (error) {
      console.error('Webhook delivery failed:', error);
      
      // Update delivery status
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          response_body: error.message,
          attempts: 1
        })
        .eq('id', deliveryId);

      // Schedule retry
      if (webhook.retry_count > 0) {
        await this.scheduleRetry(deliveryId, webhook, payload, 1);
      }
    }
  }

  /**
   * Schedule webhook retry with exponential backoff
   */
  private static async scheduleRetry(
    deliveryId: string,
    webhook: any,
    payload: WebhookEvent,
    attemptNumber: number
  ): Promise<void> {
    if (attemptNumber >= webhook.retry_count) return;

    // Exponential backoff: 1min, 5min, 30min
    const delays = [60, 300, 1800];
    const delaySeconds = delays[attemptNumber - 1] || 3600;
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

    await supabaseAdmin
      .from('webhook_deliveries')
      .update({
        status: 'retrying',
        next_retry_at: nextRetryAt.toISOString()
      })
      .eq('id', deliveryId);

    // Use QStash to schedule retry
    // Implementation depends on your QStash setup
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  private static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature (for customers to use)
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

#### Step 2: Trigger Webhooks in Your Code

```typescript
// In your signature completion handler
// src/app/api/signatures/complete/route.ts

import { WebhookService } from '@/lib/webhook-service';

export async function POST(request: NextRequest) {
  // ... existing signature completion logic ...

  // Trigger webhook
  await WebhookService.triggerWebhook(
    userId,
    'document.signed',
    {
      document_id: documentId,
      signer_email: signerEmail,
      signed_at: new Date().toISOString(),
      document_name: documentName,
      final_pdf_url: finalPdfUrl
    }
  );

  // ... rest of your code ...
}
```

#### Step 3: Webhook Management UI

```typescript
// src/app/(dashboard)/settings/webhooks/page.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);

  const availableEvents = [
    { value: 'document.created', label: 'Document Created' },
    { value: 'document.sent', label: 'Document Sent' },
    { value: 'document.viewed', label: 'Document Viewed' },
    { value: 'document.signed', label: 'Document Signed' },
    { value: 'document.completed', label: 'Document Completed' },
    { value: 'document.declined', label: 'Document Declined' },
    { value: 'document.expired', label: 'Document Expired' }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Webhook Configuration</h1>
      
      {/* Add webhook form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Add New Webhook</h2>
        {/* Form fields for URL, events, etc. */}
      </div>

      {/* Webhook list */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Active Webhooks</h2>
        {/* List of configured webhooks */}
      </div>

      {/* Webhook logs */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">Recent Deliveries</h2>
        {/* Delivery logs with status, retry info */}
      </div>
    </div>
  );
}
```

---

## 2. 🔀 Conditional Logic Implementation

### **Timeline**: 4-6 weeks
### **Priority**: 🟡 Important (Enterprise feature)
### **Complexity**: High

### Architecture

```
Document Template → Conditional Rules → Runtime Evaluation → Dynamic Field Display
```

### Database Schema

```sql
-- Add conditional rules to document templates
ALTER TABLE document_templates 
ADD COLUMN conditional_rules JSONB DEFAULT '[]'::jsonb;

-- Conditional rules structure (stored in JSONB):
{
  "rules": [
    {
      "id": "rule_1",
      "condition": {
        "field_id": "citizenship_question",
        "operator": "equals",
        "value": "yes"
      },
      "actions": [
        {
          "type": "show_fields",
          "field_ids": ["ssn_field", "i9_form"]
        },
        {
          "type": "require_fields",
          "field_ids": ["ssn_field"]
        }
      ]
    }
  ]
}
```

### Implementation Example

```typescript
// src/lib/conditional-logic-engine.ts

export interface ConditionalRule {
  id: string;
  condition: {
    field_id: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  actions: Array<{
    type: 'show_fields' | 'hide_fields' | 'require_fields' | 'set_value';
    field_ids?: string[];
    value?: any;
  }>;
}

export class ConditionalLogicEngine {
  /**
   * Evaluate all rules and return field visibility/requirements
   */
  static evaluateRules(
    rules: ConditionalRule[],
    fieldValues: Record<string, any>
  ): {
    visibleFields: Set<string>;
    requiredFields: Set<string>;
    fieldValues: Record<string, any>;
  } {
    const visibleFields = new Set<string>();
    const requiredFields = new Set<string>();
    const updatedValues = { ...fieldValues };

    for (const rule of rules) {
      if (this.evaluateCondition(rule.condition, fieldValues)) {
        // Apply actions
        for (const action of rule.actions) {
          switch (action.type) {
            case 'show_fields':
              action.field_ids?.forEach(id => visibleFields.add(id));
              break;
            case 'hide_fields':
              action.field_ids?.forEach(id => visibleFields.delete(id));
              break;
            case 'require_fields':
              action.field_ids?.forEach(id => requiredFields.add(id));
              break;
            case 'set_value':
              if (action.field_ids && action.value !== undefined) {
                action.field_ids.forEach(id => {
                  updatedValues[id] = action.value;
                });
              }
              break;
          }
        }
      }
    }

    return { visibleFields, requiredFields, fieldValues: updatedValues };
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: ConditionalRule['condition'],
    fieldValues: Record<string, any>
  ): boolean {
    const fieldValue = fieldValues[condition.field_id];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      default:
        return false;
    }
  }
}
```

---

## 3. 📱 Mobile Apps Implementation

### **Timeline**: 3-6 months
### **Priority**: 🟡 Important (Market expectation)
### **Complexity**: Very High

### Technology Stack Options

#### Option A: React Native (Recommended)
- **Pros**: Share code with web app, one codebase for iOS/Android
- **Cons**: Learning curve, some native features need bridges
- **Timeline**: 4-6 months

#### Option B: Flutter
- **Pros**: Fast performance, beautiful UI
- **Cons**: Different language (Dart), separate codebase
- **Timeline**: 4-6 months

#### Option C: Native (Swift + Kotlin)
- **Pros**: Best performance, full platform features
- **Cons**: Two separate codebases, longer development
- **Timeline**: 6-9 months

### React Native Implementation Plan

```bash
# Project structure
signtusk-mobile/
├── ios/                 # iOS native code
├── android/             # Android native code
├── src/
│   ├── screens/         # App screens
│   ├── components/      # Reusable components
│   ├── navigation/      # Navigation setup
│   ├── services/        # API calls
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utilities
├── package.json
└── app.json
```

### Key Features to Implement

1. **Authentication**
   - Biometric login (Face ID, Touch ID, Fingerprint)
   - Secure token storage (Keychain/Keystore)

2. **Document Management**
   - List documents
   - View PDFs offline
   - Upload documents via camera

3. **Signing**
   - Touch/stylus signature capture
   - Offline signing (sync when online)
   - Push notifications

4. **Offline Mode**
   - Local database (SQLite/Realm)
   - Background sync
   - Conflict resolution

---

## 📊 Implementation Priority & ROI

| Feature | Priority | Timeline | Cost | Revenue Impact |
|---------|----------|----------|------|----------------|
| **Webhooks** | 🔴 Critical | 2-4 weeks | Low | High (Enterprise deals) |
| **Conditional Logic** | 🟡 Important | 4-6 weeks | Medium | Medium (Complex industries) |
| **Mobile Apps** | 🟡 Important | 4-6 months | High | Medium (Market perception) |

### Recommended Implementation Order

1. **Phase 1 (Month 1-2)**: Webhooks
   - Highest ROI
   - Enables enterprise customers
   - Unlocks Zapier/Make.com integrations

2. **Phase 2 (Month 3-4)**: Conditional Logic
   - Differentiates from basic competitors
   - Opens insurance, healthcare markets

3. **Phase 3 (Month 5-10)**: Mobile Apps
   - Longer timeline
   - Can be outsourced
   - Improves market perception

---

## 💡 Quick Wins (While Building Full Features)

### Interim Solutions

**Instead of Webhooks:**
- Provide detailed API documentation
- Offer Zapier integration guide
- Build a few key integrations (Slack, email)

**Instead of Conditional Logic:**
- Offer multiple template versions
- Provide clear documentation on when to use each
- Manual workflow guidance

**Instead of Mobile Apps:**
- Optimize mobile web experience
- Add "Add to Home Screen" prompt
- Progressive Web App (PWA) features

---

## 🎯 Success Metrics

Track these metrics after implementation:

**Webhooks:**
- Number of webhook configurations created
- Webhook delivery success rate (target: >99%)
- Customer feedback on integration ease

**Conditional Logic:**
- Number of templates using conditional rules
- Reduction in signer errors
- Time saved per document

**Mobile Apps:**
- App downloads
- Daily active users (DAU)
- Mobile vs web signing ratio
- App store ratings

---

*Last Updated: January 2025*

