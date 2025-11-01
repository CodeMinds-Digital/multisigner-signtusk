# MAIL Module - Complete Setup Guide

## 🎯 **Overview**

The MAIL module is a **production-ready transactional email service** similar to Resend/SendGrid, with:

- ✅ **ZeptoMail Integration** - Email delivery backend
- ✅ **Redis Caching** - Performance optimization
- ✅ **QStash Background Jobs** - Async processing
- ✅ **Stripe Billing** - Subscription management
- ✅ **Domain Automation** - DNS setup (Cloudflare/Route53)
- ✅ **SMTP Relay** - Email client support
- ✅ **Template Engine** - Handlebars templates
- ✅ **Webhook System** - Real-time event processing

---

## 🚀 **Quick Start**

### 1. **Copy Environment Variables**
```bash
cp .env.local.example .env.local
```

### 2. **Set Required Variables**
```bash
# Core Services (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
UPSTASH_REDIS_REST_URL=your_redis_url
QSTASH_TOKEN=your_qstash_token
ZEPTOMAIL_API_KEY=your_zeptomail_key

# Billing (REQUIRED for paid plans)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
```

### 3. **Run Database Migration**
```sql
-- Execute in Supabase SQL Editor
-- File: database/migrations/20250113_mail_module_setup.sql
```

### 4. **Start Development**
```bash
npm run dev
```

---

## 📋 **Environment Variables Checklist**

### **✅ Core Infrastructure (REQUIRED)**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `UPSTASH_REDIS_REST_URL` - Redis for caching
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Redis token
- [ ] `QSTASH_TOKEN` - Background job processing

### **✅ Email Delivery (REQUIRED)**
- [ ] `ZEPTOMAIL_API_KEY` - Email sending API
- [ ] `ZEPTOMAIL_DOMAIN` - Verified sending domain
- [ ] `ZEPTOMAIL_WEBHOOK_SECRET` - Webhook verification

### **✅ Billing System (REQUIRED for paid plans)**
- [ ] `STRIPE_SECRET_KEY` - Stripe API key
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- [ ] `STRIPE_STARTER_PRICE_ID` - Starter plan price ID
- [ ] `STRIPE_PROFESSIONAL_PRICE_ID` - Professional plan price ID
- [ ] `STRIPE_ENTERPRISE_PRICE_ID` - Enterprise plan price ID

### **🔧 Optional Features**
- [ ] `CLOUDFLARE_API_TOKEN` - DNS automation
- [ ] `AWS_ACCESS_KEY_ID` - Route53 automation
- [ ] `ENCRYPTION_KEY` - Data encryption (32 chars)

---

## 🛠 **Service Setup Instructions**

### **1. Supabase Setup**
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings > API
3. Copy Project URL and Service Role Key
4. Run migration: `database/migrations/20250113_mail_module_setup.sql`

