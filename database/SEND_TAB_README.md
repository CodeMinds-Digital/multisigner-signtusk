# 📊 Send Tab Database Documentation

## Overview

This directory contains all database-related files for the Send Tab feature, including schema definitions, storage bucket configurations, RLS policies, functions, and migration scripts.

---

## 📁 File Structure

```
database/
├── SEND_TAB_SCHEMA.sql                 # Core table definitions
├── SEND_TAB_STORAGE_BUCKETS.sql        # Storage bucket setup
├── SEND_TAB_RLS_POLICIES.sql           # Row Level Security policies
├── SEND_TAB_FUNCTIONS.sql              # Database functions and triggers
├── SEND_TAB_COMPLETE_SETUP.sql         # All-in-one setup script
└── migrations/
    ├── 001_send_tab_initial.sql        # Initial migration
    └── 001_send_tab_rollback.sql       # Rollback script
```

---

## 🚀 Quick Start

### Option 1: Complete Setup (Recommended)

Run the all-in-one script in Supabase SQL Editor:

```sql
-- 1. Run complete setup
\i SEND_TAB_COMPLETE_SETUP.sql

-- 2. Create storage buckets
\i SEND_TAB_STORAGE_BUCKETS.sql

-- 3. Configure RLS policies
\i SEND_TAB_RLS_POLICIES.sql

-- 4. Create functions and triggers
\i SEND_TAB_FUNCTIONS.sql
```

### Option 2: Individual Scripts

Run scripts in this order:

1. `SEND_TAB_SCHEMA.sql` - Creates tables and indexes
2. `SEND_TAB_STORAGE_BUCKETS.sql` - Creates storage buckets
3. `SEND_TAB_RLS_POLICIES.sql` - Configures security
4. `SEND_TAB_FUNCTIONS.sql` - Creates utility functions

### Option 3: Migration Script

Use the migration system:

```sql
\i migrations/001_send_tab_initial.sql
```

---

## 📊 Database Schema

### Tables (14 Total)

#### Core Tables

1. **shared_documents**
   - Main document metadata
   - Tracks versions and status
   - Links to user and team

2. **document_links**
   - Shareable link configurations
   - Password protection
   - Expiration and view limits

3. **link_access_controls**
   - Advanced access restrictions
   - Email/domain whitelisting
   - Geographic restrictions
   - Watermark settings

#### Analytics Tables

4. **document_views**
   - Individual view tracking
   - Visitor information
   - Engagement metrics

5. **page_views**
   - Page-by-page analytics
   - Time spent per page
   - Scroll depth tracking

6. **visitor_sessions**
   - Session aggregation
   - Returning visitor detection
   - Total engagement metrics

7. **link_analytics_events**
   - Detailed event tracking
   - Custom event data (JSONB)

#### Access Control Tables

8. **link_email_verifications**
   - Email verification codes
   - Expiration tracking

9. **document_ndas**
   - NDA acceptance records
   - Legal binding signatures
   - IP address logging

#### Feedback & Customization

10. **document_feedback**
    - Ratings and comments
    - Survey responses

11. **custom_domains**
    - White-label domains
    - SSL configuration
    - Verification status

12. **branding_settings**
    - Custom logos and colors
    - Email templates
    - CSS customization

#### Advanced Features

13. **data_rooms**
    - Virtual data room collections
    - Folder structures

14. **data_room_documents**
    - Document-to-room mapping
    - Sort order management

---

## 💾 Storage Buckets

### 1. send-documents (Private, 100MB)
- **Purpose**: Store uploaded documents
- **MIME Types**: PDF, DOCX, PPTX, XLSX, Images
- **Access**: User-owned files only

### 2. send-thumbnails (Public, 5MB)
- **Purpose**: Document preview thumbnails
- **MIME Types**: PNG, JPEG, WebP
- **Access**: Public read, user write

### 3. send-watermarks (Private, 2MB)
- **Purpose**: Custom watermark images
- **MIME Types**: PNG, SVG
- **Access**: User-owned files only

### 4. brand-assets (Public, 5MB)
- **Purpose**: Brand logos and assets
- **MIME Types**: PNG, JPEG, SVG, WebP
- **Access**: Public read, user write

