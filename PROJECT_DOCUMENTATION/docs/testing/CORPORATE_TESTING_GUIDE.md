# Corporate Account Management - Testing Guide

## 🧪 Quick Testing Steps

### Test 1: First Corporate User (Owner Creation)

**Steps:**
1. Open browser: `http://localhost:3000/signup`
2. Click "Corporate" account type
3. Fill in form:
   - First Name: `John`
   - Last Name: `Doe`
   - Company Name: `Acme Corporation`
   - Email: `john@acmecorp.com`
   - Password: `Test123!@#`
4. Observe: Green message "🎉 You'll be the first!"
5. Click "Sign Up"

**Expected Result:**
- ✅ User created successfully
- ✅ Redirected to verify-email page
- ✅ Database check:
  ```sql
  SELECT * FROM corporate_accounts WHERE email_domain = 'acmecorp.com';
  -- Should show: company_name='Acme Corporation', access_mode='invite_only', owner_id=<user_id>
  
  SELECT * FROM user_profiles WHERE email = 'john@acmecorp.com';
  -- Should show: corporate_role='owner', account_status='active'
  ```

---

### Test 2: Domain Check - Real-time Feedback

**Steps:**
1. Open signup page
2. Select "Corporate"
3. Enter email: `jane@acmecorp.com` (same domain as Test 1)
4. Wait 1-2 seconds

**Expected Result:**
- ✅ Loading spinner appears briefly
- ✅ Yellow/orange message appears: "⚠️ This domain is part of Acme Corporation. This account is invite-only..."
- ✅ Company name auto-fills to "Acme Corporation"
- ✅ Message indicates signup is not available

---

### Test 3: Change Access Mode to Open

**Manual Database Update (until Phase 3 UI is complete):**
```sql
UPDATE corporate_accounts 
SET access_mode = 'open' 
WHERE email_domain = 'acmecorp.com';
```

**Then test signup:**
1. Refresh signup page
2. Select "Corporate"
3. Enter email: `jane@acmecorp.com`
4. Fill in form
5. Click "Sign Up"

**Expected Result:**
- ✅ Blue message: "📋 You will be automatically added as a member"
- ✅ User created successfully
- ✅ Database check:
  ```sql
  SELECT * FROM user_profiles WHERE email = 'jane@acmecorp.com';
  -- Should show: corporate_role='member', account_status='active'
  
  SELECT * FROM corporate_audit_logs 
  WHERE corporate_account_id = (SELECT id FROM corporate_accounts WHERE email_domain = 'acmecorp.com')
  ORDER BY created_at DESC LIMIT 1;
  -- Should show: action='user_auto_joined'
  ```

---

### Test 4: Change Access Mode to Approval

**Manual Database Update:**
```sql
UPDATE corporate_accounts 
SET access_mode = 'approval' 
WHERE email_domain = 'acmecorp.com';
```

**Then test signup:**
1. Refresh signup page
2. Select "Corporate"
3. Enter email: `bob@acmecorp.com`
4. Fill in form
5. Click "Sign Up"

**Expected Result:**
- ✅ Blue message: "⏳ Your access request will require admin approval"
- ✅ User created but suspended
- ✅ Redirected to verify-email with `?status=pending_approval`
- ✅ Database check:
  ```sql
  SELECT * FROM user_profiles WHERE email = 'bob@acmecorp.com';
  -- Should show: corporate_role=NULL, account_status='suspended'
  
  SELECT * FROM corporate_access_requests WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'bob@acmecorp.com');
  -- Should show: status='pending'
  ```

---

### Test 5: Personal Account (Unchanged)

**Steps:**
1. Open signup page
2. Select "Personal" account type
3. Fill in form with any email
4. Click "Sign Up"

**Expected Result:**
- ✅ Works exactly as before
- ✅ No corporate account created
- ✅ User profile has account_type='personal'
- ✅ No corporate_account_id

---

## 🔍 Database Inspection Queries

### View All Corporate Accounts
```sql
SELECT 
  ca.id,
  ca.company_name,
  ca.email_domain,
  ca.access_mode,
  up.email as owner_email,
  ca.created_at
FROM corporate_accounts ca
LEFT JOIN user_profiles up ON ca.owner_id = up.id
ORDER BY ca.created_at DESC;
```

### View Corporate Users
```sql
SELECT 
  up.email,
  up.full_name,
  up.corporate_role,
  up.account_status,
  ca.company_name,
  ca.email_domain
FROM user_profiles up
JOIN corporate_accounts ca ON up.corporate_account_id = ca.id
ORDER BY ca.company_name, up.corporate_role;
```

