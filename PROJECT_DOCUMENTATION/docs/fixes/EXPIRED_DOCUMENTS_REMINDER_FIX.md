# 🔧 Expired Documents - Send Reminder Fix

## Issue Description
The "Send Reminder" option was being displayed in document actions for expired signature requests, even though reminders are not applicable to expired documents.

## Changes Made

### 1. Unified Signing Requests List (`src/components/features/documents/unified-signing-requests-list.tsx`)

**Modified the Actions Bottom Sheet to conditionally show "Send Reminder":**

```typescript
{/* Send Reminder Action - Only show if not expired */}
{!getTimeRemaining(showActionsSheet.expires_at, showActionsSheet).includes('Expired') && (
    <button
        onClick={() => {
            handleShare(showActionsSheet)
            setShowActionsSheet(null)
        }}
        className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
    >
        <Share2 className="w-5 h-5 text-blue-600 mr-3" />
        <div>
            <p className="font-medium text-gray-900">Send Reminder</p>
            <p className="text-sm text-gray-600">Notify signers about pending signatures</p>
        </div>
    </button>
)}
```

**Logic:**
- Uses the existing `getTimeRemaining()` function to check if the document is expired
- Only renders the "Send Reminder" button if the time remaining does NOT include the word "Expired"
- This ensures expired documents don't show the reminder option

### 2. Document List (`src/components/features/documents/document-list.tsx`)

**Added helper function to check if a request is expired:**

```typescript
// Helper function to check if a request is expired
const isRequestExpired = (request: SigningRequestListItem): boolean => {
    if (!request.expires_at) return false
    return new Date(request.expires_at) < new Date()
}
```

**Modified the dropdown menu to conditionally show "Send Reminder":**

```typescript
{/* Only show Send Reminder if not expired */}
{!isRequestExpired(request) && (
    <DropdownMenuItem onClick={() => handleShare(request)}>
        <Share2 className="w-4 h-4 mr-2" />
        Send Reminder
    </DropdownMenuItem>
)}
```

**Logic:**
- Created a dedicated `isRequestExpired()` helper function
- Checks if `expires_at` exists and if it's in the past
- Only renders the "Send Reminder" menu item if the request is not expired

## Behavior

### ✅ Before Expiration
- "Send Reminder" option is visible in document actions
- Users can send reminders to pending signers
- Normal workflow continues

### ❌ After Expiration
- "Send Reminder" option is **hidden** from document actions
- Users cannot send reminders for expired documents
- Other actions (View Details, Verify Document, Delete) remain available

## Files Modified

1. **src/components/features/documents/unified-signing-requests-list.tsx**
   - Line 1570: Added conditional rendering for "Send Reminder" button
   - Uses `getTimeRemaining()` to check expiration status

2. **src/components/features/documents/document-list.tsx**
   - Lines 53-57: Added `isRequestExpired()` helper function
   - Lines 305-310: Added conditional rendering for "Send Reminder" menu item

## Testing Checklist

- [ ] Create a signature request with a short expiration time (e.g., 1 day)
- [ ] Before expiration: Verify "Send Reminder" appears in actions
- [ ] Before expiration: Verify clicking "Send Reminder" works correctly
- [ ] After expiration: Verify "Send Reminder" does NOT appear in actions
- [ ] After expiration: Verify other actions (View, Verify, Delete) still work
- [ ] Test in both "Unified Signing Requests List" and "Document List" components
- [ ] Test in all tabs (All, Sent, Received)

## Edge Cases Handled

1. **No expiration date**: If `expires_at` is null/undefined, the document is treated as not expired
2. **Completed documents**: Already handled by existing `isRequestCompleted()` check
3. **Cancelled documents**: Already handled by existing status checks
4. **Multiple signers**: Expiration applies to the entire request, not individual signers

## Related Components

- **Reminder API**: `/api/signature-requests/[id]/remind/route.ts` - Already has server-side validation
- **Notification Scheduler**: `src/lib/notification-scheduler.ts` - Marks documents as expired
- **Document Status Manager**: `src/lib/document-status-manager.ts` - Handles status transitions

## Benefits

✅ **Improved UX**: Users won't see irrelevant actions for expired documents  
✅ **Prevents Errors**: Avoids confusion about why reminders can't be sent  
✅ **Consistent Behavior**: Aligns UI with business logic (expired = no reminders)  
✅ **Clean Interface**: Reduces clutter in actions menu for expired documents  

## Future Enhancements

Consider adding:
1. A visual indicator (badge/icon) showing why reminder is not available
2. A tooltip explaining that reminders can't be sent for expired documents
3. An option to "Extend Expiration" for expired documents
4. Bulk actions to handle multiple expired documents

