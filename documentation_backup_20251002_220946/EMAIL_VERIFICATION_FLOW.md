# Email Verification Flow - Complete Implementation

## ✅ Overview

Both **Personal** and **Corporate** users now require email verification before accessing the dashboard. This ensures security and validates user email addresses.

---

## 🔄 Complete User Journey

### **Personal Account Flow**

```
1. User signs up → Personal account
2. Supabase sends verification email
3. User clicks verification link
4. Email verified ✅
5. Redirected to /dashboard
6. User can log in anytime
```

### **Corporate Account Flow - First User (Owner)**

```
1. User signs up → Corporate account (first from domain)
2. Corporate account created
3. User set as Owner
4. Verification email sent
5. User clicks verification link
6. Email verified ✅
7. Redirected to /dashboard
8. Owner has full admin access
```

### **Corporate Account Flow - Open Mode**

```
1. User signs up → Corporate account (existing domain)
2. Domain check: Access mode = "Open"
3. User auto-added as Member
4. Verification email sent
5. User clicks verification link
6. Email verified ✅
7. Redirected to /dashboard
8. Member can access immediately
```

### **Corporate Account Flow - Approval Mode**

```
1. User signs up → Corporate account (existing domain)
2. Domain check: Access mode = "Approval"
3. User created with status = "suspended"
4. Access request created
5. Verification email sent
6. User clicks verification link
7. Email verified ✅
8. Redirected to /verify-email?status=pending_approval&verified=true
9. Shows "Waiting for admin approval" message
10. Admin approves → User can log in
11. Admin declines → User cannot log in
```

### **Corporate Account Flow - Invite-Only Mode**

```
1. User tries to sign up → Corporate account (existing domain)
2. Domain check: Access mode = "Invite-Only"
3. Signup blocked ❌
4. Message: "Contact your administrator for an invitation"
5. Admin sends invitation (Phase 4)
6. User receives invitation email
7. User clicks invitation link
8. Completes signup with token
9. Verification email sent
10. User clicks verification link
11. Email verified ✅
12. Redirected to /dashboard
```

---

## 🔐 Security Checks

### **During Signup**
- ✅ Email format validation
- ✅ Corporate email domain validation (blocks gmail, yahoo, etc.)
- ✅ Password strength requirements
- ✅ Domain check for existing corporate accounts
- ✅ Access mode enforcement

### **During Email Verification**
- ✅ Token validation
- ✅ Update `email_verified` to `true` in user_profiles
- ✅ Check account status (active vs suspended)
- ✅ Redirect based on approval status

### **During Login**
- ✅ **Email verification check** - Blocks unverified users
- ✅ **Account status check** - Blocks suspended users (waiting for approval)
- ✅ **TOTP check** - If enabled for user/organization
- ✅ Session creation only after all checks pass

---

## 📁 Files Modified/Created

### **New Files:**
1. **`src/app/auth/callback/route.ts`** - Email verification callback handler
   - Verifies email token
   - Updates `email_verified` status
   - Checks account status
   - Redirects to dashboard or approval page

### **Modified Files:**
1. **`src/app/api/corporate/signup/route.ts`**
   - Changed `email_confirm: false` (requires verification)
   - Sends verification email via Supabase
   - Sets `email_verified: false` in all user profiles

2. **`src/app/api/auth/login/route.ts`**
   - Added email verification check
   - Added account status check (suspended users blocked)
   - Updates `email_verified: true` on successful login

3. **`src/components/features/auth/verify-email.tsx`**
   - Added support for `?status=pending_approval`
   - Shows different UI for approval mode
   - Displays "Email Verified + Waiting for Approval" state

---

## 🎨 UI States

### **1. Standard Verification Page**
```
┌─────────────────────────────────┐
│     📧 Check your email         │
│                                 │
│  We've sent a verification link │
│  to your email address.         │
│                                 │
│  [Resend verification email]    │
│  Already verified? Sign in here │
└─────────────────────────────────┘
```

### **2. Pending Approval (Not Verified)**
```
┌─────────────────────────────────┐
│     ⏳ Pending Approval          │
│                                 │
│  Your corporate account access  │
│  requires admin approval.       │
│  Please verify your email first.│
│                                 │
│  What happens next?             │
│  • Admin will review request    │
│  • You'll receive notification  │
│  • Once approved, you can login │
│                                 │
│  [Back to Login]                │
└─────────────────────────────────┘
```

### **3. Pending Approval (Verified)**
```
┌─────────────────────────────────┐
│     ⏳ Email Verified!           │
│                                 │
│  ✅ Your email has been verified!│
│                                 │
│  Your corporate account access  │
│  is pending admin approval.     │
│  You'll receive an email when   │
│  your access is approved.       │
│                                 │
│  What happens next?             │
│  • Admin will review request    │
│  • You'll receive notification  │
│  • Once approved, you can login │
│                                 │
│  [Back to Login]                │
└─────────────────────────────────┘
```

