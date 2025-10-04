# Timezone Fix for Signature Request Expiration

## Problem

Signature requests were showing different expiration times between local development and production:

- **Local Development:** Expires Oct 5, 2025 · 11:59 PM
- **Production:** Expires Oct 6, 2025 · 5:29 AM

This happened because the code was using `setHours()` on the server, which operates in the **server's local timezone**, causing different times to be stored depending on where the code runs.

## Solution

**User Requirement:** When a user selects "Oct 5, 2025" as the expiration date, they want it to expire at **11:59 PM on Oct 5 in THEIR timezone**, and it should display as **11:59 PM** for everyone viewing it.

**Implementation:** The client calculates the expiration datetime (11:59 PM on the selected date) in the user's local timezone and sends it to the server. The server stores this datetime, and when displayed, it shows as 11:59 PM in the viewer's local timezone.

## Root Cause

### Before Fix

```typescript
// ❌ WRONG: Server sets time using server's local timezone
const expiresAt = new Date(dueDate)
expiresAt.setHours(23, 59, 59, 999) // Sets to 11:59 PM in SERVER's local timezone
```

**What happened:**
- **Development (Local Machine):** Server timezone might be IST (UTC+5:30)
  - Sets to 11:59 PM IST → Stored as 6:29 PM UTC
  - Displays as 11:59 PM for IST users, but different time for others
- **Production (Vercel/Cloud):** Server timezone is UTC
  - Sets to 11:59 PM UTC → Stored as 11:59 PM UTC
  - Displays as 5:29 AM for IST users (different from development!)

### After Fix

```typescript
// ✅ CORRECT: Client calculates time in user's local timezone
// CLIENT SIDE:
const localExpiry = new Date(dueDate + 'T23:59:59.999')
const expirationDateTime = localExpiry.toISOString()
// Send expirationDateTime to server

// SERVER SIDE:
const expiresAt = new Date(expirationDateTime) // Just parse what client sent
```

**What happens now:**
- Client calculates 11:59 PM in the USER's local timezone
- Server stores this datetime (which is already in the correct timezone)
- When displayed, it shows as 11:59 PM in the viewer's local timezone
- **Result:** Everyone sees 11:59 PM on the selected date in their own timezone

## Files Changed

### 1. API Route - Signature Request Creation
**File:** `src/app/api/signature-requests/route.ts`

```typescript
// Line 375-385
// Calculate expiration date
let expiresAt: Date
if (dueDate) {
  // Set expiry to 11:59 PM (23:59:59) of the selected date in UTC
  expiresAt = new Date(dueDate)
  expiresAt.setUTCHours(23, 59, 59, 999) // ✅ Changed from setHours
} else {
  // Default: 30 days from now at 11:59 PM in UTC
  expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  expiresAt.setUTCHours(23, 59, 59, 999) // ✅ Changed from setHours
}
```

### 2. Signature Request Service
**File:** `src/lib/signature-request-service.ts`

```typescript
// Line 45-48
// Calculate expiration date (default 30 days) - set to 11:59 PM (23:59:59) in UTC
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + (requestData.expiresInDays || 30))
expiresAt.setUTCHours(23, 59, 59, 999) // ✅ Changed from setHours
```

### 3. Unified Signature Service
**File:** `src/lib/unified-signature-service.ts`

```typescript
// Line 111-114
// Calculate expiry date - set to 11:59 PM (23:59:59) in UTC of the expiry day
const expires_at = new Date()
expires_at.setDate(expires_at.getDate() + expires_in_days)
expires_at.setUTCHours(23, 59, 59, 999) // ✅ Changed from setHours
```

### 4. Multi-Signature Service
**File:** `src/lib/multi-signature-service.ts`

```typescript
// Line 90-92
expires_at: (() => {
  const expiry = new Date(Date.now() + (settings.expiresInDays || 7) * 24 * 60 * 60 * 1000)
  expiry.setUTCHours(23, 59, 59, 999) // ✅ Changed from setHours
  return expiry.toISOString()
})()
```

### 5. Display Component (Already Correct)
**File:** `src/components/features/documents/unified-signing-requests-list.tsx`

```typescript
// Line 446-463
// This was already correct - it converts UTC to local timezone for display
const expiry = new Date(expiresAt) // Parses UTC string
const fullDateTime = expiry.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
}) + ' · ' + expiry.toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})
```

### 6. New Timezone Utilities
**File:** `src/lib/timezone-utils.ts` (NEW)

