# 🗄️ Supabase Setup Guide - Email Preferences

## 📋 **Overview**

This guide will help you create the `notification_preferences` table in Supabase for the email optimization feature.

---

## ⏱️ **Total Time: 10 minutes**

---

## 🎯 **Step 1: Check Current Database (2 minutes)**

### **1.1 Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project:
   - **Project:** `signtuskfinal` (ID: gzxfsojbbfipzvjxucci)
   - **OR:** `archaan` (ID: bumaufzofakwytngkaro)

### **1.2 Navigate to SQL Editor**

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button

### **1.3 Run Verification Script**

Copy and paste this into the SQL Editor:

```sql
-- Check if notification_preferences table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_preferences'
) as table_exists;
```

Click **"Run"** button.

**Expected Result:**
- If `table_exists` = `false` → Continue to Step 2
- If `table_exists` = `true` → Skip to Step 3

---

## 🚀 **Step 2: Create notification_preferences Table (5 minutes)**

### **2.1 Open Migration File**

In your code editor, open:
```
database/migrations/create_notification_preferences.sql
```

### **2.2 Copy Entire File**

Select all content (Cmd+A / Ctrl+A) and copy (Cmd+C / Ctrl+C)

### **2.3 Run in Supabase**

1. Go back to Supabase SQL Editor
2. Click **"New Query"**
3. Paste the migration SQL
4. Click **"Run"** button

### **2.4 Verify Success**

You should see output like:
```
✅ notification_preferences table created successfully!
✅ Total users: X
✅ Preferences created: X
✅ Phase 1 Optimization: 3 redundant email types now disabled by default
   - document_viewed_emails: disabled (too frequent)
   - other_signer_notifications: disabled (spammy)
   - progress_updates: enabled (useful)
✅ RLS policies enabled
✅ Auto-create trigger enabled for new users
```

---

## ✅ **Step 3: Verify Table Structure (2 minutes)**

### **3.1 Check Table Columns**

Run this query:

```sql
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid)
- `user_id` (uuid)
- `email_notifications` (boolean, default: true)
- `push_notifications` (boolean, default: true)
- `signature_requests` (boolean, default: true)
- `document_updates` (boolean, default: true)
- `reminders` (boolean, default: true)
- `marketing` (boolean, default: false)
- `progress_updates` (boolean, default: true)
- `document_viewed_emails` (boolean, default: false) ⚡
- `other_signer_notifications` (boolean, default: false) ⚡
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### **3.2 Check RLS Policies**

Run this query:

```sql
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notification_preferences';
```

**Expected Policies:**
- `Users can view own preferences` (SELECT)
- `Users can insert own preferences` (INSERT)
- `Users can update own preferences` (UPDATE)
- `Users can delete own preferences` (DELETE)

### **3.3 Check Data**

Run this query:

```sql
SELECT 
    COUNT(*) as total_preferences,
    COUNT(*) FILTER (WHERE email_notifications = true) as email_enabled,
    COUNT(*) FILTER (WHERE document_viewed_emails = false) as viewed_disabled,
    COUNT(*) FILTER (WHERE other_signer_notifications = false) as other_signer_disabled
FROM notification_preferences;
```

**Expected:**
- `total_preferences` = number of users in your system
- `email_enabled` = same as total (all enabled by default)
- `viewed_disabled` = same as total (disabled by default) ✅
- `other_signer_disabled` = same as total (disabled by default) ✅

---

## 🧪 **Step 4: Test the Integration (1 minute)**

### **4.1 Test Query**

Run this to simulate getting preferences:

```sql
-- Get preferences for a user (replace with actual user_id)
SELECT * FROM notification_preferences 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
```

### **4.2 Test Insert**

```sql
-- Test inserting preferences for a new user
INSERT INTO notification_preferences (user_id)
VALUES ((SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (user_id) DO NOTHING;
```

Should complete without errors.

---

## 📊 **Step 5: View in Supabase Table Editor**

### **5.1 Navigate to Table Editor**

1. Click **"Table Editor"** in left sidebar
2. Find **"notification_preferences"** table
3. Click to view

### **5.2 Verify Data**

You should see:
- All existing users have preference rows
- Default values are correct:
  - ✅ `email_notifications`: true
  - ✅ `signature_requests`: true
  - ✅ `reminders`: true
  - ✅ `document_updates`: true
  - ✅ `progress_updates`: true
  - ❌ `document_viewed_emails`: false
  - ❌ `other_signer_notifications`: false
  - ❌ `marketing`: false

---

## 🔧 **Troubleshooting**

### **Issue 1: "relation does not exist"**

**Solution:** Run the migration again:
```sql
-- Copy entire content from:
-- database/migrations/create_notification_preferences.sql
```

### **Issue 2: "permission denied"**

**Solution:** Make sure you're logged in as the project owner in Supabase Dashboard.

### **Issue 3: "trigger already exists"**

**Solution:** This is OK! The migration uses `DROP TRIGGER IF EXISTS` to handle this.

### **Issue 4: No preferences created for existing users**

**Solution:** Run this manually:
```sql
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

---

## ✅ **Success Checklist**

After completing all steps, verify:

- [ ] `notification_preferences` table exists
- [ ] Table has 13 columns
- [ ] RLS is enabled (4 policies)
- [ ] All existing users have preference rows
- [ ] Default values are correct
- [ ] Trigger is created for new users
- [ ] No errors in Supabase logs

---

## 🎉 **Next Steps**

Once the table is created in Supabase:

1. **Test locally:**
   ```bash
   npm run dev
   # Visit: http://localhost:3000/settings/notifications
   ```

2. **Deploy to production:**
   ```bash
   git add .
   git commit -m "feat: Phase 1 email optimization"
   git push origin main
   ```

3. **Monitor:**
   - Check email volume in Resend dashboard
   - Monitor user preferences adoption
   - Track email open rates

---

## 📚 **Related Files**

- **Migration:** `database/migrations/create_notification_preferences.sql`
- **Verification:** `scripts/verify-notification-preferences.sql`
- **Implementation:** `EMAIL_PHASE1_IMPLEMENTATION_COMPLETE.md`
- **Deployment:** `DEPLOY_EMAIL_OPTIMIZATION.md`

---

## 🆘 **Need Help?**

If you encounter issues:

1. Check Supabase logs (Dashboard → Logs)
2. Verify your project ID is correct
3. Make sure you have admin access
4. Try running verification script again

---

**Ready to create the table? Start with Step 1!** 🚀

