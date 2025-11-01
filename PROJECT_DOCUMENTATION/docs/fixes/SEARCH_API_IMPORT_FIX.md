# 🔧 Search API Import Error Fix

## ❌ **Problem**

When running `npm run build`, the build was failing with these errors:

```
Failed to compile.

./src/app/api/search/index/route.ts
Module not found: Can't resolve '@/lib/auth-utils'

./src/app/api/search/route.ts
Module not found: Can't resolve '@/lib/auth-utils'
```

## 🔍 **Root Cause**

The search API routes were trying to import `getSession` from `@/lib/auth-utils`, but this file doesn't exist in the codebase:

```typescript
// ❌ Incorrect import - file doesn't exist
import { getSession } from '@/lib/auth-utils'
```

## ✅ **Solution**

Fixed the imports to use the correct authentication utilities that exist in the codebase:

### **1. Updated Imports**

#### **Before (Broken)**
```typescript
import { getSession } from '@/lib/auth-utils'
```

#### **After (Fixed)**
```typescript
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
```

### **2. Updated Authentication Logic**

#### **Before (Using non-existent getSession)**
```typescript
const session = await getSession(request)
if (!session?.user?.app_metadata?.role?.includes('admin')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

#### **After (Using correct JWT verification)**
```typescript
const tokens = getAuthTokensFromRequest(request)
if (!tokens.accessToken) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const payload = await verifyAccessToken(tokens.accessToken)
if (!payload?.role?.includes('admin')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

## 🔧 **Files Modified**

### **1. `src/app/api/search/index/route.ts`**

#### **Import Changes**
```typescript
// ❌ Removed
import { getSession } from '@/lib/auth-utils'

// ✅ Added
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
```

#### **Authentication Logic Changes**
- Replaced `getSession(request)` with proper JWT token verification
- Updated admin role checking to use JWT payload instead of session metadata

### **2. `src/app/api/search/route.ts`**

#### **Import Changes**
```typescript
// ❌ Removed
import { getSession } from '@/lib/auth-utils'

// ✅ Added
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
```

#### **Authentication Logic Changes**

**GET Method:**
- Added optional authentication for user context
- Graceful fallback for public searches without authentication
- Proper admin verification for user searches

**POST Method:**
- Required authentication for all POST operations
- Proper JWT token verification
- Updated admin checks for privileged operations

## 🎯 **Authentication Flow Now**

### **1. Token Extraction**
```typescript
const tokens = getAuthTokensFromRequest(request)
```

### **2. Token Verification**
```typescript
if (tokens.accessToken) {
  const payload = await verifyAccessToken(tokens.accessToken)
  const userId = payload?.userId
}
```

### **3. Role-Based Access Control**
```typescript
if (!payload?.role?.includes('admin')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

## 🔍 **Authentication Methods Used**

### **1. `getAuthTokensFromRequest()` from `@/lib/auth-cookies`**
- Extracts JWT tokens from HTTP-only cookies
- Returns both access and refresh tokens
- Used by all API routes for authentication

### **2. `verifyAccessToken()` from `@/lib/jwt-utils`**
- Verifies JWT token signature and expiration
- Returns decoded payload with user information
- Throws error for invalid/expired tokens

## 🚨 **Why This Happened**

The search API routes were likely created during development and used a placeholder import that was never properly implemented. The `@/lib/auth-utils` file was referenced but never created, causing the build to fail when webpack tried to resolve the module.

## ✅ **Build Status**

### **Before Fix**
```
Failed to compile.
Module not found: Can't resolve '@/lib/auth-utils'
```

### **After Fix**
```
✓ Compiled successfully in 19.6s
```

## 🔄 **Testing**

### **1. Build Test**
```bash
npm run build
# ✅ Should complete successfully without module resolution errors
```

### **2. Search API Functionality**
- **GET /api/search**: Public search with optional authentication
- **POST /api/search**: Authenticated search operations
- **POST /api/search/index**: Admin-only indexing operations

### **3. Authentication Verification**
- Unauthenticated requests: Work for public searches
- Authenticated requests: Proper user context and permissions
- Admin requests: Proper role verification for privileged operations

## 🎉 **Result**

The build now completes successfully! The search API routes use the correct authentication system that's consistent with the rest of the application:

- ✅ **Proper Imports**: Using existing authentication utilities
- ✅ **Consistent Auth**: Same JWT-based authentication as other API routes
- ✅ **Role-Based Access**: Proper admin verification for privileged operations
- ✅ **Graceful Fallbacks**: Public searches work without authentication
- ✅ **Build Success**: No more module resolution errors

The search functionality is now properly integrated with the application's authentication system! 🚀
