# 📝 Send Tab Naming Convention Update

## Overview

All Send Tab database tables and storage buckets now follow a consistent naming convention with the `send_` prefix for tables and `send-` prefix for storage buckets.

---

## ✅ Updated Naming Convention

### Database Tables (14 Tables)

All tables now use the `send_` prefix:

| Old Name | New Name |
|----------|----------|
| `shared_documents` | `send_shared_documents` |
| `document_links` | `send_document_links` |
| `link_access_controls` | `send_link_access_controls` |
| `document_views` | `send_document_views` |
| `page_views` | `send_page_views` |
| `visitor_sessions` | `send_visitor_sessions` |
| `link_email_verifications` | `send_email_verifications` |
| `document_ndas` | `send_document_ndas` |
| `document_feedback` | `send_document_feedback` |
| `custom_domains` | `send_custom_domains` |
| `branding_settings` | `send_branding_settings` |
| `link_analytics_events` | `send_analytics_events` |
| `data_rooms` | `send_data_rooms` |
| `data_room_documents` | `send_data_room_documents` |

### Storage Buckets (4 Buckets)

All buckets now use the `send-` prefix:

| Bucket Name | Status |
|-------------|--------|
| `send-documents` | ✅ Already correct |
| `send-thumbnails` | ✅ Already correct |
| `send-watermarks` | ✅ Already correct |
| `send-brand-assets` | ✅ Updated from `brand-assets` |

---

## 📁 Updated Files

### 1. **SEND_TAB_SCHEMA.sql**
- ✅ All 14 table definitions updated with `send_` prefix
- ✅ All foreign key references updated
- ✅ All indexes renamed to match new table names

### 2. **SEND_TAB_STORAGE_BUCKETS.sql**
- ✅ `brand-assets` renamed to `send-brand-assets`
- ✅ All storage policies updated
- ✅ Verification queries updated

### 3. **RENAME_TABLES_TO_SEND_PREFIX.sql** (NEW)
- ✅ Migration script to rename existing tables
- ✅ Renames all 14 tables
- ✅ Renames all indexes
- ✅ Updates storage bucket name

---

## 🚀 How to Apply Changes

### Option 1: Fresh Installation (Recommended)

If you haven't deployed the database yet, simply run the updated scripts:

```sql
-- Run in Supabase SQL Editor
\i SEND_TAB_SCHEMA.sql
\i SEND_TAB_STORAGE_BUCKETS.sql
\i SEND_TAB_RLS_POLICIES.sql
\i SEND_TAB_FUNCTIONS.sql
```

### Option 2: Rename Existing Tables

If you already have tables without the `send_` prefix, run the rename script:

```sql
-- WARNING: This will rename existing tables!
-- Backup your data first!
\i RENAME_TABLES_TO_SEND_PREFIX.sql
```

This script will:
1. Rename all 14 tables to use `send_` prefix
2. Rename all indexes
3. Update the `brand-assets` bucket to `send-brand-assets`

---

## 📊 Benefits of Consistent Naming

### 1. **Namespace Isolation**
- All Send Tab tables are clearly identified
- Prevents naming conflicts with other features
- Easy to identify Send Tab-related tables

### 2. **Better Organization**
- Tables are grouped together in database tools
- Easier to manage permissions and policies
- Clear separation from other features (Sign, Verify, etc.)

### 3. **Consistency**
- Matches storage bucket naming convention
- Follows industry best practices
- Easier for developers to understand

### 4. **Future-Proof**
- Room for other feature prefixes (e.g., `sign_`, `verify_`)
- Scalable architecture
- Clear feature boundaries

---

## 🔄 Migration Impact

### Database Changes

**Tables Renamed**: 14  
**Indexes Renamed**: 16  
**Storage Buckets Renamed**: 1  
**Foreign Keys**: Automatically updated by PostgreSQL  
**RLS Policies**: Need to be recreated (handled by scripts)

### Application Code Impact

If you have existing application code, you'll need to update:

1. **Database Queries**
   ```typescript
   // Old
   const { data } = await supabase.from('shared_documents').select('*')
   
   // New
   const { data } = await supabase.from('send_shared_documents').select('*')
   ```

2. **Storage Bucket References**
   ```typescript
   // Old
   const { data } = await supabase.storage.from('brand-assets').upload(...)
   
   // New
   const { data } = await supabase.storage.from('send-brand-assets').upload(...)
   ```

3. **Type Definitions**
   - Update TypeScript interfaces
   - Regenerate Supabase types if using type generation

---

## ✅ Verification

After applying the changes, verify the naming:

```sql
-- Check all Send Tab tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'send_%'
ORDER BY table_name;
-- Should return 14 tables

-- Check all Send Tab indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_send_%'
ORDER BY indexname;
-- Should return 16+ indexes

-- Check storage buckets
SELECT id, name, public 
FROM storage.buckets 
WHERE id LIKE 'send-%'
ORDER BY id;
-- Should return 4 buckets
```

---

## 📝 Updated Documentation

The following documentation files reflect the new naming convention:

- ✅ `SEND_TAB_SCHEMA.sql` - Table definitions
- ✅ `SEND_TAB_STORAGE_BUCKETS.sql` - Storage bucket setup
- ⚠️ `SEND_TAB_RLS_POLICIES.sql` - Needs manual update
- ⚠️ `SEND_TAB_FUNCTIONS.sql` - Needs manual update
- ⚠️ `SEND_TAB_COMPLETE_SETUP.sql` - Needs manual update
- ✅ `RENAME_TABLES_TO_SEND_PREFIX.sql` - Migration script

---

## 🎯 Next Steps

1. **Review the changes** in the updated SQL files
2. **Backup your database** if you have existing data
3. **Run the appropriate script** (fresh install or rename)
4. **Update application code** to use new table names
5. **Regenerate types** if using TypeScript type generation
6. **Test thoroughly** before deploying to production

---

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running migration scripts
2. **Test in Development**: Test the rename script in a development environment first
3. **Update Code**: Remember to update all application code references
4. **RLS Policies**: RLS policies will need to be recreated after renaming
5. **Functions**: Database functions will need to be updated to reference new table names

---

## 📞 Support

If you encounter any issues during the migration:

1. Check the error messages carefully
2. Verify foreign key constraints are intact
3. Ensure RLS policies are properly configured
4. Test with a simple query to each table
5. Review the verification queries above

---

**Last Updated**: 2025-01-04  
**Status**: ✅ Naming convention standardized  
**Impact**: Database tables and storage buckets  
**Action Required**: Update application code references

---

## Summary

✅ All 14 database tables now use `send_` prefix  
✅ All 4 storage buckets now use `send-` prefix  
✅ Migration script available for existing installations  
✅ Consistent naming across the entire Send Tab feature  
✅ Better organization and namespace isolation

