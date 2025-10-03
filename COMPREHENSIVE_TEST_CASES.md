# Comprehensive Test Cases - Corporate & Individual Flows

## 📋 Table of Contents
1. [Individual Account Flow](#personal-account-flow)
2. [Enterprise Account Flow](#corporate-account-flow)
3. [Access Mode Testing](#access-mode-testing)
4. [Invitation System Testing](#invitation-system-testing)
5. [User Management Testing](#user-management-testing)
6. [Security & Permission Testing](#security--permission-testing)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## 🧑 Individual Account Flow

### **Test Case 1.1: Individual Account Signup**

**Objective**: Verify individual users can sign up successfully

**Steps**:
```
1. Navigate to /signup
2. Select "Individual Account" tab
3. Fill in form:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@gmail.com
   - Password: SecurePass123
   - Confirm Password: SecurePass123
4. Click "Sign Up"
```

**Expected Results**:
- ✅ User created in Supabase Auth
- ✅ User profile created with account_type: 'individual'
- ✅ Email verification sent
- ✅ Redirected to /verify-email page
- ✅ Message: "Please verify your email"

**Database Verification**:
```sql
SELECT 
  email,
  account_type,
  email_verified,
  corporate_account_id,
  corporate_role
FROM user_profiles
WHERE email = 'john.doe@gmail.com';

-- Expected:
-- account_type: 'individual'
-- email_verified: false
-- corporate_account_id: NULL
-- corporate_role: NULL
```

---

### **Test Case 1.2: Individual Account Email Verification**

**Objective**: Verify email verification flow for individual accounts

**Steps**:
```
1. Check email inbox for verification email
2. Click verification link
3. Observe redirect
```

**Expected Results**:
- ✅ Redirected to /auth/callback
- ✅ email_verified set to true in database
- ✅ Redirected to /dashboard
- ✅ Can now log in successfully

**Database Verification**:
```sql
SELECT email_verified 
FROM user_profiles 
WHERE email = 'john.doe@gmail.com';

-- Expected: true
```

---

### **Test Case 1.3: Individual Account Login**

**Objective**: Verify individual users can log in

**Steps**:
```
1. Navigate to /login
2. Enter email: john.doe@gmail.com
3. Enter password: SecurePass123
4. Click "Login"
```

**Expected Results**:
- ✅ Login successful
- ✅ JWT token created
- ✅ Redirected to /dashboard
- ✅ User session active

---

### **Test Case 1.4: Individual Account Dashboard Access**

**Objective**: Verify individual users see correct UI

**Steps**:
```
1. Log in as individual user
2. Check sidebar navigation
3. Check settings pages
```

**Expected Results**:
- ✅ Sidebar shows standard navigation
- ❌ No "Corporate Settings" link
- ❌ No "User Management" link
- ✅ Can access /settings/documents
- ✅ Can access /settings/security
- ✅ Can access /settings/notifications

---

## 🏢 Enterprise Account Flow

### **Test Case 2.1: First Enterprise User Signup (Owner)**

**Objective**: Verify first user from domain becomes owner

**Steps**:
```
1. Navigate to /signup
2. Select "Enterprise Account" tab
3. Fill in form:
   - First Name: Alice
   - Last Name: Smith
   - Email: alice@acmecorp.com
   - Company Name: Acme Corporation
   - Password: SecurePass123
   - Confirm Password: SecurePass123
4. Click "Sign Up"
```

**Expected Results**:
- ✅ Corporate account created for domain: acmecorp.com
- ✅ User created as owner
- ✅ Email verification sent
- ✅ Redirected to /verify-email
- ✅ Message: "Please verify your email"

**Database Verification**:
```sql
-- Check enterprise account
SELECT * FROM corporate_accounts 
WHERE email_domain = 'acmecorp.com';

-- Expected:
-- company_name: 'Acme Corporation'
-- email_domain: 'acmecorp.com'
-- access_mode: 'invite_only' (default)
-- owner_id: alice's user id

-- Check user profile
SELECT 
  email,
  account_type,
  corporate_role,
  account_status,
  corporate_account_id
FROM user_profiles
WHERE email = 'alice@acmecorp.com';

-- Expected:
-- account_type: 'enterprise'
-- corporate_role: 'owner'
-- account_status: 'active'
-- corporate_account_id: <enterprise account id>
```

---

### **Test Case 2.2: Corporate Owner Email Verification**

**Objective**: Verify owner can verify email and access dashboard

**Steps**:
```
1. Check email for verification link
2. Click verification link
3. Observe redirect
```

**Expected Results**:
- ✅ email_verified set to true
- ✅ Redirected to /dashboard
- ✅ Can log in successfully

---

### **Test Case 2.3: Corporate Owner Dashboard Access**

**Objective**: Verify owner sees all corporate features

**Steps**:
```
1. Log in as alice@acmecorp.com
2. Check sidebar
3. Navigate to corporate pages
```

**Expected Results**:
- ✅ Sidebar shows "User Management" link
- ✅ Sidebar shows "Corporate Settings" link
- ✅ Can access /settings/users
- ✅ Can access /settings/corporate
- ✅ Corporate Settings shows:
  - Company information
  - Invitation management
  - Access mode selector
  - Audit log viewer

---

## 🔐 Access Mode Testing

### **Test Case 3.1: Invite-Only Mode (Default)**

**Objective**: Verify invite-only mode blocks signups

**Preconditions**:
- Corporate account exists for acmecorp.com
- Access mode: invite_only

**Steps**:
```
1. Navigate to /signup
2. Select "Enterprise Account"
3. Enter email: bob@acmecorp.com
4. Fill in other details
5. Click "Sign Up"
```

**Expected Results**:
- ❌ Signup blocked
- ✅ Error message: "This enterprise account is invite-only. Please contact your administrator for an invitation."
- ❌ User NOT created in database

---

### **Test Case 3.2: Change to Open Mode**

**Objective**: Verify owner can change access mode

**Steps**:
```
1. Log in as owner (alice@acmecorp.com)
2. Go to /settings/corporate
3. Click "Open Mode" card
4. Confirmation dialog appears
5. Click "Confirm"
```

**Expected Results**:
- ✅ Success message: "Access mode updated successfully!"
- ✅ "Open Mode" card shows "Active" badge
- ✅ Database updated

**Database Verification**:
```sql
SELECT access_mode FROM corporate_accounts 
WHERE email_domain = 'acmecorp.com';

-- Expected: 'open'

-- Check audit log
SELECT action, details FROM corporate_audit_logs 
WHERE action = 'access_mode_changed'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- action: 'access_mode_changed'
-- details: {"new_access_mode": "open"}
```

---

### **Test Case 3.3: Open Mode - Auto-Join**

**Objective**: Verify users auto-join in open mode

**Preconditions**:
- Access mode: open

**Steps**:
```
1. Navigate to /signup
2. Select "Enterprise Account"
3. Enter email: bob@acmecorp.com
4. Fill in details
5. Click "Sign Up"
```

**Expected Results**:
- ✅ User created successfully
- ✅ corporate_role: 'member'
- ✅ account_status: 'active'
- ✅ Email verification sent
- ✅ Message: "Successfully joined enterprise account"

**Database Verification**:
```sql
SELECT 
  email,
  corporate_role,
  account_status,
  corporate_account_id
FROM user_profiles
WHERE email = 'bob@acmecorp.com';

-- Expected:
-- corporate_role: 'member'
-- account_status: 'active'
-- corporate_account_id: <same as alice>
```

---

### **Test Case 3.4: Change to Approval Mode**

**Objective**: Verify approval mode workflow

**Steps**:
```
1. Log in as owner
2. Go to /settings/corporate
3. Change access mode to "Approval Mode"
4. Confirm change
```

**Expected Results**:
- ✅ Access mode changed to 'approval'
- ✅ Audit log created

---

### **Test Case 3.5: Approval Mode - Request Access**

**Objective**: Verify users can request access

**Preconditions**:
- Access mode: approval

**Steps**:
```
1. Navigate to /signup
2. Select "Enterprise Account"
3. Enter email: charlie@acmecorp.com
4. Fill in details
5. Click "Sign Up"
```

**Expected Results**:
- ✅ User created with account_status: 'suspended'
- ✅ Access request created in corporate_access_requests
- ✅ Redirected to "Pending Approval" page
- ✅ Cannot log in yet

**Database Verification**:
```sql
-- Check user status
SELECT account_status FROM user_profiles 
WHERE email = 'charlie@acmecorp.com';

-- Expected: 'suspended'

-- Check access request
SELECT status FROM corporate_access_requests 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'charlie@acmecorp.com');

-- Expected: 'pending'
```

---

## 📧 Invitation System Testing

### **Test Case 4.1: Send Invitation**

**Objective**: Verify owner/admin can send invitations

**Steps**:
```
1. Log in as owner (alice@acmecorp.com)
2. Go to /settings/corporate
3. Click "Send Invitation"
4. Enter email: david@acmecorp.com
5. Select role: Member
6. Click "Send Invitation"
```

**Expected Results**:
- ✅ Success message: "Invitation sent to david@acmecorp.com!"
- ✅ Invitation appears in list with "Pending" status
- ✅ "Copy Link" button available
- ✅ Email sent to david@acmecorp.com

**Database Verification**:
```sql
SELECT 
  email,
  role,
  status,
  token,
  expires_at
FROM corporate_invitations
WHERE email = 'david@acmecorp.com'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- email: 'david@acmecorp.com'
-- role: 'member'
-- status: 'pending'
-- token: <64-char random string>
-- expires_at: <7 days from now>
```

---

### **Test Case 4.2: Accept Invitation**

**Objective**: Verify user can accept invitation

**Steps**:
```
1. Copy invitation link from corporate settings
2. Open link in incognito window
3. Observe invitation acceptance page
4. Fill in signup form:
   - First Name: David
   - Last Name: Johnson
   - Password: SecurePass123
   - Confirm Password: SecurePass123
5. Click "Accept Invitation & Create Account"
```

**Expected Results**:
- ✅ Account created with pre-assigned role
- ✅ account_status: 'active' (immediate access)
- ✅ Email verification sent
- ✅ Redirected to /verify-email
- ✅ Invitation status changed to 'accepted'

**Database Verification**:
```sql
-- Check user
SELECT 
  email,
  corporate_role,
  account_status
FROM user_profiles
WHERE email = 'david@acmecorp.com';

-- Expected:
-- corporate_role: 'member'
-- account_status: 'active'

-- Check invitation
SELECT status, accepted_at 
FROM corporate_invitations
WHERE email = 'david@acmecorp.com';

-- Expected:
-- status: 'accepted'
-- accepted_at: <timestamp>
```

---

### **Test Case 4.3: Expired Invitation**

**Objective**: Verify expired invitations cannot be accepted

**Steps**:
```
1. Manually expire invitation in database:
   UPDATE corporate_invitations 
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE email = 'test@acmecorp.com';
2. Try to access invitation link
```

**Expected Results**:
- ✅ Shows "Invitation Expired" page
- ❌ Cannot accept invitation
- ✅ Message: "This invitation has expired. Please contact your administrator."

---

## 👥 User Management Testing

### **Test Case 5.1: View Users List**

**Objective**: Verify admin can view all users

**Steps**:
```
1. Log in as owner (alice@acmecorp.com)
2. Go to /settings/users
3. Observe users list
```

**Expected Results**:
- ✅ Table shows all enterprise users
- ✅ Columns: User, Email, Role, Status, Joined, Actions
- ✅ Each user has avatar with initials
- ✅ Role badges color-coded
- ✅ Status badges show active/suspended

---

### **Test Case 5.2: Search Users**

**Objective**: Verify search functionality

**Steps**:
```
1. Go to /settings/users
2. Type "bob" in search box
3. Observe filtered results
```

**Expected Results**:
- ✅ List filters to show only users with "bob" in name/email
- ✅ Results counter updates: "Showing 1 of 4 users"
- ✅ Clear search shows all users again

---

### **Test Case 5.3: Filter by Role**

**Objective**: Verify role filter

**Steps**:
```
1. Go to /settings/users
2. Select "Admin" from role filter
3. Observe results
```

**Expected Results**:
- ✅ Only admins shown
- ✅ Results counter updates
- ✅ Select "All Roles" shows everyone

---

### **Test Case 5.4: Promote Member to Admin (Owner Only)**

**Objective**: Verify owner can promote members

**Steps**:
```
1. Log in as owner
2. Go to /settings/users
3. Find bob@acmecorp.com (member)
4. Click ⋮ (three dots)
5. Click "Promote to Admin"
```

**Expected Results**:
- ✅ Success message: "User role updated to admin"
- ✅ Role badge changes to "Admin"
- ✅ Audit log created

**Database Verification**:
```sql
SELECT corporate_role FROM user_profiles 
WHERE email = 'bob@acmecorp.com';

-- Expected: 'admin'

SELECT action, details FROM corporate_audit_logs 
WHERE action = 'role_changed'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- details: {"old_role": "member", "new_role": "admin"}
```

---

### **Test Case 5.5: Suspend User**

**Objective**: Verify admin can suspend users

**Steps**:
```
1. Log in as admin
2. Go to /settings/users
3. Find charlie@acmecorp.com (member)
4. Click ⋮ → "Suspend User"
5. Confirmation dialog appears
6. Click "Confirm"
```

**Expected Results**:
- ✅ Confirmation dialog shows warning
- ✅ Success message: "User suspended successfully"
- ✅ Status badge changes to "Suspended"
- ✅ User cannot log in

**Database Verification**:
```sql
SELECT 
  account_status,
  suspended_at,
  suspended_by
FROM user_profiles
WHERE email = 'charlie@acmecorp.com';

-- Expected:
-- account_status: 'suspended'
-- suspended_at: <timestamp>
-- suspended_by: <admin user id>
```

---

### **Test Case 5.6: Suspended User Login Attempt**

**Objective**: Verify suspended users cannot log in

**Steps**:
```
1. Try to log in as charlie@acmecorp.com
2. Enter correct password
3. Click "Login"
```

**Expected Results**:
- ❌ Login blocked
- ✅ Error: "Your enterprise account access is pending admin approval"
- ❌ Not redirected to dashboard

---

### **Test Case 5.7: Reactivate User**

**Objective**: Verify admin can reactivate suspended users

**Steps**:
```
1. Log in as admin
2. Go to /settings/users
3. Find charlie@acmecorp.com (suspended)
4. Click ⋮ → "Reactivate User"
```

**Expected Results**:
- ✅ Success message: "User reactivated successfully"
- ✅ Status badge changes to "Active"
- ✅ User can now log in

---

### **Test Case 5.8: Remove User**

**Objective**: Verify admin can remove users

**Steps**:
```
1. Log in as admin
2. Go to /settings/users
3. Find test user
4. Click ⋮ → "Remove User"
5. Red confirmation dialog appears
6. Click "Confirm"
```

**Expected Results**:
- ✅ Red confirmation dialog with warning
- ✅ Success message: "User removed successfully"
- ✅ User disappears from list
- ✅ User deleted from database
- ✅ Audit log created

**Database Verification**:
```sql
SELECT * FROM user_profiles WHERE email = 'test@acmecorp.com';

-- Expected: no rows (user deleted)

SELECT action FROM corporate_audit_logs 
WHERE action = 'user_removed'
ORDER BY created_at DESC LIMIT 1;

-- Expected: 'user_removed'
```

---

## 🔒 Security & Permission Testing

### **Test Case 6.1: Admin Cannot Modify Owner**

**Objective**: Verify admins cannot modify owner

**Steps**:
```
1. Log in as admin (bob@acmecorp.com)
2. Go to /settings/users
3. Find owner (alice@acmecorp.com)
4. Observe actions column
```

**Expected Results**:
- ❌ No ⋮ button shown for owner
- ❌ Cannot suspend owner
- ❌ Cannot remove owner
- ❌ Cannot change owner's role

---

### **Test Case 6.2: Admin Cannot Modify Other Admins**

**Objective**: Verify admins cannot modify other admins

**Steps**:
```
1. Log in as admin
2. Go to /settings/users
3. Find another admin
4. Click ⋮
```

**Expected Results**:
- ❌ Dropdown disabled or shows no actions
- ❌ Cannot suspend other admin
- ❌ Cannot remove other admin

---

### **Test Case 6.3: Cannot Modify Self**

**Objective**: Verify users cannot modify themselves

**Steps**:
```
1. Log in as any user
2. Go to /settings/users
3. Find your own account
```

**Expected Results**:
- ❌ No ⋮ button for own account
- ❌ Cannot change own role
- ❌ Cannot suspend self

---

### **Test Case 6.4: Only Owner Can Promote to Admin**

**Objective**: Verify only owner can create admins

**Steps**:
```
1. Log in as admin (not owner)
2. Go to /settings/users
3. Find a member
4. Click ⋮
```

**Expected Results**:
- ❌ No "Promote to Admin" option
- ✅ Can suspend member
- ✅ Can remove member

---

### **Test Case 6.5: Member Cannot Access Corporate Pages**

**Objective**: Verify members have no admin access

**Steps**:
```
1. Log in as member
2. Check sidebar
3. Try to access /settings/users directly
4. Try to access /settings/corporate directly
```

**Expected Results**:
- ❌ No "User Management" link in sidebar
- ❌ No "Corporate Settings" link in sidebar
- ❌ /settings/users redirects to /settings/documents
- ❌ /settings/corporate redirects to /settings/documents

---

This is Part 1 of the test cases. Continue to next file for more tests...

