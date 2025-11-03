# Netlify Deployment Guide - Sign Module

**Date:** 2025-11-03  
**Platform:** Netlify  
**Framework:** Next.js

---

## Prerequisites

- ✅ Netlify account
- ✅ Supabase project configured
- ✅ Environment variables ready
- ✅ Database migrations applied

---

## Step 1: Environment Variables

Add these environment variables in Netlify Dashboard → Site Settings → Environment Variables:

### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app

# Cron Job Secret (generate a secure random string)
CRON_SECRET=your-secure-random-string-here

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=SignTusk

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# TOTP Configuration
TOTP_ISSUER=SignTusk
TOTP_SERVICE_NAME=SignTusk Document Signing
```

### Signature Module Configuration (Optional - has defaults)

```env
# Expiration Settings
SIGNATURE_DEFAULT_EXPIRATION_DAYS=30
SIGNATURE_MAX_EXPIRATION_DAYS=365
SIGNATURE_MIN_EXPIRATION_DAYS=1

# Limits
SIGNATURE_MAX_SIGNERS_PER_REQUEST=50
SIGNATURE_MAX_BULK_OPERATION_SIZE=100

# Cache Settings
SIGNATURE_CACHE_TTL_SECONDS=300
SIGNATURE_ANALYTICS_CACHE_TTL_SECONDS=300

# Pagination
SIGNATURE_DEFAULT_PAGE_SIZE=20
SIGNATURE_MAX_PAGE_SIZE=100
```

### Upstash Configuration (for Send module)

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-current-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key
```

---

## Step 2: Database Migrations

Run these migrations in your Supabase SQL Editor:

### Migration 1: Signature Templates

```sql
-- Copy content from database/migrations/001_signature_templates.sql
-- Run in Supabase SQL Editor
```

### Migration 2: Performance Indexes

```sql
-- Copy content from database/migrations/002_signature_indexes.sql
-- Run in Supabase SQL Editor
```

### Migration 3: Audit Improvements

```sql
-- Copy content from database/migrations/003_signature_audit_improvements.sql
-- Run in Supabase SQL Editor
```

**Verification:**
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('signature_templates', 'signature_audit_log');

-- Check if indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'signing_requests';
```

---

## Step 3: Netlify Scheduled Functions

### Option A: Using Netlify UI

1. Go to **Netlify Dashboard** → Your Site → **Functions** → **Scheduled Functions**
2. Click **Add scheduled function**
3. Configure:
   - **Name:** `check-expirations-scheduled`
   - **Schedule:** `0 0 * * *` (daily at midnight UTC)
   - **Function path:** `netlify/functions/check-expirations-scheduled.ts`

### Option B: Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site
netlify link

# Deploy function
netlify deploy --prod
```

### Verify Scheduled Function

The function is located at:
```
netlify/functions/check-expirations-scheduled.ts
```

It will call:
```
POST https://your-site.netlify.app/api/jobs/check-expirations
Authorization: Bearer ${CRON_SECRET}
```

---

## Step 4: Build Configuration

Your `netlify.toml` is already configured. Verify it contains:

```toml
[build]
  command = "./build.sh"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--production=false --include=dev"
  NPM_CONFIG_LEGACY_PEER_DEPS = "true"
  NPM_CONFIG_INCLUDE = "dev"
  NEXT_TELEMETRY_DISABLED = "1"
  CI = "false"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Step 5: Deploy

### Initial Deployment

```bash
# Build locally to test
npm run build

# Deploy to Netlify
git push origin main
```

Netlify will automatically:
1. Install dependencies
2. Run build script
3. Deploy Next.js app
4. Set up scheduled functions

### Verify Deployment

1. **Check build logs** in Netlify Dashboard
2. **Test API endpoints:**
   ```bash
   curl https://your-site.netlify.app/api/v1/signatures/requests
   ```
3. **Test scheduled function:**
   ```bash
   curl -X POST https://your-site.netlify.app/api/jobs/check-expirations \
     -H "Authorization: Bearer ${CRON_SECRET}" \
     -H "Content-Type: application/json"
   ```

---

## Step 6: Post-Deployment Verification

### 1. Test Signature Creation

```bash
curl -X POST https://your-site.netlify.app/api/v1/signatures/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "document_id": "test-doc-id",
    "title": "Test Signature Request",
    "signers": [
      {
        "name": "Test Signer",
        "email": "test@example.com",
        "signing_order": 1
      }
    ],
    "signing_order": "sequential",
    "expires_in_days": 30
  }'
