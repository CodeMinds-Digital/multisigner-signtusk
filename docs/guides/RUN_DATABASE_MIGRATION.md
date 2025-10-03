# Database Migration Guide: Personal → Individual, Corporate → Enterprise

## 🎯 Overview

This guide will help you run the database migration to rename account types from:
- `'personal'` → `'individual'`
- `'corporate'` → `'enterprise'`

---

## ⚠️ IMPORTANT: Backup First!

Before running any migration, **ALWAYS create a backup**:

```sql
-- Create backup table
CREATE TABLE user_profiles_backup_20250115 AS 
SELECT * FROM user_profiles;

-- Verify backup
SELECT COUNT(*) FROM user_profiles_backup_20250115;
```

---

## 📋 Migration Steps

### **Option 1: Using Supabase Dashboard (Recommended)**

1. **Open Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project: `signtuskfinal` or `archaan`

2. **Navigate to SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration Script**:
   - Copy the entire content from `database/migrations/rename_account_types.sql`
   - Paste into the SQL Editor
   - Click "Run" button

4. **Verify Results**:
   - Check the output for success messages
   - Verify no errors occurred

---

### **Option 2: Using Supabase CLI**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db execute -f database/migrations/rename_account_types.sql
```

---

### **Option 3: Using psql (Direct Connection)**

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"

# Run the migration file
\i database/migrations/rename_account_types.sql

# Or run inline
\copy (SELECT * FROM user_profiles) TO 'backup.csv' CSV HEADER;
```

---

## ✅ Verification Checklist

After running the migration, verify the changes:

### **1. Check Account Type Values**

```sql
-- Should show only 'individual' and 'enterprise'
SELECT 
  account_type,
  COUNT(*) as count
FROM user_profiles
GROUP BY account_type
ORDER BY account_type;

-- Expected output:
-- account_type | count
-- enterprise   | X
-- individual   | Y
```

### **2. Verify No Old Values Remain**

```sql
-- Should return 0
SELECT COUNT(*) FROM user_profiles WHERE account_type = 'personal';
-- Result: 0

-- Should return 0
SELECT COUNT(*) FROM user_profiles WHERE account_type = 'corporate';
-- Result: 0
```

### **3. Check Constraint**

```sql
-- Verify the check constraint exists
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND conname = 'user_profiles_account_type_check';

-- Expected output:
-- constraint_name                    | constraint_definition
-- user_profiles_account_type_check   | CHECK ((account_type = ANY (ARRAY['individual'::text, 'enterprise'::text])))
```

### **4. Test User Login**

After migration:
- ✅ Test logging in with an existing individual account
- ✅ Test logging in with an existing enterprise account
- ✅ Test creating a new individual account
- ✅ Test creating a new enterprise account

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Restore from backup
TRUNCATE user_profiles;

INSERT INTO user_profiles
SELECT * FROM user_profiles_backup_20250115;

-- Verify restoration
SELECT COUNT(*) FROM user_profiles;

-- Drop the backup table (only after confirming everything works)
-- DROP TABLE user_profiles_backup_20250115;
```

---

## 📊 Migration Script Content

The migration script (`database/migrations/rename_account_types.sql`) performs:

1. ✅ Updates all `'personal'` values to `'individual'`
2. ✅ Updates all `'corporate'` values to `'enterprise'`
3. ✅ Drops old check constraint
4. ✅ Adds new check constraint with updated values
5. ✅ Updates column comment
6. ✅ Runs verification queries
7. ✅ Displays success message

---

## 🚨 Common Issues & Solutions

### **Issue 1: Permission Denied**

```
ERROR: permission denied for table user_profiles
```

**Solution**: Make sure you're connected as the `postgres` user or a user with sufficient privileges.

---

### **Issue 2: Constraint Violation**

```
ERROR: new row for relation "user_profiles" violates check constraint
```

**Solution**: This means there are existing rows with values other than 'personal' or 'corporate'. Check for data inconsistencies:

```sql
SELECT DISTINCT account_type FROM user_profiles;
```

---

### **Issue 3: Foreign Key Constraints**

If you get foreign key errors, you may need to temporarily disable constraints:

```sql
-- Disable constraints
ALTER TABLE user_profiles DISABLE TRIGGER ALL;

-- Run migration
-- ... your migration SQL ...

-- Re-enable constraints
ALTER TABLE user_profiles ENABLE TRIGGER ALL;
```

---

## 📝 Post-Migration Tasks

After successful migration:

1. ✅ **Test the application**:
   - Individual signup
   - Enterprise signup
   - Login for both account types
   - All enterprise features (invitations, user management, etc.)

2. ✅ **Monitor logs**:
   - Check for any errors in application logs
   - Monitor Supabase logs for database errors

3. ✅ **Update documentation**:
   - Mark migration as complete in `TERMINOLOGY_CHANGE_SUMMARY.md`

4. ✅ **Clean up backup** (after 7 days of successful operation):
   ```sql
   DROP TABLE user_profiles_backup_20250115;
   ```

---

## 🎯 Quick Command Reference

```sql
-- Backup
CREATE TABLE user_profiles_backup_20250115 AS SELECT * FROM user_profiles;

-- Run migration
\i database/migrations/rename_account_types.sql

-- Verify
SELECT account_type, COUNT(*) FROM user_profiles GROUP BY account_type;

-- Rollback (if needed)
TRUNCATE user_profiles;
INSERT INTO user_profiles SELECT * FROM user_profiles_backup_20250115;
```

---

## ✅ Success Criteria

Migration is successful when:

- ✅ All `'personal'` values changed to `'individual'`
- ✅ All `'corporate'` values changed to `'enterprise'`
- ✅ No old values remain in database
- ✅ Check constraint updated
- ✅ All users can log in successfully
- ✅ All features work as expected
- ✅ No errors in application logs

---

## 📞 Support

If you encounter issues:

1. Check the error message carefully
2. Review the verification queries
3. Check Supabase logs
4. Rollback if necessary
5. Contact support with error details

---

**Status**: Ready to run
**Estimated Time**: 5-10 minutes
**Risk Level**: Low (with backup)
**Reversible**: Yes (with backup)

---

**Last Updated**: 2025-01-15