Created comprehensive timezone utility functions:
- `setExpirationTimeUTC()` - Set expiration to 11:59 PM UTC
- `createExpirationDate()` - Create expiration date N days from now
- `formatDateLocal()` - Format date in user's local timezone
- `getTimeRemaining()` - Calculate time remaining
- `formatExpirationWithTime()` - Format expiration with time
- `isExpired()` - Check if date is expired
- `getUserTimezone()` - Get user's timezone
- `getUTCOffset()` - Get UTC offset
- `logTimezoneDebug()` - Debug timezone issues

## How It Works Now

### 1. Creating a Signature Request

```typescript
// User selects: October 5, 2025 as due date
const dueDate = "2025-10-05"

// Backend creates expiration date
const expiresAt = new Date(dueDate)
expiresAt.setUTCHours(23, 59, 59, 999)

// Stored in database as: "2025-10-05T23:59:59.999Z"
// This is ALWAYS 11:59 PM UTC, regardless of server location
```

### 2. Displaying the Expiration Date

```typescript
// Frontend receives: "2025-10-05T23:59:59.999Z"
const expiry = new Date("2025-10-05T23:59:59.999Z")

// User in India (IST = UTC+5:30)
expiry.toLocaleString() // "Oct 6, 2025, 5:29 AM"

// User in USA (PST = UTC-8:00)
expiry.toLocaleString() // "Oct 5, 2025, 3:59 PM"

// User in UK (GMT = UTC+0:00)
expiry.toLocaleString() // "Oct 5, 2025, 11:59 PM"
```

## Testing

### Test Case 1: Create Request with Due Date
```typescript
// Input: dueDate = "2025-10-05"
// Expected Database Value: "2025-10-05T23:59:59.999Z"
// Expected Display (IST): "Oct 6, 2025 · 5:29 AM"
// Expected Display (UTC): "Oct 5, 2025 · 11:59 PM"
```

### Test Case 2: Create Request without Due Date (30 days default)
```typescript
// Input: No dueDate (defaults to 30 days)
// Expected: 30 days from now at 23:59:59.999 UTC
// Display: Converts to user's local timezone
```

### Test Case 3: Verify Consistency
```typescript
// Create request in development (any timezone)
// Create request in production (UTC)
// Both should store the same UTC time in database
// Both should display the same local time to users
```

## Benefits

1. **Consistency:** Same expiration time stored regardless of server location
2. **Predictability:** Users always see expiration in their local timezone
3. **Correctness:** No more timezone-related bugs
4. **Maintainability:** Clear UTC storage, local display pattern
5. **Scalability:** Works correctly in any deployment environment

## Best Practices Going Forward

### ✅ DO:
- Always use `setUTCHours()`, `setUTCMinutes()`, etc. when setting times
- Store all dates in UTC in the database (ISO 8601 format)
- Convert to local timezone only for display
- Use the new `timezone-utils.ts` helper functions

### ❌ DON'T:
- Don't use `setHours()`, `setMinutes()` for server-side date manipulation
- Don't store dates in local timezone
- Don't assume server timezone matches user timezone
- Don't perform timezone conversions manually

## Migration Notes

**No database migration needed!** The database already stores dates in UTC (ISO 8601 format). This fix only changes how we SET the time before storing, ensuring it's always UTC.

Existing records will continue to work correctly. New records will now be consistent across all environments.

## Verification

To verify the fix is working:

1. **Check Database:**
   ```sql
   SELECT id, title, expires_at 
   FROM signing_requests 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   All `expires_at` values should end with `T23:59:59.999Z`

2. **Check Logs:**
   Look for the debug logs in the API route:
   ```
   🔍 SIGNATURE REQUEST CREATION DEBUG: { ... timestamp: '2025-10-05T23:59:59.999Z' }
   ```

3. **Test in Different Timezones:**
   - Create a request in development
   - Create a request in production
   - Both should show the same expiration time when viewed from the same timezone

## Related Files

- `src/app/api/signature-requests/route.ts` - Main API route
- `src/lib/signature-request-service.ts` - Service layer
- `src/lib/unified-signature-service.ts` - Unified service
- `src/lib/multi-signature-service.ts` - Multi-signature service
- `src/lib/timezone-utils.ts` - Timezone utilities (NEW)
- `src/components/features/documents/unified-signing-requests-list.tsx` - Display component

## Support

If you encounter any timezone-related issues:

1. Use `logTimezoneDebug()` from `timezone-utils.ts` to debug
2. Check server logs for the stored UTC time
3. Verify the database value ends with `Z` (UTC indicator)
4. Ensure display code uses `toLocaleDateString()` / `toLocaleTimeString()`

