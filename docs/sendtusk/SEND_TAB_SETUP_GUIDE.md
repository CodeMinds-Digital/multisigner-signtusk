# 🚀 Send Tab - Complete Setup Guide

## Overview

This guide will walk you through setting up the complete Send Tab feature for SignTusk, combining the best of DocSend and Papermark with unique SignTusk integrations.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Supabase project set up
- ✅ Upstash Redis account (for real-time analytics)
- ✅ Upstash QStash account (for background jobs)
- ✅ Node.js 18+ installed
- ✅ Access to Supabase SQL Editor

---

## 🗄️ Step 1: Database Setup

### Option A: Complete Setup (Recommended)

Run all setup scripts in order:

```sql
-- 1. Create all tables and indexes
-- Copy and paste SEND_TAB_COMPLETE_SETUP.sql into Supabase SQL Editor

-- 2. Create storage buckets
-- Copy and paste SEND_TAB_STORAGE_BUCKETS.sql into Supabase SQL Editor

-- 3. Configure RLS policies
-- Copy and paste SEND_TAB_RLS_POLICIES.sql into Supabase SQL Editor

-- 4. Create functions and triggers
-- Copy and paste SEND_TAB_FUNCTIONS.sql into Supabase SQL Editor
```

### Option B: Individual Scripts

If you prefer to run scripts individually:

1. **SEND_TAB_SCHEMA.sql** - Creates 14 tables with indexes
2. **SEND_TAB_STORAGE_BUCKETS.sql** - Creates 4 storage buckets
3. **SEND_TAB_RLS_POLICIES.sql** - Configures Row Level Security
4. **SEND_TAB_FUNCTIONS.sql** - Creates utility functions and triggers

---

## 📦 Step 2: Storage Buckets Verification

After running the storage bucket script, verify in Supabase Dashboard:

### Expected Buckets:

1. **send-documents** (Private, 100MB)
   - Stores uploaded documents
   - MIME types: PDF, DOCX, PPTX, XLSX, Images

2. **send-thumbnails** (Public, 5MB)
   - Stores document thumbnails
   - MIME types: PNG, JPEG, WebP

3. **send-watermarks** (Private, 2MB)
   - Stores watermark images
   - MIME types: PNG, SVG

4. **brand-assets** (Public, 5MB)
   - Stores brand logos and assets
   - MIME types: PNG, JPEG, SVG, WebP

---

## 🔐 Step 3: Environment Variables

Add these to your `.env.local` file:

```env
# Existing Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Redis (for Send Tab analytics)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Upstash QStash (for background jobs)
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Send Tab Configuration
NEXT_PUBLIC_SEND_TAB_ENABLED=true
SEND_TAB_DEFAULT_LINK_EXPIRY_DAYS=30
SEND_TAB_MAX_FILE_SIZE_MB=100
```

---

## ⚡ Step 4: Upstash Redis Setup

### 1. Create Redis Database

