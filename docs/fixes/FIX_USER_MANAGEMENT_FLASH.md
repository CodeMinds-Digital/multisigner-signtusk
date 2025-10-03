# Fix: User Management Screen Flash Issue

## Problem

When opening the User Management screen, it briefly flashed the Document Settings screen for a fraction of a second before showing the correct User Management content.

## Root Cause

The issue was in the permission checking logic in both:
1. `src/app/(dashboard)/settings/users/page.tsx`
2. `src/app/(dashboard)/settings/corporate/page.tsx`

### What Was Happening:

1. Page loads with `loading = true` → Shows "Loading..." message
2. API call to check permissions completes
3. If user doesn't have permissions, `router.push('/settings/documents')` is called
4. **`setLoading(false)` is called in the `finally` block**
5. **Brief flash occurs** as the page renders before the redirect completes
6. Then redirect to `/settings/documents` happens

### The Problem:

- Using `router.push()` instead of `router.replace()` adds the redirect to browser history
- Calling `setLoading(false)` in the `finally` block meant it was ALWAYS called, even when redirecting
- This caused the page to briefly render its content before the redirect completed

## Solution Applied

### Fix 1: Use `router.replace()` Instead of `router.push()`

**Before:**
```typescript
if (data.userProfile.account_type !== 'corporate') {
  router.push('/settings/documents')
  return
}
```

**After:**
```typescript
if (data.userProfile.account_type !== 'corporate') {
  router.replace('/settings/documents')
  return
}
```

**Why:** `router.replace()` replaces the current history entry instead of adding a new one, making the redirect cleaner and preventing back button issues.

### Fix 2: Only Set Loading to False on Success

**Before:**
```typescript
try {
  // ... permission checks and redirects ...
  setUsers(data.users)
  setFilteredUsers(data.users)
} catch (error) {
  setMessage({ type: 'error', text: 'Failed to load users' })
} finally {
  setLoading(false)  // ❌ Always called, even when redirecting
}
```

**After:**
```typescript
try {
  // ... permission checks and redirects ...
  setUsers(data.users)
  setFilteredUsers(data.users)
  setLoading(false)  // ✅ Only called on success
} catch (error) {
  setMessage({ type: 'error', text: 'Failed to load users' })
  setLoading(false)  // ✅ Only called on error
}
// No finally block - loading stays true during redirect
```

**Why:** By removing the `finally` block and only calling `setLoading(false)` when we actually want to render the page, we prevent the flash during redirects.

## Files Modified

### 1. `src/app/(dashboard)/settings/users/page.tsx`

**Changes:**
- Line 65: Changed `router.push()` to `router.replace()`
- Line 70: Changed `router.push()` to `router.replace()`
- Lines 75-86: Moved `setLoading(false)` from `finally` block to success and error paths

### 2. `src/app/(dashboard)/settings/corporate/page.tsx`

**Changes:**
- Line 52: Changed `router.push()` to `router.replace()`
- Line 57: Changed `router.push()` to `router.replace()`
- Lines 62-73: Moved `setLoading(false)` from `finally` block to success and error paths

## Testing

To verify the fix:

1. **Test as Enterprise Admin/Owner:**
   - Navigate to `/settings/users`
   - Should load smoothly without any flash
   - Should show User Management screen

2. **Test as Non-Enterprise User:**
   - Navigate to `/settings/users`
   - Should redirect to `/settings/documents` immediately
   - Should NOT show any flash of User Management screen

3. **Test as Enterprise Member (not admin):**
   - Navigate to `/settings/users`
   - Should redirect to `/settings/documents` immediately
   - Should NOT show any flash of User Management screen

4. **Test Enterprise Settings:**
   - Same tests as above for `/settings/corporate`

## Result

✅ **No more flash** when opening User Management or Enterprise Settings screens
✅ **Cleaner redirects** using `router.replace()` instead of `router.push()`
✅ **Better UX** - users don't see content they're not authorized to access
✅ **No browser history pollution** - back button works correctly

## Additional Benefits

1. **Security:** Users never see unauthorized content, even for a fraction of a second
2. **Performance:** Slightly faster as we don't render unnecessary content
3. **UX:** Smoother navigation without visual glitches
4. **Browser History:** Cleaner history without redirect entries

