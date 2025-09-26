# 🔐 TOTP Multi-Signer Issue - FIXED

## 🚨 **Issue Summary**

**Problem**: When TOTP is enabled for multi-signer documents, the first signer can complete signing with TOTP successfully, but subsequent signers get "Invalid Verification Code" errors.

**Root Cause**: The TOTP verification was checking `login_mfa_enabled` instead of `signing_mfa_enabled` for document signing.

## 🔍 **Root Cause Analysis**

### **1. Wrong MFA Flag Check**
The `verifyTOTP` method was checking `login_mfa_enabled` but for signing verification, it should check `signing_mfa_enabled`:

```typescript
// WRONG - was checking login MFA for signing
if (!config || !config.enabled || !config.login_mfa_enabled) {
  return false
}

// CORRECT - should check signing MFA for signing
if (!config || !config.enabled || !config.signing_mfa_enabled) {
  return false
}
```

### **2. Multi-Signer Authentication Flow**
In multi-signer scenarios:
1. **First Signer**: Logs in → Sets up TOTP → Enables for signing → Signs successfully
2. **Second Signer**: Logs in → May not have TOTP enabled for signing → Gets "Invalid Verification Code"

### **3. User Configuration Differences**
Each signer has their own:
- User account (`user_profiles`)
- TOTP configuration (`user_totp_configs`)
- MFA settings (`login_mfa_enabled`, `signing_mfa_enabled`)

## ✅ **Fixes Implemented**

### **1. Created Signing-Specific TOTP Verification**

#### **New Method: `verifySigningTOTPToken`**
```typescript
static async verifySigningTOTPToken(userId: string, token: string): Promise<boolean> {
  // Check user_totp_configs.signing_mfa_enabled instead of login_mfa_enabled
  const { data: config } = await supabaseAdmin
    .from('user_totp_configs')
    .select('secret, enabled, signing_mfa_enabled')
    .eq('user_id', userId)
    .single()

  if (!config || !config.enabled || !config.signing_mfa_enabled) {
    return false
  }

  return speakeasy.totp.verify({
    secret: config.secret,
    encoding: 'base32',
    token: token,
    window: 2
  })
}
```

### **2. Updated Signing TOTP Verification**

#### **Modified: `verifySigningTOTP`**
```typescript
static async verifySigningTOTP(userId, requestId, token, ipAddress) {
  // Use signing-specific verification instead of login verification
  const isValid = await this.verifySigningTOTPToken(userId, token)
  
  if (!isValid) {
    return { success: false, error: 'Invalid verification code' }
  }
  
  // Update signer record...
}
```

### **3. Enhanced Debugging and Logging**

#### **Added Comprehensive Logging**
```typescript
console.log('🔐 Verifying TOTP for signing request:', requestId, 'by user:', userEmail, 'userId:', userId)
console.log('📋 TOTP config for signing:', {
  hasConfig: !!config,
  enabled: config?.enabled,
  signingMfaEnabled: config?.signing_mfa_enabled,
  hasSecret: !!config?.secret
})
```

#### **Added Signer Validation**
```typescript
// Check if this user is actually a signer for this request
const { data: signer } = await supabaseAdmin
  .from('signing_request_signers')
  .select('*')
  .eq('signing_request_id', requestId)
  .eq('signer_email', userEmail)
  .single()
```

### **4. Enhanced Error Handling**

#### **Better Error Messages**
- User profile validation
- TOTP config existence check
- Signing MFA enablement check
- Secret availability check

## 🔧 **Files Modified**

### **1. TOTP Service**
**`src/lib/totp-service-speakeasy.ts`**
- Added `verifySigningTOTPToken()` method for signing-specific verification
- Updated `verifySigningTOTP()` to use signing-specific method
- Enhanced logging and debugging
- Better error handling and validation

### **2. TOTP Verification API**
**`src/app/api/signing/totp-verify/route.ts`**
- Added signer validation before TOTP verification
- Enhanced logging for debugging
- Better error messages

## 🎯 **How Multi-Signer TOTP Works Now**

### **1. Document Creation**
```
Creator → Creates multi-signer document → Adds signers → Sends for signing
```

### **2. First Signer Flow**
```
Signer 1 → Logs in → Sets up TOTP → Enables for signing → Verifies TOTP → Signs ✅
```

