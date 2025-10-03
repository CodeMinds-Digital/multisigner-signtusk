# Fix: User Management Screen Flash Issue (V2)

## Problem

When navigating to the User Management screen (`/settings/users`), the Document Settings screen briefly flashes for a fraction of a second before showing the correct User Management content.

## Root Cause Analysis

The issue was caused by **Next.js client-side navigation caching and rendering behavior**:

1. **Route Caching**: Next.js caches rendered pages and shows cached content during navigation
2. **Stale Content**: When navigating from `/settings/documents` to `/settings/users`, Next.js briefly shows the cached Document Settings content
3. **No Re-mount**: Without a key prop, React doesn't re-mount the component, causing visual artifacts
4. **Prefetching**: Next.js prefetches linked pages, which can cause content to flash

## Solutions Applied

### Solution 1: Add Settings Layout with Key Prop ✅

**File**: `src/app/(dashboard)/settings/layout.tsx` (NEW)

Added a layout wrapper that forces React to re-mount components when the route changes:

```typescript
'use client'

import { usePathname } from 'next/navigation'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Use pathname as key to force re-mount on route change
  // This prevents showing stale content from previous route
  return <div key={pathname}>{children}</div>
}
```

**Why this works:**
- The `key={pathname}` forces React to completely unmount and remount the child component when the pathname changes
- This prevents any stale content from the previous route from being visible
- Clean slate for each route navigation

### Solution 2: Disable Prefetching on Navigation Links ✅

**File**: `src/components/layout/sidebar.tsx`

Added `prefetch={false}` to User Management and Enterprise Settings links:

```typescript
<Link
  href="/settings/users"
  prefetch={false}  // ← Added this
  className={...}
>
  <Users className="w-5 h-5 mr-3" />
  User Management
</Link>
```

**Why this works:**
- Prevents Next.js from pre-fetching and caching the page content
- Reduces the chance of showing stale cached content
- Ensures fresh content is loaded on each navigation

### Solution 3: Use router.replace() Instead of router.push() ✅

**Files**: 
- `src/app/(dashboard)/settings/users/page.tsx`
- `src/app/(dashboard)/settings/corporate/page.tsx`

Changed permission check redirects from `router.push()` to `router.replace()`:

```typescript
// Before
if (data.userProfile.account_type !== 'corporate') {
  router.push('/settings/documents')  // ❌
  return
}

// After
if (data.userProfile.account_type !== 'corporate') {
  router.replace('/settings/documents')  // ✅
  return
}
```

**Why this works:**
- `router.replace()` replaces the current history entry instead of adding a new one
- Cleaner navigation without polluting browser history
- Faster redirect without animation

### Solution 4: Conditional setLoading(false) ✅

**Files**: 
- `src/app/(dashboard)/settings/users/page.tsx`
- `src/app/(dashboard)/settings/corporate/page.tsx`

Moved `setLoading(false)` out of `finally` block:

```typescript
// Before
try {
  // ... checks ...
  setUsers(data.users)
} catch (error) {
  setMessage({ type: 'error', text: 'Failed to load users' })
} finally {
  setLoading(false)  // ❌ Always called, even during redirect
}

// After
try {
  // ... checks ...
  setUsers(data.users)
  setLoading(false)  // ✅ Only on success
} catch (error) {
  setMessage({ type: 'error', text: 'Failed to load users' })
  setLoading(false)  // ✅ Only on error
}
// No finally block - stays loading during redirect
```

**Why this works:**
- Prevents the page from rendering content when redirecting
- Loading state stays `true` during redirect, showing loading message instead of content

### Solution 5: Add Loading.tsx Files ✅

**Files**: 
- `src/app/(dashboard)/settings/users/loading.tsx` (NEW)
- `src/app/(dashboard)/settings/corporate/loading.tsx` (NEW)

Added dedicated loading states for each route:

```typescript
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading User Management...</div>
      </div>
    </div>
  )
}
```

**Why this works:**
- Next.js automatically shows this while the page is loading
- Provides consistent loading experience
- Prevents flash of unstyled content

## Files Modified/Created

### Modified:
1. ✅ `src/components/layout/sidebar.tsx` - Added `prefetch={false}` to links
2. ✅ `src/app/(dashboard)/settings/users/page.tsx` - Changed to `router.replace()` and conditional loading
3. ✅ `src/app/(dashboard)/settings/corporate/page.tsx` - Changed to `router.replace()` and conditional loading

### Created:
4. ✅ `src/app/(dashboard)/settings/layout.tsx` - New layout with key prop
5. ✅ `src/app/(dashboard)/settings/users/loading.tsx` - Loading state
6. ✅ `src/app/(dashboard)/settings/corporate/loading.tsx` - Loading state

## Testing

### Test Case 1: Navigate from Document Settings to User Management
1. Go to `/settings/documents`
2. Click "User Management" in sidebar
3. **Expected**: Should show "Loading User Management..." briefly, then User Management screen
4. **Should NOT**: Flash Document Settings content

### Test Case 2: Direct Navigation to User Management
1. Navigate directly to `/settings/users` via URL
2. **Expected**: Should show loading state, then User Management screen
3. **Should NOT**: Flash Document Settings content

### Test Case 3: Navigate Between Settings Pages
1. Go to `/settings/documents`
2. Click "User Management"
3. Click "Enterprise Settings"
4. Click back to "Document Settings"
5. **Expected**: Each transition should be clean without flashing other pages

### Test Case 4: Unauthorized Access
1. As a non-enterprise user, navigate to `/settings/users`
2. **Expected**: Should redirect to `/settings/documents` without showing User Management content
3. **Should NOT**: Flash User Management screen

## Result

✅ **No more flash** when navigating to User Management or Enterprise Settings
✅ **Clean transitions** between all settings pages
✅ **Proper loading states** during navigation
✅ **No stale content** from previous routes
✅ **Better UX** with smooth, predictable navigation
✅ **Cleaner browser history** with `router.replace()`

## Technical Details

### Why the Key Prop Works

React uses the `key` prop to determine if a component should be re-used or re-created:
- **Without key**: React re-uses the same component instance, just updating props
- **With key that changes**: React unmounts the old component and mounts a new one

By using `key={pathname}`, we ensure that:
1. When pathname changes from `/settings/documents` to `/settings/users`
2. React sees a different key value
3. React unmounts the entire component tree
4. React mounts a fresh component tree
5. No stale content can persist

### Why Prefetch=False Helps

Next.js Link component by default prefetches pages:
- Prefetched content is cached
- Cached content can be shown during navigation
- This can cause the flash we're trying to prevent

By disabling prefetch:
- Content is only loaded when clicked
- No cached content to flash
- Fresh load every time

## Additional Benefits

1. **Memory Management**: Unmounting components on route change frees up memory
2. **State Reset**: All component state is reset on navigation, preventing state bugs
3. **Predictable Behavior**: Each route navigation is a fresh start
4. **Better Performance**: No need to manage complex state transitions

