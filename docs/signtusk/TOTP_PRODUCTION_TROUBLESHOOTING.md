# 🔐 TOTP Production Issue Troubleshooting

## 🚨 **Issue Summary**

**Error**: `/api/auth/totp/setup:1 Failed to load resource: the server responded with a status of 500 ()`

**Environment**: Production

## 🔍 **Root Cause Analysis**

The 500 error in production for TOTP setup can be caused by several factors:

### **1. Missing Environment Variables**
- `JWT_SECRET` - Required for token verification
- `SUPABASE_SERVICE_ROLE_KEY` - Required for database access
- `NEXT_PUBLIC_SUPABASE_URL` - Required for Supabase connection
- `TOTP_ISSUER` - Optional, defaults to 'SignTusk'

### **2. Missing Dependencies**
- `speakeasy` - TOTP generation library
- `qrcode` - QR code generation library
- Missing type definitions in production build

### **3. Database Issues**
- `user_totp_configs` table not accessible
- Row Level Security (RLS) blocking service role access
- Database connection timeout

### **4. Authentication Issues**
- Invalid or expired JWT tokens
- Token verification failing in production
- Cookie security settings blocking token access

## ✅ **Fixes Implemented**

### **1. Enhanced Error Handling**

#### **`src/app/api/auth/totp/setup/route.ts`**
```typescript
// Added comprehensive error checking
- Environment variable validation
- Detailed error logging with context
- Specific error messages for different failure types
- Development vs production error details
- Better token validation
```

#### **`src/lib/totp-service-speakeasy.ts`**
```typescript
// Added robust validation and error handling
- Input validation for userId and userEmail
- Library availability checks for speakeasy and qrcode
- Enhanced QR code generation with error handling
- Supabase connection validation
- Detailed error context and stack traces
```

### **2. Debug Endpoint**

#### **`src/app/api/auth/totp/debug/route.ts`**
```typescript
// Comprehensive diagnostic endpoint
- Environment variable checks
- Dependency availability verification
- Authentication token validation
- Database connection testing
- Only accessible in development or with debug secret
```

### **3. Production Checklist**

#### **Environment Variables**
```bash
# Required in production
JWT_SECRET=your-production-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url

# Optional
TOTP_ISSUER=SignTusk
DEBUG_SECRET=your-debug-secret-for-production-debugging
```

#### **Dependencies**
```json
// Ensure these are in package.json dependencies (not devDependencies)
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.4",
  "@types/speakeasy": "^2.0.10",
  "@types/qrcode": "^1.5.5"
}
```

## 🔧 **Debugging Steps**

### **Step 1: Check Environment Variables**
```bash
# In production environment, verify:
echo $JWT_SECRET
echo $SUPABASE_SERVICE_ROLE_KEY
echo $NEXT_PUBLIC_SUPABASE_URL
```

### **Step 2: Test Debug Endpoint**
```bash
# Call debug endpoint to check system status
curl -X GET https://your-domain.com/api/auth/totp/debug \
  -H "x-debug-totp: your-debug-secret"
```

### **Step 3: Check Database Access**
```sql
-- Verify table exists and is accessible
SELECT * FROM user_totp_configs LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_totp_configs';
```

### **Step 4: Test Dependencies**
```javascript
// In Node.js console or debug endpoint
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
console.log('Speakeasy:', typeof speakeasy.generateSecret);
console.log('QRCode:', typeof QRCode.toDataURL);
```

### **Step 5: Check Authentication Flow**
```bash
# Test token verification
curl -X POST https://your-domain.com/api/auth/totp/setup \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=your-token"
```

## 🛠️ **Common Production Issues & Solutions**

### **Issue 1: Missing Dependencies**
```bash
# Solution: Ensure dependencies are installed
npm install speakeasy qrcode @types/speakeasy @types/qrcode
npm run build
```

### **Issue 2: Environment Variables Not Set**
```bash
# Solution: Set in production environment
export JWT_SECRET="your-production-secret"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
```

### **Issue 3: Database Access Denied**
```sql
-- Solution: Update RLS policy for service role
CREATE POLICY "Service role can manage TOTP configs" ON user_totp_configs
FOR ALL USING (auth.role() = 'service_role');
```

### **Issue 4: Cookie Security Issues**
```typescript
// Solution: Check cookie settings in auth-config.ts
secure: process.env.NODE_ENV === 'production' && 
        !process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
```

### **Issue 5: Build/Runtime Errors**
```bash
# Solution: Check build logs and runtime logs
npm run build 2>&1 | grep -i error
# Check production logs for runtime errors
```

## 📋 **Production Deployment Checklist**

### **Before Deployment**
- [ ] All environment variables set correctly
- [ ] Dependencies installed in production
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Build completes without errors

### **After Deployment**
- [ ] Test debug endpoint returns success
- [ ] Environment variables accessible
- [ ] Dependencies loaded correctly
- [ ] Database connection working
- [ ] Authentication flow functional

### **Testing TOTP Setup**
- [ ] Login to application
- [ ] Navigate to Settings > Security
- [ ] Click "Setup TOTP"
- [ ] Verify no 500 errors in console
- [ ] QR code displays correctly
- [ ] Backup codes generated

## 🚀 **Quick Fix Commands**

### **1. Restart with Environment Check**
```bash
# Verify environment and restart
env | grep -E "(JWT_SECRET|SUPABASE|TOTP)"
pm2 restart your-app-name
```

### **2. Test TOTP Setup Manually**
```bash
# Test the endpoint directly
curl -X POST https://your-domain.com/api/auth/totp/setup \
  -H "Content-Type: application/json" \
  -b "access_token=your-token" \
  -v
```

### **3. Check Application Logs**
```bash
# Check for specific TOTP errors
tail -f /var/log/your-app.log | grep -i totp
# Or for PM2
pm2 logs your-app-name | grep -i totp
```

## 🎯 **Expected Results After Fix**

### **Successful TOTP Setup**
- ✅ No 500 errors in browser console
- ✅ QR code displays correctly
- ✅ Manual entry key provided
- ✅ Backup codes generated
- ✅ Database record created

### **Debug Endpoint Response**
```json
{
  "success": true,
  "checks": {
    "environment": {
      "JWT_SECRET": true,
      "SUPABASE_SERVICE_ROLE_KEY": true,
      "NEXT_PUBLIC_SUPABASE_URL": true
    },
    "dependencies": {
      "speakeasy": true,
      "qrcode": true,
      "supabaseAdmin": true
    },
    "database": {
      "connected": true,
      "tableExists": true,
      "error": null
    }
  }
}
```

## 🔄 **Next Steps**

1. **Deploy the fixes** to production environment
2. **Set missing environment variables** if any
3. **Test the debug endpoint** to verify system status
4. **Test TOTP setup flow** end-to-end
5. **Monitor logs** for any remaining issues

The enhanced error handling and diagnostic tools should help identify and resolve the specific cause of the 500 error in your production environment! 🚀
