# Enterprise Signup Fields Analysis & Fix

## Problem Identified

The enterprise signup form displays optional fields (industry_field, employee_count, job_title, department, phone_number) but **does NOT send them to the API**.

## Current State

### **Signup Form UI** (`src/components/features/auth/signup-form.tsx`)

**Fields Displayed:**

| Field | Type | Required | Sent to API? |
|-------|------|----------|--------------|
| First Name | text | ✅ Yes | ✅ Yes |
| Last Name | text | ✅ Yes | ✅ Yes |
| Company Name | text | ✅ Yes | ✅ Yes |
| Enterprise Email | email | ✅ Yes | ✅ Yes |
| Industry Field | dropdown | ❌ No | ❌ **NO** |
| Employee Count | dropdown | ❌ No | ❌ **NO** |
| Job Title | text | ❌ No | ❌ **NO** |
| Department | text | ❌ No | ❌ **NO** |
| Phone Number | tel | ❌ No | ❌ **NO** |
| Password | password | ✅ Yes | ✅ Yes |
| Confirm Password | password | ✅ Yes | ✅ Yes (validation only) |

### **API Payload** (Line 218-225)

```typescript
body: JSON.stringify({
    email: formData.email,
    password: formData.password,
    fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    firstName: formData.firstName,
    lastName: formData.lastName,
    companyName: formData.companyName
    // ❌ Missing: industryField, employeeCount, jobTitle, department, phoneNumber
})
```

### **API Handler** (`src/app/api/corporate/signup/route.ts`)

**Accepts:**
- email
- password
- fullName
- firstName
- lastName
- companyName

**Does NOT accept:**
- industry_field
- employee_count
- job_title
- department
- phone_number

## Root Cause

The signup form collects these optional fields from the user but:
1. ❌ Does NOT include them in the API request payload
2. ❌ The API does NOT accept or process these fields
3. ❌ The fields are NOT saved to the database during signup

## Impact

Users who fill in these optional fields during signup will have their data **ignored and lost**. The fields will remain NULL in the database even if the user provided values.

## Solution Required

### Option 1: Make Fields Required (Recommended)

If these fields are important for enterprise accounts:

1. **Update Signup Form:**
   - Add `required` attribute to all fields
   - Add validation for these fields
   - Update labels to include `*` marker

2. **Update API Payload:**
   - Include all fields in the request body
   - Send to `/api/corporate/signup`

3. **Update API Handler:**
   - Accept the new fields
   - Validate the fields
   - Save to database during user profile creation

### Option 2: Keep Fields Optional (Current Design)

If these fields should remain optional:

1. **Update API Payload:**
   - Include fields in request (even if empty)
   - Send to `/api/corporate/signup`

2. **Update API Handler:**
   - Accept the optional fields
   - Save to database if provided
   - Allow NULL values if not provided

## Recommended Fix

Based on the form design showing these fields, I recommend **Option 2** (keep optional but save if provided).

### Changes Needed:

#### 1. Update Signup Form (Line 218-225)

**Before:**
```typescript
body: JSON.stringify({
    email: formData.email,
    password: formData.password,
    fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    firstName: formData.firstName,
    lastName: formData.lastName,
    companyName: formData.companyName
})
```

**After:**
```typescript
body: JSON.stringify({
    email: formData.email,
    password: formData.password,
    fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    firstName: formData.firstName,
    lastName: formData.lastName,
    companyName: formData.companyName,
    industryField: formData.industryField || null,
    employeeCount: formData.employeeCount || null,
    jobTitle: formData.jobTitle || null,
    department: formData.department || null,
    phoneNumber: formData.phoneNumber || null
})
```

#### 2. Update API Handler (Line 22)

**Before:**
```typescript
const { email, password, fullName, companyName, firstName, lastName } = body
```

**After:**
```typescript
const { 
    email, 
    password, 
    fullName, 
    companyName, 
    firstName, 
    lastName,
    industryField,
    employeeCount,
    jobTitle,
    department,
    phoneNumber
} = body
```

#### 3. Update User Profile Creation (Multiple locations)

Add the optional fields when creating user profiles in all three access modes:

**For Open Mode (Line 173-191):**
```typescript
.insert({
    id: userId,
    email,
    full_name: fullName || `${firstName} ${lastName}`.trim(),
    first_name: firstName,
    last_name: lastName,
    account_type: 'enterprise',
    corporate_account_id: existingAccount.id,
    corporate_role: 'member',
    account_status: 'active',
    email_verified: false,
    onboarding_completed: false,
    plan: 'free',
    subscription_status: 'active',
    // Add these fields:
    industry_field: industryField,
    employee_count: employeeCount,
    job_title: jobTitle,
    department: department,
    phone_number: phoneNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
})
```

**Repeat for:**
- Approval Mode (Line 223-240)
- First User/Owner (Line 118-145)

## Verification

After implementing the fix:

1. **Test Signup:**
   - Fill in all optional fields
   - Submit the form
   - Check database to verify fields are saved

2. **Test with Empty Fields:**
   - Leave optional fields empty
   - Submit the form
   - Verify NULL values are saved (no errors)

3. **Check Database:**
```sql
SELECT 
    email,
    first_name,
    last_name,
    company_name,
    industry_field,
    employee_count,
    job_title,
    department,
    phone_number
FROM user_profiles
WHERE email = 'test@company.com';
```

## Current Status for cmd@codeminds.digital

The user `cmd@codeminds.digital` has these fields as NULL because:
1. They signed up before (or the fields weren't sent)
2. The API didn't accept/save these fields

**Solution:** User can update these fields via:
- Settings UI
- API endpoint `/api/user/profile` (PUT)
- Direct SQL update

## Files to Modify

1. **`src/components/features/auth/signup-form.tsx`** (Line 218-225)
   - Add optional fields to API payload

2. **`src/app/api/corporate/signup/route.ts`** (Multiple locations)
   - Accept optional fields in request body
   - Save optional fields to database in all 3 access modes

## Priority

**Medium-High** - Users are filling in these fields but the data is being lost. This creates a poor user experience and requires users to re-enter data later.