```

### 2. Test Template Creation

```bash
curl -X POST https://your-site.netlify.app/api/v1/signatures/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Standard NDA",
    "description": "Non-disclosure agreement template",
    "default_signers": [
      {"name": "Party A", "email": "", "signing_order": 1},
      {"name": "Party B", "email": "", "signing_order": 2}
    ],
    "signing_order": "sequential",
    "expires_in_days": 30
  }'
```

### 3. Test Analytics

```bash
curl https://your-site.netlify.app/api/v1/signatures/analytics?metric=completion_rate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Check Scheduled Function Logs

Go to **Netlify Dashboard** → **Functions** → **check-expirations-scheduled** → **Logs**

---

## Step 7: Monitoring

### Set Up Alerts

1. **Netlify Deploy Notifications:**
   - Go to Site Settings → Build & Deploy → Deploy notifications
   - Add email/Slack notifications for failed builds

2. **Function Monitoring:**
   - Monitor scheduled function execution in Netlify Functions dashboard
   - Check for errors in function logs

3. **Supabase Monitoring:**
   - Monitor database performance in Supabase Dashboard
   - Set up alerts for high query times

### Health Check Endpoint

Test the health check:
```bash
curl https://your-site.netlify.app/api/jobs/check-expirations
```

Should return:
```json
{
  "status": "healthy",
  "service": "signature-expiration-check",
  "timestamp": "2025-11-03T00:00:00.000Z"
}
```

---

## Troubleshooting

### Build Fails

**Issue:** Build fails with module not found errors

**Solution:**
```bash
# Clear Netlify cache
netlify build --clear-cache

# Or in Netlify UI: Site Settings → Build & Deploy → Clear cache and retry deploy
```

### Scheduled Function Not Running

**Issue:** Expiration check function not executing

**Solution:**
1. Check function logs in Netlify Dashboard
2. Verify `CRON_SECRET` environment variable is set
3. Manually trigger function to test:
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/check-expirations-scheduled
   ```

### Database Connection Issues

**Issue:** API returns 500 errors

**Solution:**
1. Verify Supabase environment variables are correct
2. Check Supabase project is not paused
3. Test connection:
   ```bash
   curl https://your-project.supabase.co/rest/v1/ \
     -H "apikey: YOUR_ANON_KEY"
   ```

### CORS Errors

**Issue:** Frontend can't call API

**Solution:**
Add to `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,PATCH,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ]
}
```

---

## Performance Optimization

### 1. Enable Caching

Netlify automatically caches static assets. For API responses, use:

```typescript
// In API routes
export const config = {
  runtime: 'edge', // Use Edge Functions for faster response
}
```

### 2. Database Indexes

Ensure all migrations are applied for optimal query performance.

### 3. Monitor Function Duration

Check function execution time in Netlify Dashboard. If > 10s, consider optimization.

---

## Security Checklist

- ✅ All environment variables set in Netlify (not in code)
- ✅ `CRON_SECRET` is a strong random string
- ✅ Supabase RLS policies enabled
- ✅ HTTPS enforced (automatic with Netlify)
- ✅ Security headers configured in `netlify.toml`
- ✅ API routes validate authentication
- ✅ Input validation using Zod schemas

---

## Next Steps

1. ✅ Set up custom domain in Netlify
2. ✅ Configure email DNS records for Resend
3. ✅ Set up monitoring and alerts
4. ✅ Test all signature workflows end-to-end
5. ✅ Review and update MIGRATION_GUIDE.md for your team
6. ✅ Train team on new API endpoints

---

## Support Resources

- **Netlify Docs:** https://docs.netlify.com/
- **Next.js on Netlify:** https://docs.netlify.com/frameworks/next-js/
- **Supabase Docs:** https://supabase.com/docs
- **Implementation Summary:** See `IMPLEMENTATION_SUMMARY.md`
- **Migration Guide:** See `MIGRATION_GUIDE.md`

---

**Deployment Status:** 🟢 Ready  
**Last Updated:** 2025-11-03

