# 🔧 Schedule Module - Integration Requirements & Setup

## 📋 Overview

To transform the current MVP into a production-ready Calendly competitor, you'll need to set up multiple third-party integrations. Here's exactly what's required for each:

---

## 📅 **1. Calendar Integration (Critical)**

### **Google Calendar API**

#### **Setup Requirements:**
```bash
# 1. Google Cloud Console Setup
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Configure consent screen
6. Add authorized redirect URIs
```

#### **Environment Variables Needed:**
```bash
# .env.local
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

#### **OAuth Scopes Required:**
```javascript
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
]
```

#### **Implementation Needed:**
- OAuth flow for user consent
- Token storage and refresh
- Calendar list retrieval
- Event creation/deletion
- Availability checking
- Conflict detection

### **Microsoft Outlook/Office 365**

#### **Setup Requirements:**
```bash
# 1. Azure App Registration
1. Go to https://portal.azure.com/
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Configure API permissions
5. Generate client secret
```

#### **Environment Variables Needed:**
```bash
# .env.local
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

#### **API Permissions Required:**
```javascript
const MICROSOFT_SCOPES = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/User.Read'
]
```

---

## 🎥 **2. Video Meeting Integration (Critical)**

### **Zoom Integration**

#### **Setup Requirements:**
```bash
# 1. Zoom Marketplace
1. Go to https://marketplace.zoom.us/
2. Create Zoom App (OAuth or JWT)
3. Get API credentials
4. Configure scopes and permissions
```

#### **Environment Variables Needed:**
```bash
# .env.local
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id
```

#### **API Scopes Required:**
```javascript
const ZOOM_SCOPES = [
  'meeting:write:admin',
  'meeting:read:admin',
  'user:read:admin'
]
```

### **Google Meet Integration**

#### **Setup Requirements:**
```bash
# Uses same Google Cloud project as Calendar
# Additional API needed: Google Meet API
1. Enable Google Meet API in Google Cloud Console
2. Same OAuth credentials as Calendar
```

#### **Additional Scopes:**
```javascript
const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created'
]
```

### **Microsoft Teams Integration**

#### **Setup Requirements:**
```bash
# Uses same Azure app as Outlook
# Additional permissions needed
1. Add Microsoft Teams API permissions
2. Configure application permissions
```

#### **Additional Permissions:**
```javascript
const TEAMS_SCOPES = [
  'https://graph.microsoft.com/OnlineMeetings.ReadWrite'
]
```

---

## 💳 **3. Payment Processing (For Paid Meetings)**

### **Stripe Integration**

#### **Setup Requirements:**
```bash
# 1. Stripe Account
1. Sign up at https://stripe.com/
2. Get API keys from dashboard
3. Configure webhooks
4. Set up products/prices
```

#### **Environment Variables Needed:**
```bash
# .env.local
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### **Webhook Endpoints Needed:**
```javascript
// Required webhook events
const STRIPE_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'invoice.payment_succeeded',
  'customer.subscription.updated'
]
```

### **PayPal Integration (Alternative)**

#### **Setup Requirements:**
```bash
# 1. PayPal Developer Account
1. Go to https://developer.paypal.com/
2. Create application
3. Get client ID and secret
```

#### **Environment Variables Needed:**
```bash
# .env.local
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox # or live
```

---

## 📧 **4. Advanced Email Features**

### **Enhanced Email Service (Beyond Basic Resend)**

#### **Current Resend Setup (Already Working):**
```bash
# .env.local (Already configured)
RESEND_API_KEY=re_bSSwgHiZ_HswkpPHNQKzMTNKtYYjfCzEx
EMAIL_FROM_NAME=SignTusk
EMAIL_FROM_ADDRESS=noreply@signtusk.com
```

#### **Additional Email Services (Optional):**

**SendGrid (Alternative):**
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
```

**Mailgun (Alternative):**
```bash
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
```

### **Email Tracking & Analytics**

#### **PostHog (Analytics):**
```bash
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### **Mixpanel (Alternative):**
```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
```

---

## 🔐 **5. Authentication & Security**

### **Enhanced Auth (Optional)**

#### **Auth0 (Enterprise Auth):**
```bash
AUTH0_SECRET=your_auth0_secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
```

#### **Firebase Auth (Alternative):**
```bash
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

---

## 📊 **6. Analytics & Monitoring**

### **Application Monitoring**

#### **Sentry (Error Tracking):**
```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

#### **Vercel Analytics (If using Vercel):**
```bash
# Automatically configured on Vercel
# No additional setup needed
```

---

## 🚀 **Implementation Priority & Timeline**

### **Phase 1: Core Calendar (4-6 weeks)**
```bash
Priority: CRITICAL
Required: Google Calendar + Microsoft Outlook
Effort: High (OAuth flows, sync logic)
Dependencies: None
```

### **Phase 2: Video Meetings (2-3 weeks)**
```bash
Priority: CRITICAL
Required: Zoom + Google Meet
Effort: Medium (API integrations)
Dependencies: Calendar integration
```

### **Phase 3: Payments (2-3 weeks)**
```bash
Priority: HIGH (for monetization)
Required: Stripe
Effort: Medium (payment flows, webhooks)
Dependencies: None
```

### **Phase 4: Enhanced Features (2-4 weeks)**
```bash
Priority: MEDIUM
Required: Advanced emails, analytics
Effort: Low-Medium
Dependencies: Core features complete
```

---

## 💰 **Cost Considerations**

### **Free Tiers Available:**
- ✅ Google Calendar API: 1M requests/day free
- ✅ Microsoft Graph: 10K requests/month free
- ✅ Zoom: Basic plan supports API
- ✅ Stripe: No monthly fees, 2.9% + 30¢ per transaction
- ✅ Resend: 3K emails/month free

### **Paid Plans Needed For Scale:**
- Google Workspace: $6-18/user/month (for business features)
- Microsoft 365: $6-22/user/month (for business features)
- Zoom Pro: $14.99/month/license (for advanced features)
- Stripe: Transaction fees only
- Enhanced email services: $10-100/month based on volume

---

## 🔧 **Development Complexity**

### **Easy to Implement:**
- ✅ Stripe payments (well-documented)
- ✅ Basic email enhancements
- ✅ Analytics integration

### **Medium Complexity:**
- ⚠️ Video meeting APIs (good docs, some complexity)
- ⚠️ Calendar event creation
- ⚠️ Webhook handling

### **High Complexity:**
- ❌ Real-time calendar sync
- ❌ Conflict detection across multiple calendars
- ❌ OAuth flow management
- ❌ Token refresh handling

---

## 📝 **Next Steps Recommendation**

### **Immediate (Week 1):**
1. Set up Google Cloud Console project
2. Create Stripe account
3. Configure basic OAuth flows

### **Short Term (Weeks 2-4):**
1. Implement Google Calendar integration
2. Add basic Zoom meeting creation
3. Set up Stripe payment processing

### **Medium Term (Weeks 5-8):**
1. Add Microsoft Outlook support
2. Implement conflict detection
3. Enhanced email features

### **Long Term (Weeks 9-12):**
1. Advanced analytics
2. Team features
3. Enterprise integrations

---

**Bottom Line:** Each integration requires significant setup and ongoing maintenance. Budget 3-4 months for a small team to implement all critical integrations properly.