### View Pending Access Requests
```sql
SELECT 
  car.id,
  up.email,
  up.full_name,
  ca.company_name,
  car.status,
  car.created_at
FROM corporate_access_requests car
JOIN user_profiles up ON car.user_id = up.id
JOIN corporate_accounts ca ON car.corporate_account_id = ca.id
WHERE car.status = 'pending'
ORDER BY car.created_at DESC;
```

### View Audit Logs
```sql
SELECT 
  cal.action,
  admin.email as admin_email,
  target.email as target_email,
  ca.company_name,
  cal.details,
  cal.created_at
FROM corporate_audit_logs cal
JOIN user_profiles admin ON cal.admin_id = admin.id
LEFT JOIN user_profiles target ON cal.target_user_id = target.id
JOIN corporate_accounts ca ON cal.corporate_account_id = ca.id
ORDER BY cal.created_at DESC
LIMIT 20;
```

### View Invitations (when Phase 4 is complete)
```sql
SELECT 
  ci.email,
  ci.role,
  ci.status,
  inviter.email as invited_by_email,
  ca.company_name,
  ci.expires_at,
  ci.created_at
FROM corporate_invitations ci
JOIN user_profiles inviter ON ci.invited_by = inviter.id
JOIN corporate_accounts ca ON ci.corporate_account_id = ca.id
ORDER BY ci.created_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: Domain check not working
**Solution:**
- Check browser console for errors
- Verify API endpoint: `http://localhost:3000/api/corporate/check-domain`
- Test directly:
  ```bash
  curl -X POST http://localhost:3000/api/corporate/check-domain \
    -H "Content-Type: application/json" \
    -d '{"email":"test@acmecorp.com"}'
  ```

### Issue: Signup fails with "Failed to create corporate account"
**Solution:**
- Check Supabase logs
- Verify environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Check database connection

### Issue: RLS policy blocking access
**Solution:**
- Verify user is authenticated
- Check if user has correct corporate_account_id
- Run:
  ```sql
  SELECT * FROM user_profiles WHERE id = auth.uid();
  ```

### Issue: Personal email accepted for corporate account
**Solution:**
- Check `validateCorporateEmail()` function in signup-form.tsx
- Verify domain is in `personalDomains` list
- Add more domains if needed

---

## ✅ Verification Checklist

After testing, verify:

- [ ] First user becomes owner
- [ ] Corporate account created with correct domain
- [ ] Domain check shows real-time feedback
- [ ] Company name auto-fills for existing domains
- [ ] Open mode: users auto-join as members
- [ ] Approval mode: creates access request
- [ ] Invite-only mode: blocks signup
- [ ] Personal accounts still work
- [ ] Audit logs created for all actions
- [ ] RLS policies prevent unauthorized access
- [ ] No errors in browser console
- [ ] No errors in Supabase logs

---

## 📞 API Testing with cURL

### Check Domain
```bash
curl -X POST http://localhost:3000/api/corporate/check-domain \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Corporate Signup
```bash
curl -X POST http://localhost:3000/api/corporate/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@newcompany.com",
    "password":"SecurePass123!",
    "fullName":"Admin User",
    "firstName":"Admin",
    "lastName":"User",
    "companyName":"New Company Inc"
  }'
```

---

## 🎯 Success Criteria

✅ **Phase 1 & 2 Complete When:**
1. First corporate user can sign up and become owner
2. Domain check works in real-time
3. Different access modes behave correctly
4. Personal accounts unaffected
5. All data properly secured with RLS
6. Audit logs track all actions
7. No console errors
8. Database schema matches specification

---

## 📝 Test Data Cleanup

To reset and start fresh:

```sql
-- WARNING: This deletes all corporate data!
DELETE FROM corporate_audit_logs;
DELETE FROM corporate_access_requests;
DELETE FROM corporate_invitations;
DELETE FROM user_profiles WHERE corporate_account_id IS NOT NULL;
DELETE FROM corporate_accounts;

-- Also delete auth users if needed
-- (Do this from Supabase Dashboard > Authentication > Users)
```

---

## 🚀 Next Steps After Testing

Once Phase 1 & 2 are verified:
1. Move to Phase 3: Access Control Modes UI
2. Implement Phase 4: Invitation System
3. Build Phase 5: User Management Interface
4. Complete Phase 6: Settings & Permissions

Happy Testing! 🎉

