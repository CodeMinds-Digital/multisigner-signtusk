# Approval Mode - Complete Implementation

## ✅ Overview

The **Approval Mode** feature is now complete! Admins can now review and approve/decline access requests from users who want to join the corporate account.

---

## 🎯 What is Approval Mode?

**Approval Mode** is one of three access control modes for corporate accounts:

- **🟢 Open Mode**: Users auto-join as members
- **🔵 Approval Mode**: Users request access, admin approves/declines ← **This feature**
- **🟣 Invite-Only Mode**: Only invited users can join

---

## 🔄 Complete Approval Mode Flow

### **Step 1: User Requests Access**

```
1. User goes to /signup
2. Selects "Corporate Account"
3. Enters email: user@acmecorp.com
4. Corporate account exists with Approval Mode enabled
5. User fills in details and clicks "Sign Up"
    ↓
6. User created with account_status: 'suspended'
7. Access request created in corporate_access_requests table
8. User redirected to "Pending Approval" page
9. User CANNOT log in yet
```

**Database State:**
```sql
-- User profile
account_status: 'suspended'
corporate_role: 'member'
corporate_account_id: <corporate account id>

-- Access request
status: 'pending'
user_id: <user id>
corporate_account_id: <corporate account id>
```

---

### **Step 2: Admin Reviews Request**

```
1. Admin logs in
2. Goes to /settings/users
3. Sees "Pending Access Requests" section at top
4. Yellow badge shows number of pending requests
5. Each request shows:
   - User avatar with initials
   - Full name
   - Email address
   - Request date/time
   - "Approve" button (green)
   - "Decline" button (red)
```

---

### **Step 3: Admin Approves Request**

```
1. Admin clicks "Approve" button
2. Dialog appears:
   - "Approve Access Request"
   - User name shown
   - Optional message field
   - "Cancel" and "Confirm" buttons
3. Admin optionally enters welcome message
4. Admin clicks "Confirm"
    ↓
5. API updates user status to 'active'
6. Access request status changed to 'approved'
7. Audit log created
8. Success message: "User has been approved and can now log in"
9. Request disappears from pending list
10. User can now log in!
```

**Database Changes:**
```sql
-- User profile updated
UPDATE user_profiles
SET account_status = 'active',
    suspended_at = NULL,
    suspended_by = NULL
WHERE id = <user id>;

-- Access request updated
UPDATE corporate_access_requests
SET status = 'approved',
    reviewed_by = <admin id>,
    reviewed_at = NOW()
WHERE id = <request id>;

-- Audit log created
INSERT INTO corporate_audit_logs (
  action: 'access_request_approved',
  admin_id: <admin id>,
  target_user_id: <user id>,
  details: { user_email, message }
)
```

---

### **Step 4: Admin Declines Request**

```
1. Admin clicks "Decline" button
2. Dialog appears:
   - "Decline Access Request"
   - User name shown
   - Optional message field
   - "Cancel" and "Confirm" buttons
3. Admin optionally enters decline reason
4. Admin clicks "Confirm"
    ↓
5. Access request status changed to 'declined'
6. Audit log created
7. Success message: "Access request declined"
8. Request disappears from pending list
9. User remains suspended (cannot log in)
```

**Database Changes:**
```sql
-- Access request updated
UPDATE corporate_access_requests
SET status = 'declined',
    reviewed_by = <admin id>,
    reviewed_at = NOW()
WHERE id = <request id>;

-- Audit log created
INSERT INTO corporate_audit_logs (
  action: 'access_request_declined',
  admin_id: <admin id>,
  target_user_id: <user id>,
  details: { user_email, message }
)
```

---

## 📁 Files Created

### **1. API Endpoint**
**`src/app/api/corporate/access-requests/route.ts`** (320 lines)

**GET Endpoint:**
- Fetches all pending access requests
- Joins with user_profiles to get user details
- Only accessible by admins/owners
- Returns array of requests with user info

**POST Endpoint:**
- Handles approve/decline actions
- Validates permissions
- Updates user status (approve) or request status (decline)
- Creates audit logs
- Returns success/error messages

### **2. Approval Queue Component**
**`src/components/features/corporate/approval-queue.tsx`** (300 lines)

**Features:**
- Displays pending requests in beautiful cards
- Shows user avatar, name, email, request date
- Approve/Decline buttons with icons
- Optional message dialog
- Real-time updates after actions
- Empty state when no pending requests
- Success/error messages
- Loading states

### **3. Integration**
**`src/app/(dashboard)/settings/users/page.tsx`** (modified)
- Added ApprovalQueue component import
- Integrated into users page above the users list
- Shows pending requests prominently

---

## 🎨 User Interface

### **Approval Queue Section:**

