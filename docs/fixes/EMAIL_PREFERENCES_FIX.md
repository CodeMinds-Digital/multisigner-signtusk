# Email Preferences Page Fix

## Problem

When clicking "Email Preferences" under Settings, the application showed errors:

**Error 1** (Initial):
```
Error: supabaseKey is required.
    at ClientPageRoot (<anonymous>)
```

**Error 2** (After API route fix):
```
Error: useAuth must be used within an AuthProvider
    at EmailPreferencesSettings (<anonymous>)
```

## Root Causes

### Issue 1: Direct Service Call from Client Component

The `EmailPreferencesSettings` component was a **client component** (`'use client'`) that was directly calling `NotificationService.getNotificationPreferences()` and `NotificationService.updateNotificationPreferences()`.

These service methods use the Supabase client from `src/lib/supabase.ts`, which in turn uses `src/lib/dynamic-supabase.ts`. The dynamic Supabase client tries to access environment variables:

```typescript
// From dynamic-supabase.ts
function getCurrentEnvValues() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  // ...
}
```

**The Problem**: When a client component tries to use this service, the environment variables may not be available on the client side, causing the error "supabaseKey is required."

### Issue 2: Wrong Auth Provider Import

The `EmailPreferencesSettings` component was importing `useAuth` from `@/components/providers/auth-provider`, but the application uses `SecureAuthProvider` which exports its own `useAuth` hook from `@/components/providers/secure-auth-provider`.

**The Problem**: The component was trying to use a context that wasn't provided in the component tree, causing the error "useAuth must be used within an AuthProvider."

## Solution

Created an API route to handle notification preferences on the server side, where environment variables are always available.

### Files Created

1. **`src/app/api/user/notification-preferences/route.ts`** (New)
   - GET endpoint: Fetches notification preferences for the authenticated user
   - PUT endpoint: Updates notification preferences for the authenticated user
   - Uses JWT authentication to verify the user
   - Calls `NotificationService` methods on the server side

### Files Modified

2. **`src/components/features/settings/email-preferences-settings.tsx`**
   - **Fix 1**: Changed `loadPreferences()` to call `/api/user/notification-preferences` instead of directly calling `NotificationService.getNotificationPreferences()`
   - **Fix 1**: Changed `handleToggle()` to call `/api/user/notification-preferences` (PUT) instead of directly calling `NotificationService.updateNotificationPreferences()`
   - **Fix 1**: Removed unused import of `NotificationService`
   - **Fix 2**: Changed import from `@/components/providers/auth-provider` to `@/components/providers/secure-auth-provider`

## Implementation Details

### API Route (`src/app/api/user/notification-preferences/route.ts`)

```typescript
export async function GET(request: NextRequest) {
  // 1. Get and verify access token from cookies
  const { accessToken } = getAuthTokensFromRequest(request)
  const payload = await verifyAccessToken(accessToken)
  const userId = payload.userId

  // 2. Get preferences using NotificationService (server-side)
  const preferences = await NotificationService.getNotificationPreferences(userId)

  // 3. Return preferences as JSON
  return NextResponse.json(preferences)
}

export async function PUT(request: NextRequest) {
  // 1. Get and verify access token
  const { accessToken } = getAuthTokensFromRequest(request)
  const payload = await verifyAccessToken(accessToken)
  const userId = payload.userId

  // 2. Get updates from request body
  const updates = await request.json()

  // 3. Update preferences using NotificationService (server-side)
  const success = await NotificationService.updateNotificationPreferences(userId, updates)

  // 4. Return result
  return NextResponse.json({ success })
}
```

### Client Component Changes

#### Fix 1: API Route Instead of Direct Service Call

**Before:**
```typescript
import { NotificationService } from '@/lib/notification-service'

const loadPreferences = async () => {
  const prefs = await NotificationService.getNotificationPreferences(user.id)
  setPreferences(prefs)
}

const handleToggle = async (key: keyof NotificationPreferences) => {
  const success = await NotificationService.updateNotificationPreferences(user.id, {
    [key]: newValue
  })
}
```

**After:**
```typescript
// Removed NotificationService import

const loadPreferences = async () => {
  const response = await fetch('/api/user/notification-preferences')
  const prefs = await response.json()
  setPreferences(prefs)
}

const handleToggle = async (key: keyof NotificationPreferences) => {
  const response = await fetch('/api/user/notification-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: newValue })
  })
  const result = await response.json()
}
```

#### Fix 2: Correct Auth Provider Import

**Before:**
```typescript
import { useAuth } from '@/components/providers/auth-provider'
```

**After:**
```typescript
import { useAuth } from '@/components/providers/secure-auth-provider'
```

**Why**: The application uses `SecureAuthProvider` in the root layout (`src/app/layout.tsx`), which exports its own `useAuth` hook. Using the wrong import causes the "useAuth must be used within an AuthProvider" error.

## Benefits

1. **Separation of Concerns**: Client components don't directly access server-side services
2. **Security**: Environment variables and service role keys stay on the server
3. **Authentication**: JWT tokens are verified on the server before accessing data
4. **Error Handling**: Better error handling with HTTP status codes
5. **Consistency**: Follows the same pattern as other API routes in the application

## Testing

To test the fix:

1. Navigate to Settings > Email Preferences (or `/settings/notifications`)
2. The page should load without errors
3. Toggle any preference switch
4. Verify the preference is saved (check for success toast)
5. Refresh the page and verify the preference persists

## Related Files

- `src/lib/notification-service.ts` - Service that handles notification preferences (server-side only)
- `src/lib/supabase.ts` - Supabase client proxy
- `src/lib/dynamic-supabase.ts` - Dynamic Supabase client that requires environment variables
- `src/lib/auth-cookies.ts` - Cookie handling for authentication
- `src/lib/jwt-utils.ts` - JWT token verification

## Lessons Learned

**Best Practice**: Client components should **never** directly call services that use:
- Environment variables (especially service role keys)
- Supabase admin clients
- Database connections
- Server-side only libraries

Instead, create API routes that:
1. Verify authentication
2. Call the service on the server side
3. Return the result to the client

This ensures security, proper error handling, and separation of concerns.