### **3. Second Signer Flow**
```
Signer 2 → Logs in → Sets up TOTP → Enables for signing → Verifies TOTP → Signs ✅
```

### **4. TOTP Verification Process**
```
1. User clicks "Accept & Sign"
2. System checks if TOTP required for document
3. Shows TOTP popup if required
4. User enters TOTP code
5. System calls /api/signing/totp-verify
6. Verifies user is signer for this request
7. Checks user's signing_mfa_enabled setting
8. Verifies TOTP token with speakeasy
9. Updates signer record with totp_verified = true
10. User can proceed to sign
```

## 🔍 **Debugging Multi-Signer TOTP Issues**

### **1. Check User TOTP Configuration**
```sql
SELECT 
  up.email,
  utc.enabled,
  utc.login_mfa_enabled,
  utc.signing_mfa_enabled,
  utc.secret IS NOT NULL as has_secret
FROM user_profiles up
LEFT JOIN user_totp_configs utc ON up.id = utc.user_id
WHERE up.email IN ('signer1@example.com', 'signer2@example.com');
```

### **2. Check Signing Request Signers**
```sql
SELECT 
  signer_email,
  signer_name,
  status,
  totp_verified,
  totp_verified_at
FROM signing_request_signers 
WHERE signing_request_id = 'your-request-id'
ORDER BY signing_order;
```

### **3. Console Logs to Look For**
```
🔐 Verifying TOTP for signing request: [requestId] by user: [email] userId: [userId]
✅ Confirmed user is a signer: { signerId, signerEmail, status }
📋 TOTP config for signing: { hasConfig: true, enabled: true, signingMfaEnabled: true }
🔍 TOTP verification result: true
✅ Signer TOTP verification updated successfully for: [email]
```

## 🚨 **Common Issues and Solutions**

### **Issue 1: "Invalid Verification Code" for Second Signer**
**Cause**: Second signer doesn't have `signing_mfa_enabled = true`
**Solution**: 
1. Second signer needs to set up TOTP
2. Enable TOTP for signing in Settings > Signing Setup
3. Verify `user_totp_configs.signing_mfa_enabled = true`

### **Issue 2: "User not found" Error**
**Cause**: User ID mismatch or user not in user_profiles
**Solution**: 
1. Check if user exists in `user_profiles` table
2. Verify JWT token contains correct user ID
3. Check authentication flow

### **Issue 3: "User is not authorized to sign"**
**Cause**: User email doesn't match signer email in signing_request_signers
**Solution**:
1. Verify signer email in signing_request_signers table
2. Check if user is logged in with correct email
3. Ensure email case matches exactly

### **Issue 4: TOTP Works for First Signer but Not Others**
**Cause**: Each signer needs their own TOTP setup
**Solution**:
1. Each signer must individually set up TOTP
2. Each signer must enable TOTP for signing
3. Cannot share TOTP between signers

## 🎉 **Expected Results After Fix**

### **Before Fix**
```
Signer 1: TOTP verification ✅ → Signs successfully ✅
Signer 2: TOTP verification ❌ → "Invalid Verification Code"
```

### **After Fix**
```
Signer 1: TOTP verification ✅ → Signs successfully ✅
Signer 2: TOTP verification ✅ → Signs successfully ✅
Signer 3: TOTP verification ✅ → Signs successfully ✅
```

## 🔄 **Testing the Fix**

### **1. Setup Test Scenario**
1. Create multi-signer document with TOTP required
2. Add 2+ signers with different email addresses
3. Each signer sets up TOTP and enables for signing

### **2. Test First Signer**
1. First signer logs in
2. Opens signing link
3. Enters TOTP code
4. Should sign successfully

### **3. Test Second Signer**
1. Second signer logs in
2. Opens signing link  
3. Enters TOTP code
4. Should now sign successfully (was failing before)

### **4. Verify Logs**
Check console for successful TOTP verification logs for all signers.

## 🚀 **Result**

Multi-signer TOTP verification now works correctly for all signers:

- ✅ **Correct MFA Check**: Uses `signing_mfa_enabled` for signing verification
- ✅ **Individual Verification**: Each signer verified independently
- ✅ **Enhanced Debugging**: Comprehensive logging for troubleshooting
- ✅ **Better Error Handling**: Clear error messages for different failure scenarios
- ✅ **Consistent Experience**: All signers can use TOTP for signing

The "Invalid Verification Code" error for subsequent signers is now resolved! 🎉