```
┌─────────────────────────────────────────────────────────────┐
│  ⏰ Pending Access Requests                    [3 pending]  │
│  Users waiting for approval to join your organization       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JD  John Doe                          [Pending]    │   │
│  │      📧 john.doe@acmecorp.com                       │   │
│  │      📅 Requested Jan 15, 2025 10:30 AM             │   │
│  │                                                      │   │
│  │                      [✅ Approve]  [❌ Decline]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JS  Jane Smith                        [Pending]    │   │
│  │      📧 jane.smith@acmecorp.com                     │   │
│  │      📅 Requested Jan 15, 2025 11:00 AM             │   │
│  │                                                      │   │
│  │                      [✅ Approve]  [❌ Decline]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### **Approval Dialog:**

```
┌─────────────────────────────────────┐
│  Approve Access Request             │
├─────────────────────────────────────┤
│  You are about to approve John Doe. │
│  They will be able to log in        │
│  immediately.                       │
│                                     │
│  Message to User (Optional)         │
│  ┌─────────────────────────────┐   │
│  │ Welcome to the team!        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Cancel]  [Confirm]                │
└─────────────────────────────────────┘
```

### **Empty State:**

```
┌─────────────────────────────────────────────────────────────┐
│  ⏰ Pending Access Requests                                 │
│  Users waiting for approval to join your organization       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      ⏰                                      │
│                                                             │
│          No pending access requests                         │
│                                                             │
│     When users request access in Approval Mode,             │
│              they'll appear here                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Instructions

### **Test 1: Enable Approval Mode**

```bash
1. Log in as corporate owner
2. Go to /settings/corporate
3. Click "Approval Mode" card
4. Confirm change
5. ✅ Access mode changed to 'approval'
```

### **Test 2: User Requests Access**

```bash
1. Log out
2. Go to /signup
3. Select "Corporate Account"
4. Enter email from corporate domain
5. Fill in details
6. Click "Sign Up"
7. ✅ Redirected to "Pending Approval" page
8. ✅ Message: "Your access request is pending admin approval"
9. Try to log in
10. ✅ Login blocked with error message
```

**Database Verification:**
```sql
-- Check user status
SELECT account_status FROM user_profiles 
WHERE email = 'newuser@acmecorp.com';
-- Expected: 'suspended'

-- Check access request
SELECT status FROM corporate_access_requests 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'newuser@acmecorp.com');
-- Expected: 'pending'
```

### **Test 3: Admin Views Pending Requests**

```bash
1. Log in as admin
2. Go to /settings/users
3. ✅ See "Pending Access Requests" section at top
4. ✅ Yellow badge shows "1 pending"
5. ✅ Request card shows:
   - User avatar with initials
   - Full name
   - Email address
   - Request timestamp
   - Approve button (green)
   - Decline button (red)
```

### **Test 4: Admin Approves Request**

```bash
1. In pending requests section
2. Click "Approve" button
3. ✅ Dialog appears
4. Enter optional message: "Welcome to the team!"
5. Click "Confirm"
6. ✅ Success message: "User has been approved and can now log in"
7. ✅ Request disappears from pending list
8. Log out
9. Log in as approved user
10. ✅ Login successful!
11. ✅ Redirected to dashboard
```

**Database Verification:**
```sql
-- Check user status
SELECT account_status FROM user_profiles 
WHERE email = 'newuser@acmecorp.com';
-- Expected: 'active'

-- Check access request
SELECT status, reviewed_by, reviewed_at 
FROM corporate_access_requests 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'newuser@acmecorp.com');
-- Expected: status='approved', reviewed_by=<admin id>, reviewed_at=<timestamp>

-- Check audit log
SELECT action, details FROM corporate_audit_logs 
WHERE action = 'access_request_approved'
ORDER BY created_at DESC LIMIT 1;
-- Expected: action='access_request_approved', details contains user_email and message
```

### **Test 5: Admin Declines Request**

```bash
1. Create another access request (repeat Test 2)
2. Log in as admin
3. Go to /settings/users
4. Click "Decline" button on request
5. ✅ Dialog appears
6. Enter optional message: "Please contact HR"
7. Click "Confirm"
8. ✅ Success message: "Access request declined"
9. ✅ Request disappears from pending list
10. Try to log in as declined user
11. ✅ Login still blocked
```

**Database Verification:**
```sql
-- Check access request
SELECT status FROM corporate_access_requests 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'declineduser@acmecorp.com');
-- Expected: 'declined'

-- Check audit log
SELECT action FROM corporate_audit_logs 
WHERE action = 'access_request_declined'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 'access_request_declined'
```

---

## 🔐 Security Features

✅ **Permission Checks**: Only admins/owners can view and process requests
✅ **Request Validation**: Ensures request belongs to admin's corporate account
✅ **Status Validation**: Prevents processing already-reviewed requests
✅ **Audit Logging**: All approve/decline actions are logged
✅ **User Isolation**: Users can only see their own pending status

---

## 📊 Database Schema

### **corporate_access_requests Table:**

```sql
CREATE TABLE corporate_access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, approved, declined
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Success Criteria

- [x] Users can request access in Approval Mode
- [x] Requests are created with 'pending' status
- [x] Users cannot log in until approved
- [x] Admins see pending requests in UI
- [x] Admins can approve requests
- [x] Admins can decline requests
- [x] Optional message field works
- [x] Approved users can log in immediately
- [x] Declined users remain blocked
- [x] Audit logs track all actions
- [x] Real-time UI updates
- [x] Empty state shown when no requests
- [x] Success/error messages displayed

---

## 🎉 Summary

The **Approval Mode** feature is now **100% complete**!

**What works:**
- ✅ Users request access when signing up
- ✅ Admins see pending requests in beautiful UI
- ✅ Admins can approve with optional welcome message
- ✅ Admins can decline with optional reason
- ✅ Approved users can log in immediately
- ✅ Declined users remain blocked
- ✅ All actions are audited
- ✅ Real-time updates and feedback

**All 39 tasks are now complete!** 🚀

