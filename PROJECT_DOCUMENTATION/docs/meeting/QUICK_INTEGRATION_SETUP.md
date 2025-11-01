# ⚡ Quick Integration Setup Guide

## 🎯 Minimum Viable Calendly Setup

To get the Schedule module working like a real Calendly, you need these **3 critical integrations**:

---

## 📅 **1. Google Calendar (CRITICAL - 2-3 days setup)**

### **Step 1: Google Cloud Console**
```bash
1. Go to https://console.cloud.google.com/
2. Create new project: "TuskHub-Schedule"
3. Enable APIs:
   - Google Calendar API
   - Google People API (for user info)
```

### **Step 2: OAuth Credentials**
```bash
1. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
2. Application type: "Web application"
3. Authorized redirect URIs:
   - http://localhost:3000/api/auth/google/callback
   - https://yourdomain.com/api/auth/google/callback
```

### **Step 3: Environment Variables**
```bash
# Add to .env.local
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### **Step 4: Test Integration**
```bash
# You'll need to implement:
- OAuth login flow
- Calendar list retrieval
- Event creation
- Availability checking
```

---

## 🎥 **2. Zoom Integration (CRITICAL - 1-2 days setup)**

### **Step 1: Zoom Marketplace**
```bash
1. Go to https://marketplace.zoom.us/
2. Sign in with Zoom account
3. "Develop" → "Build App" → "OAuth"
4. Fill app information
```

### **Step 2: App Configuration**
```bash
1. App Type: OAuth
2. Scopes needed:
   - meeting:write:admin
   - meeting:read:admin
   - user:read:admin
3. Redirect URL: http://localhost:3000/api/auth/zoom/callback
```

### **Step 3: Environment Variables**
```bash
# Add to .env.local
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id
```

### **Step 4: Test Integration**
```bash
# You'll need to implement:
- Zoom OAuth flow
- Meeting creation API
- Meeting link generation
```

---

## 💳 **3. Stripe Payments (HIGH PRIORITY - 1 day setup)**

### **Step 1: Stripe Account**
```bash
1. Sign up at https://stripe.com/
2. Complete account verification
3. Go to Developers → API keys
```

### **Step 2: Get API Keys**
```bash
# Test Mode (for development)
Publishable key: pk_test_...
Secret key: sk_test_...

# Live Mode (for production)
Publishable key: pk_live_...
Secret key: sk_live_...
```

### **Step 3: Environment Variables**
```bash
# Add to .env.local
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### **Step 4: Webhook Setup**
```bash
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: https://yourdomain.com/api/webhooks/stripe
3. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
4. Copy webhook secret to STRIPE_WEBHOOK_SECRET
```

---

## 🚀 **Quick Start Implementation Order**

### **Week 1: Google Calendar**
```typescript
// 1. Install dependencies
npm install googleapis next-auth

// 2. Set up NextAuth with Google provider
// 3. Implement calendar API calls
// 4. Add availability checking logic
```

### **Week 2: Zoom Integration**
```typescript
// 1. Install Zoom SDK
npm install @zoom/meetingsdk

// 2. Set up Zoom OAuth
// 3. Implement meeting creation
// 4. Generate meeting links
```

### **Week 3: Stripe Payments**
```typescript
// 1. Install Stripe
npm install stripe @stripe/stripe-js

// 2. Set up payment intents
// 3. Add checkout flow
// 4. Handle webhooks
```

---

## 🔧 **Code Implementation Snippets**

### **Google Calendar Integration**
```typescript
// lib/google-calendar.ts
import { google } from 'googleapis'

export async function createCalendarEvent(accessToken: string, eventData: any) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  
  const calendar = google.calendar({ version: 'v3', auth })
  
  const event = {
    summary: eventData.title,
    start: { dateTime: eventData.startTime },
    end: { dateTime: eventData.endTime },
    attendees: [{ email: eventData.guestEmail }]
  }
  
  return await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event
  })
}
```

### **Zoom Meeting Creation**
```typescript
// lib/zoom-meetings.ts
export async function createZoomMeeting(accessToken: string, meetingData: any) {
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: meetingData.title,
      type: 2, // Scheduled meeting
      start_time: meetingData.startTime,
      duration: meetingData.duration,
      settings: {
        host_video: true,
        participant_video: true,
        waiting_room: true
      }
    })
  })
  
  return await response.json()
}
```

### **Stripe Payment Intent**
```typescript
// lib/stripe-payments.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createPaymentIntent(amount: number, meetingId: string) {
  return await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    metadata: {
      meeting_id: meetingId
    }
  })
}
```

---

## ⚠️ **Important Considerations**

### **Security Requirements**
- ✅ Store OAuth tokens securely (encrypted)
- ✅ Implement token refresh logic
- ✅ Validate webhook signatures
- ✅ Use HTTPS in production
- ✅ Implement rate limiting

### **Error Handling**
- ✅ Handle API rate limits
- ✅ Manage token expiration
- ✅ Graceful failure modes
- ✅ User-friendly error messages

### **Testing Strategy**
- ✅ Test with sandbox/test accounts
- ✅ Verify OAuth flows work
- ✅ Test payment processing
- ✅ Validate calendar sync

---

## 📊 **Expected Timeline**

### **Realistic Development Timeline:**
```
Week 1-2: Google Calendar Integration
Week 3: Zoom Meeting Integration  
Week 4: Stripe Payment Processing
Week 5-6: Testing & Bug Fixes
Week 7-8: Production Deployment

Total: 2 months for core integrations
```

### **Team Requirements:**
- 1 Senior Full-Stack Developer (familiar with OAuth)
- 1 Frontend Developer (for UI integration)
- 1 DevOps Engineer (for deployment & security)

---

## 🎯 **Success Criteria**

### **Google Calendar Integration:**
- ✅ Users can connect their Google Calendar
- ✅ Real availability is checked against calendar
- ✅ Meeting events are automatically created
- ✅ Conflicts are detected and prevented

### **Zoom Integration:**
- ✅ Zoom meetings are created automatically
- ✅ Meeting links are included in confirmations
- ✅ Host and guest can join meetings

### **Stripe Integration:**
- ✅ Paid meetings can be booked
- ✅ Payments are processed securely
- ✅ Refunds can be handled
- ✅ Revenue tracking works

---

## 💡 **Pro Tips**

### **Start Simple:**
1. Get Google Calendar read-only working first
2. Add event creation second
3. Then add Zoom meetings
4. Payments last (easiest to implement)

### **Use Existing Libraries:**
- NextAuth.js for OAuth flows
- Stripe's official SDK
- Google's official client libraries
- Well-maintained Zoom SDKs

### **Plan for Scale:**
- Design for multiple calendar providers
- Abstract video meeting creation
- Plan for multiple payment processors
- Build modular, testable code

---

**Bottom Line:** With these 3 integrations, you'll have a functional Calendly competitor. Budget 2-3 months for a small team to implement properly with testing and security considerations.