---

## 🔒 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- **User Isolation**: Users can only access their own data
- **Anonymous Access**: Public can track views and submit feedback
- **Team Access**: Team members can access shared documents

### Storage Policies

- **Private Buckets**: User-scoped access using folder structure
- **Public Buckets**: Read access for all, write for authenticated users
- **Path-based Security**: Files organized by user ID

---

## ⚙️ Database Functions

### Utility Functions

- `generate_link_id()` - Generate unique short link IDs
- `update_updated_at_column()` - Auto-update timestamps
- `increment_link_view_count(UUID)` - Atomic view counter
- `calculate_engagement_score(...)` - Compute engagement metrics
- `upsert_visitor_session(...)` - Create/update visitor sessions
- `is_link_accessible(UUID)` - Check link validity

### Analytics Functions

- `get_link_analytics(UUID)` - Aggregate link statistics
- `get_document_analytics(UUID)` - Aggregate document statistics

### Cleanup Functions

- `cleanup_expired_verifications()` - Remove expired email codes
- `deactivate_expired_links()` - Disable expired links

---

## 📈 Indexes

Performance indexes on:
- User IDs for fast user data queries
- Link IDs for quick link lookups
- Session IDs for visitor tracking
- Timestamps for time-based queries
- Event types for analytics filtering

---

## 🔄 Migrations

### Running Migrations

```sql
-- Apply migration
\i migrations/001_send_tab_initial.sql

-- Rollback migration (WARNING: Deletes all data!)
\i migrations/001_send_tab_rollback.sql
```

### Migration Tracking

Migrations are tracked in `schema_migrations` table:

```sql
SELECT * FROM public.schema_migrations;
```

---

## 🧪 Testing

### Verify Setup

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%document%' OR table_name LIKE '%link%';

-- Check storage buckets
SELECT id, public, file_size_limit 
FROM storage.buckets 
WHERE id LIKE 'send-%' OR id = 'brand-assets';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('shared_documents', 'document_links');
```

### Test Data Insertion

```sql
-- Insert test document
INSERT INTO public.shared_documents (
    user_id, title, file_url, file_name, file_type
) VALUES (
    auth.uid(),
    'Test Document',
    'test/document.pdf',
    'document.pdf',
    'application/pdf'
);

-- Create test link
INSERT INTO public.document_links (
    document_id, link_id, title, created_by
) VALUES (
    (SELECT id FROM public.shared_documents LIMIT 1),
    public.generate_link_id(),
    'Test Link',
    auth.uid()
);
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue**: Tables not created
- **Solution**: Check for SQL errors, ensure proper permissions

**Issue**: RLS blocking access
- **Solution**: Verify authentication, check policy conditions

**Issue**: Storage buckets not accessible
- **Solution**: Ensure Storage is enabled in Supabase project

**Issue**: Functions not working
- **Solution**: Check function signatures, verify SECURITY DEFINER

### Debug Queries

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename LIKE '%document%';

-- Check storage policies
SELECT * FROM storage.policies;

-- Check function definitions
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%link%' OR proname LIKE '%document%';
```

---

## 📚 Additional Resources

- [Setup Guide](../docs/sendtusk/SEND_TAB_SETUP_GUIDE.md)
- [Feature Plan](../docs/sendtusk/SEND_TAB_COMPLETE_FEATURE_PLAN.md)
- [Task Breakdown](../docs/sendtusk/SEND_TAB_TASK_BREAKDOWN.md)
- [Supabase Documentation](https://supabase.com/docs)

---

## ⚠️ Important Notes

1. **Backup Before Rollback**: Always backup data before running rollback scripts
2. **Test in Development**: Test all scripts in development before production
3. **Monitor Performance**: Add indexes as needed based on query patterns
4. **Security First**: Never disable RLS in production
5. **Regular Cleanup**: Schedule cleanup jobs for expired data

---

## 📝 Changelog

### Version 001 (2025-01-04)
- Initial Send Tab database schema
- 14 tables with full RLS policies
- 4 storage buckets with access policies
- Utility functions and triggers
- Migration and rollback scripts

---

**Need Help?** Refer to the setup guide or check the troubleshooting section above.

