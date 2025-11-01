# 🔧 Reminder 404 Error - Troubleshooting Guide

## 🚨 **Problem**

When clicking "Send Reminder", getting 404 error:
```
POST /api/signature-requests/f75af3d0-3624-45c8-8783-564635e9b971/remind 404 in 1593ms
Failed to load resource: the server responded with a status of 404 (Not Found)
```

---

## 🔍 **Debugging Steps Implemented**

### **1. Enhanced Logging**
Added detailed logging to the reminder API (`src/app/api/signature-requests/[id]/remind/route.ts`):

- ✅ **Request ID validation**
- ✅ **User ID verification**
- ✅ **Database existence check**
- ✅ **Access permission validation**
- ✅ **Full request data fetching**

### **2. Debug Endpoint Created**
Created debug endpoint: `src/app/api/debug/signature-request/[id]/route.ts`

**Usage**:
```bash
curl -X GET "http://localhost:3000/api/debug/signature-request/f75af3d0-3624-45c8-8783-564635e9b971"
```

**What it checks**:
- ✅ Existence in `signing_requests` table
- ✅ Existence in `signature_requests` table (alternative)
- ✅ Associated signers in `signing_request_signers` table

---

## 🔍 **Possible Causes**

### **1. Request ID Not Found**
- **Cause**: The signature request ID doesn't exist in the database
- **Check**: Use debug endpoint to verify existence
- **Solution**: Ensure signature request was created successfully

### **2. Table Name Mismatch**
- **Current**: Using `signing_requests` table
- **Alternative**: Some services use `signature_requests` table
- **Check**: Debug endpoint checks both tables

### **3. Authentication Issues**
- **Cause**: User doesn't have access to the request
- **Check**: Enhanced logging shows user ID vs request owner
- **Solution**: Ensure user is the one who created the request

### **4. Database Schema Issues**
- **Cause**: Foreign key constraints or missing tables
- **Check**: Debug endpoint shows table access errors
- **Solution**: Run database migrations

---

## 🧪 **Testing Steps**

### **Step 1: Check Request Existence**
```bash
curl -X GET "http://localhost:3000/api/debug/signature-request/YOUR_REQUEST_ID"
```

**Expected Response**:
```json
{
  "requestId": "f75af3d0-3624-45c8-8783-564635e9b971",
  "tables": {
    "signing_requests": {
      "found": true,
      "data": { "id": "...", "title": "...", "status": "..." },
      "error": null
    },
    "signature_requests": {
      "found": false,
      "data": null,
      "error": { "code": "PGRST116", "message": "..." }
    },
    "signers": {
      "count": 2,
      "data": [...],
      "error": null
    }
  }
}
```

### **Step 2: Test Reminder with Enhanced Logging**
1. Open browser console
2. Navigate to Sign Inbox
3. Click "Send Reminder" on a request
4. Check console for detailed logs:

```
📧 Checking reminder restrictions for signature request: f75af3d0-3624-45c8-8783-564635e9b971
📧 User ID: 12345678-1234-1234-1234-123456789012
📧 Request check result: { requestCheck: {...}, checkError: null }
✅ Found signature request: { id: "...", title: "...", status: "...", signersCount: 2 }
```

---

## 🔧 **Fixes Applied**

### **1. Enhanced Error Handling**
```typescript
// Before: Generic 404 error
if (fetchError || !signatureRequest) {
  return new Response(
    JSON.stringify({ error: 'Signature request not found or access denied' }),
    { status: 404 }
  )
}

// After: Detailed error checking
const { data: requestCheck, error: checkError } = await supabaseAdmin
  .from('signing_requests')
  .select('id, initiated_by, title, status')
  .eq('id', requestId)
  .single()

if (checkError || !requestCheck) {
  console.log('❌ Request not found in database:', { requestId, error: checkError })
  return new Response(
    JSON.stringify({ error: 'Signature request not found' }),
    { status: 404 }
  )
}
```

### **2. Access Control Validation**
```typescript
// Check if user has access to this request
if (requestCheck.initiated_by !== userId) {
  console.log('❌ Access denied - user does not own this request')
  return new Response(
    JSON.stringify({ error: 'Access denied - you can only send reminders for your own requests' }),
    { status: 403 }
  )
}
```

### **3. Comprehensive Logging**
```typescript
console.log('✅ Found signature request:', {
  id: signatureRequest.id,
  title: signatureRequest.title,
  status: signatureRequest.status,
  signersCount: signatureRequest.signers?.length || 0
})
```

---

## 🎯 **Next Steps**

### **Immediate Actions**:
1. **Test debug endpoint** with the failing request ID
2. **Check browser console** for enhanced logging
3. **Verify request ownership** (user who created vs current user)
4. **Check database tables** for data consistency

### **If Request Not Found**:
1. **Check signature request creation** - ensure requests are being saved
2. **Verify table structure** - ensure `signing_requests` table exists
3. **Check database migrations** - run any pending migrations
4. **Test with new request** - create a fresh signature request and test

### **If Access Denied**:
1. **Check user authentication** - ensure user is logged in correctly
2. **Verify request ownership** - ensure user created the request
3. **Check user ID consistency** - verify user ID format and matching

---

## 📋 **Common Solutions**

### **Solution 1: Database Migration**
If tables don't exist:
```sql
-- Run database migrations
-- Check if signing_requests table exists
SELECT * FROM information_schema.tables WHERE table_name = 'signing_requests';
```

### **Solution 2: Request ID Format**
If request ID format is wrong:
```typescript
// Ensure UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(requestId)) {
  return new Response(
    JSON.stringify({ error: 'Invalid request ID format' }),
    { status: 400 }
  )
}
```

### **Solution 3: Authentication Fix**
If authentication is failing:
```typescript
// Check token validity
const payload = await verifyAccessToken(accessToken)
console.log('Token payload:', payload)
```

---

## 🚀 **Expected Resolution**

After implementing these debugging steps, you should see:

1. **Clear error messages** indicating the exact issue
2. **Detailed logging** showing where the process fails
3. **Specific solutions** based on the identified problem
4. **Working reminder functionality** once the root cause is fixed

**The enhanced debugging will pinpoint exactly what's causing the 404 error!** 🎯