### **2. Upstash Setup**
1. Create Redis at [console.upstash.com/redis](https://console.upstash.com/redis)
2. Create QStash at [console.upstash.com/qstash](https://console.upstash.com/qstash)
3. Copy REST URL, Token, and QStash Token

### **3. ZeptoMail Setup**
1. Sign up at [zeptomail.zoho.com](https://www.zoho.com/zeptomail/)
2. Verify your sending domain
3. Get API key from Settings > API
4. Set webhook URL: `https://your-domain.com/api/mail/webhooks/zeptomail`

### **4. Stripe Setup**
1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Developers > API keys
3. Create products for email plans:
   - **Starter**: $9/month, 10K emails
   - **Professional**: $29/month, 50K emails  
   - **Enterprise**: $99/month, 500K emails
4. Set webhook URL: `https://your-domain.com/api/mail/webhooks/stripe`

---

## 🔄 **Redis & QStash Integration Status**

### **✅ IMPLEMENTED FEATURES**

#### **Redis Caching**
- ✅ Domain verification status caching
- ✅ Email suppression list caching
- ✅ Rate limiting for API endpoints
- ✅ Session management
- ✅ Template caching

#### **QStash Background Jobs**
- ✅ Email sending queue (`/api/mail/jobs/send-email`)
- ✅ Domain verification jobs (`/api/mail/jobs/verify-domain`)
- ✅ Domain cleanup jobs (`/api/mail/jobs/cleanup-domain`)
- ✅ Scheduled email sending
- ✅ Retry mechanisms with exponential backoff

#### **Workflow Integration**
- ✅ Email template workflows
- ✅ Domain setup workflows
- ✅ Billing event workflows
- ✅ Webhook event processing

---

## 📊 **Mail Module Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Dashboard │    │   API Routes    │    │   Background    │
│                 │    │                 │    │     Jobs        │
│ • Send Email    │───▶│ • /api/mail/*   │───▶│ • QStash Queue  │
│ • Manage Domains│    │ • Authentication│    │ • Redis Cache   │
│ • Templates     │    │ • Rate Limiting │    │ • Retry Logic   │
│ • Analytics     │    │ • Validation    │    │ • Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Supabase     │    │   ZeptoMail     │    │     Stripe      │
│                 │    │                 │    │                 │
│ • Database      │    │ • Email Delivery│    │ • Billing       │
│ • Auth          │    │ • SMTP Relay    │    │ • Subscriptions │
│ • Storage       │    │ • Webhooks      │    │ • Usage Tracking│
│ • Realtime      │    │ • Analytics     │    │ • Invoicing     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🎯 **Why Email Setup Page Was Showing**

**Problem**: Mail dashboard showed "Create Email Account" instead of the main dashboard.

**Root Cause**: Line 54 in `/mail/page.tsx` was hardcoded:
```typescript
// ❌ WRONG
setShowCreateAccount(true);
```

**Fix Applied**: Changed to proper account fetching:
```typescript
// ✅ CORRECT
fetchEmailAccount();
```

**Result**: Now shows proper dashboard with stats, quick actions, and recent activity.

---

## 🔧 **Testing Your Setup**

### **1. Test Database Connection**
```bash
# Check if tables exist
curl -X GET "https://your-supabase-url/rest/v1/email_accounts" \
  -H "apikey: your-anon-key"
```

### **2. Test Redis Connection**
```bash
# Check Redis connectivity
curl -X GET "https://your-redis-url/ping" \
  -H "Authorization: Bearer your-redis-token"
```

### **3. Test Email Sending**
```bash
# Send test email
curl -X POST "http://localhost:3000/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "from": "test@your-domain.com",
    "to": ["recipient@example.com"],
    "subject": "Test Email",
    "html": "<h1>Hello World!</h1>"
  }'
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Email Setup" page showing**
- **Solution**: Fixed in this update - dashboard now loads properly

### **Issue 2: Environment variables not loading**
- **Solution**: Restart development server after adding variables

### **Issue 3: QStash jobs failing**
- **Solution**: Check webhook URLs are publicly accessible

### **Issue 4: ZeptoMail authentication errors**
- **Solution**: Verify API key and domain verification

---

## 📈 **Production Deployment**

### **1. Environment Variables**
```bash
# Update for production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### **2. Webhook URLs**
- ZeptoMail: `https://your-domain.com/api/mail/webhooks/zeptomail`
- Stripe: `https://your-domain.com/api/mail/webhooks/stripe`

### **3. DNS Setup**
- Point your domain to your hosting provider
- Set up SSL certificate
- Configure CDN (optional)

---

## ✅ **Verification Checklist**

- [ ] Database migration completed
- [ ] All environment variables set
- [ ] Redis connection working
- [ ] QStash jobs processing
- [ ] ZeptoMail sending emails
- [ ] Stripe webhooks receiving events
- [ ] Mail dashboard loading properly
- [ ] Domain verification working
- [ ] Template system functional
- [ ] Analytics tracking data

---

**🎉 Your MAIL module is now ready for production!**