---

## 🧪 Testing Scenarios

### **Test 1: Personal Account Email Verification**
```bash
1. Sign up with personal email
2. Check email inbox
3. Click verification link
4. Should redirect to /dashboard
5. Try logging in → Should work ✅
```

### **Test 2: Corporate Account - First User**
```bash
1. Sign up with corporate email (new domain)
2. Check email inbox
3. Click verification link
4. Should redirect to /dashboard
5. User should be Owner ✅
```

### **Test 3: Corporate Account - Open Mode**
```bash
1. Set access_mode = 'open' in database
2. Sign up with same domain
3. Check email inbox
4. Click verification link
5. Should redirect to /dashboard
6. User should be Member ✅
```

### **Test 4: Corporate Account - Approval Mode**
```bash
1. Set access_mode = 'approval' in database
2. Sign up with same domain
3. Check email inbox
4. Click verification link
5. Should redirect to /verify-email?status=pending_approval&verified=true
6. Should show "Email Verified + Waiting for Approval" ✅
7. Try logging in → Should be blocked with "Pending approval" message ❌
```

### **Test 5: Login Without Email Verification**
```bash
1. Sign up (don't verify email)
2. Try to log in
3. Should be blocked with error:
   "Please verify your email before logging in" ❌
```

### **Test 6: Login With Suspended Account**
```bash
1. Sign up in approval mode
2. Verify email
3. Try to log in (before admin approval)
4. Should be blocked with error:
   "Your corporate account access is pending admin approval" ❌
```

---

## 🔍 Database Verification

### Check Email Verification Status
```sql
SELECT 
  id,
  email,
  email_verified,
  account_type,
  corporate_role,
  account_status,
  created_at
FROM user_profiles
WHERE email = 'user@example.com';
```

### Check Supabase Auth Email Confirmation
```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### Check Pending Access Requests
```sql
SELECT 
  car.id,
  up.email,
  ca.company_name,
  car.status,
  car.created_at
FROM corporate_access_requests car
JOIN user_profiles up ON car.user_id = up.id
JOIN corporate_accounts ca ON car.corporate_account_id = ca.id
WHERE car.status = 'pending';
```

---

## 🚨 Error Messages

| Scenario | Error Message | HTTP Status |
|----------|---------------|-------------|
| Email not verified | "Please verify your email before logging in. Check your inbox for the verification link." | 403 |
| Account suspended (approval mode) | "Your corporate account access is pending admin approval. Please wait for an administrator to approve your request." | 403 |
| Invalid verification token | "Email verification failed" | Redirect to error page |
| Invite-only signup attempt | "This corporate account is invite-only. Please contact your administrator for an invitation." | 403 |

---

## 🔄 Resend Verification Email

### **Option 1: From Verify Email Page**
- User goes to `/verify-email` page
- Clicks "Resend verification email" button
- New verification email sent

### **Option 2: From Login Page (Popup)**
- User tries to log in with unverified email
- Login blocked with error
- **Popup appears automatically** with:
  - Email address shown
  - "Resend Verification Email" button
  - Helpful tips (check spam, wait a few minutes)
  - Support contact info
- User clicks "Resend" → New email sent
- Success message shown in popup

### **API Endpoint:**
```
POST /api/auth/resend-verification
Body: { "email": "user@example.com" }
```

**Features:**
- ✅ Validates email format
- ✅ Checks if user exists (doesn't reveal if not)
- ✅ Checks if already verified
- ✅ Generates new verification link
- ✅ Sends email via Supabase
- ✅ Security: Doesn't reveal user existence

---

## ✅ Success Criteria

- [x] Both personal and corporate users require email verification
- [x] Email verification updates `email_verified` field
- [x] Login blocks unverified users
- [x] Login blocks suspended users (approval mode)
- [x] Verified users redirect to dashboard
- [x] Approval mode users see pending approval message
- [x] Invite-only mode blocks signup
- [x] **Resend verification popup on login failure**
- [x] **Resend verification from verify-email page**
- [x] All flows tested and working

---

## 🎯 Next Steps

After email verification is complete:
1. **Phase 3:** Implement access control modes UI (settings toggle)
2. **Phase 4:** Build invitation system
3. **Phase 5:** Create user management interface
4. **Phase 6:** Add role-based permissions and audit logs

---

## 📝 Notes

- **Supabase handles email sending** - No external email service needed
- **Email templates** can be customized in Supabase Dashboard > Authentication > Email Templates
- **Verification links** expire after 24 hours by default
- **Users can resend** verification emails from the verify-email page
- **Admin approval** (Phase 5) will send notification emails to users

---

**Status:** ✅ Email verification fully implemented for both Personal and Corporate accounts!