1. Go to [Upstash Console](https://console.upstash.com/redis)
2. Click "Create Database"
3. Choose a region close to your Supabase region
4. Copy the REST URL and Token

### 2. Configure Redis Keys

The Send Tab feature uses these Redis key patterns:

```
send:views:{linkId}:{date}          - Daily view counts
send:views:{linkId}:{hour}          - Hourly view counts
send:active_viewers:{linkId}        - Active viewer set
send:viewer:{sessionId}             - Viewer session data
send:access:{token}                 - Temporary access tokens
send:doc:{documentId}               - Document cache
send:analytics:{linkId}             - Analytics aggregation
send:session:{sessionId}            - Session management
```

---

## 🔄 Step 5: QStash Setup

### 1. Create QStash Account

1. Go to [Upstash Console](https://console.upstash.com/qstash)
2. Enable QStash for your account
3. Copy the tokens and signing keys

### 2. Configure Job Queues

QStash will handle these background jobs:

- **Email Notifications** - View notifications, reminders
- **PDF Processing** - Thumbnail generation, OCR
- **Analytics Aggregation** - Hourly/daily rollups
- **Webhook Delivery** - Event notifications
- **Link Expiration** - Scheduled deactivation
- **Cleanup Jobs** - Expired verifications, old data

---

## 📊 Step 6: Database Verification

Run this query in Supabase SQL Editor to verify setup:

```sql
-- Check all tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'shared_documents', 'document_links', 'link_access_controls',
            'document_views', 'page_views', 'visitor_sessions',
            'link_email_verifications', 'document_ndas', 'document_feedback',
            'custom_domains', 'branding_settings', 'link_analytics_events',
            'data_rooms', 'data_room_documents'
        ) THEN '✅'
        ELSE '❌'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%document%' OR table_name LIKE '%link%' OR table_name LIKE '%data_room%'
ORDER BY table_name;

-- Check storage buckets
SELECT 
    id as bucket_name,
    public,
    file_size_limit / 1048576 as size_limit_mb,
    CASE 
        WHEN id IN ('send-documents', 'send-thumbnails', 'send-watermarks', 'brand-assets') THEN '✅'
        ELSE '❌'
    END as status
FROM storage.buckets
WHERE id LIKE 'send-%' OR id = 'brand-assets'
ORDER BY id;

-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'shared_documents', 'document_links', 'link_access_controls',
    'document_views', 'page_views', 'visitor_sessions'
)
ORDER BY tablename;
```

---

## 🧪 Step 7: Test the Setup

### Test Database Connection

```typescript
// Test in your Next.js app
import { supabase } from '@/lib/supabase'

async function testSendTabSetup() {
  // Test table access
  const { data, error } = await supabase
    .from('shared_documents')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('❌ Database test failed:', error)
  } else {
    console.log('✅ Database connection successful')
  }
  
  // Test storage bucket
  const { data: buckets, error: bucketError } = await supabase
    .storage
    .listBuckets()
  
  const sendBuckets = buckets?.filter(b => 
    b.name.startsWith('send-') || b.name === 'brand-assets'
  )
  
  console.log('✅ Found storage buckets:', sendBuckets?.length)
}
```

### Test Redis Connection

```typescript
import { redis } from '@/lib/upstash-config'

async function testRedis() {
  try {
    await redis.set('send:test', 'Hello Send Tab!')
    const value = await redis.get('send:test')
    console.log('✅ Redis test successful:', value)
    await redis.del('send:test')
  } catch (error) {
    console.error('❌ Redis test failed:', error)
  }
}
```

---

## 📝 Step 8: Next Steps

After completing the database setup, proceed with:

1. **Phase 2: Core Document Upload & Sharing**
   - Implement document upload service
   - Build share link generation
   - Create viewer pages

2. **Phase 3: Advanced Analytics & Tracking**
   - Build analytics dashboard
   - Implement real-time tracking
   - Create visitor profiles

3. **Phase 4: Security & Access Control**
   - Implement NDA acceptance
   - Add watermarking
   - Configure access restrictions

---

## 🔧 Troubleshooting

### Tables Not Created

**Issue**: Tables don't appear after running SQL
**Solution**: 
- Check for SQL errors in the Supabase SQL Editor
- Ensure you have proper permissions
- Try running scripts individually

### Storage Buckets Not Created

**Issue**: Buckets don't appear in Storage
**Solution**:
- Ensure Storage is enabled in your Supabase project
- Check for naming conflicts
- Manually create buckets via Dashboard if needed

### RLS Policies Blocking Access

**Issue**: Can't insert/update data
**Solution**:
- Verify you're authenticated
- Check RLS policies match your use case
- Temporarily disable RLS for testing (not recommended for production)

### Redis Connection Failed

**Issue**: Can't connect to Upstash Redis
**Solution**:
- Verify environment variables are correct
- Check Redis instance is active
- Ensure REST API is enabled

---

## 📚 Additional Resources

- [Send Tab Feature Plan](./SEND_TAB_COMPLETE_FEATURE_PLAN.md)
- [Send Tab Task Breakdown](./SEND_TAB_TASK_BREAKDOWN.md)
- [Send Tab Quick Start Guide](./SENDTUSK_QUICK_START_GUIDE.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Upstash QStash Documentation](https://docs.upstash.com/qstash)

---

## ✅ Setup Checklist

- [ ] Database tables created (14 tables)
- [ ] Storage buckets created (4 buckets)
- [ ] RLS policies configured
- [ ] Functions and triggers created
- [ ] Environment variables configured
- [ ] Upstash Redis connected
- [ ] Upstash QStash configured
- [ ] Database verification passed
- [ ] Test connections successful
- [ ] Ready for Phase 2 implementation

---

**Need Help?** Check the troubleshooting section or refer to the complete feature plan for detailed specifications.

