# 📋 Verify Page Status Logic - Quick Reference

## Status Priority Order

```
1. COMPLETED ────────────► ✓ Valid Document (Green)
                           Always, regardless of expiration date
                           
2. EXPIRED ──────────────► ⚠️ Expired Document (Orange)
   (status='expired'        Only if NOT completed
    OR past date)
                           
3. PENDING/IN_PROGRESS ──► ⏳ Pending Signatures (Blue)
                           
4. CANCELLED ────────────► ✕ Cancelled Document (Gray)
                           
5. DECLINED ─────────────► ✕ Declined Document (Red)
```

---

## Decision Tree

```
┌─────────────────────────────────────┐
│ Document Verification Request      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Clear previous results              │
│ setVerificationResult(null)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Fetch verification data             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Check: status === 'completed'?      │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
       YES            NO
        │              │
        ▼              ▼
┌──────────────┐  ┌──────────────────────┐
│ ✓ Valid      │  │ Check: expired?      │
│ Document     │  │ (status OR date)     │
│ (Green)      │  └──────┬───────────────┘
└──────────────┘         │
                  ┌──────┴──────┐
                 YES            NO
                  │              │
                  ▼              ▼
            ┌──────────────┐  ┌──────────────┐
            │ ⚠️ Expired    │  │ Check other  │
            │ Document     │  │ statuses     │
            │ (Orange)     │  └──────────────┘
            └──────────────┘
```

---

## Examples

### Example 1: Completed Before Expiration ✅
```
Status: completed
Expires: 2025-09-25
Completed: 2025-09-20
Current Date: 2025-10-01

Result: ✓ Valid Document (Green)
Reason: Completed status takes priority
```

### Example 2: Completed After Expiration ✅
```
Status: completed
Expires: 2025-09-25
Completed: 2025-09-30 (somehow completed after expiration)
Current Date: 2025-10-01

Result: ✓ Valid Document (Green)
Reason: Completed status always wins
```

### Example 3: Expired Without Completion ⚠️
```
Status: pending
Expires: 2025-09-25
Current Date: 2025-10-01

Result: ⚠️ Expired Document (Orange)
Reason: Not completed and past expiration
```

### Example 4: Pending Not Expired ⏳
```
Status: in_progress
Expires: 2025-10-15
Current Date: 2025-10-01

Result: ⏳ Pending Signatures (Blue)
Reason: Not completed, not expired
```

### Example 5: Explicitly Expired Status ⚠️
```
Status: expired
Expires: 2025-09-25
Current Date: 2025-10-01

Result: ⚠️ Expired Document (Orange)
Reason: Status is explicitly 'expired'
```

---

## Code Snippets

### Status Badge Logic
```typescript
const getVerificationBadge = (status: string, expiresAt?: string) => {
  const statusLower = status.toLowerCase()
  
  // 1. Completed always wins
  if (statusLower === 'completed') {
    return { icon: '✓', text: 'Valid Document', className: 'bg-green-100...' }
  }

  // 2. Check expiration (only for non-completed)
  const isExpired = status === 'expired' || 
                    (expiresAt && new Date(expiresAt) < new Date())
  
  if (isExpired) {
    return { icon: '⚠️', text: 'Expired Document', className: 'bg-orange-100...' }
  }

  // 3. Other statuses
  switch (statusLower) {
    case 'pending': case 'initiated': case 'in_progress':
      return { icon: '⏳', text: 'Pending Signatures', ... }
    case 'cancelled':
      return { icon: '✕', text: 'Cancelled Document', ... }
    case 'declined':
      return { icon: '✕', text: 'Declined Document', ... }
    default:
      return { icon: '✓', text: 'Valid Document', ... }
  }
}
```

### Clear Results on New Verification
```typescript
const verifyDocument = async (requestId: string) => {
  setIsVerifying(true)
  setVerificationResult(null) // ← Clear old data
  
  try {
    const response = await fetch(`/api/verify/${requestId}`)
    const result = await response.json()
    setVerificationResult(result)
    // ...
  }
}
```

### Clear Results on Input Change
```typescript
<Input
  value={documentId}
  onChange={(e) => {
    setDocumentId(e.target.value)
    if (verificationResult) {
      setVerificationResult(null) // ← Clear on typing
    }
  }}
/>
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Check Expiration First
```typescript
// This causes completed documents to show as expired
if (isExpired) {
  return 'Expired'
}
if (status === 'completed') {
  return 'Valid'
}
```

### ✅ Correct: Check Completed First
```typescript
// Completed status takes priority
if (status === 'completed') {
  return 'Valid'
}
if (isExpired) {
  return 'Expired'
}
```

### ❌ Wrong: Don't Clear Old Data
```typescript
const verifyDocument = async (requestId: string) => {
  setIsVerifying(true)
  // Old data still visible during loading
  const result = await fetch(...)
  setVerificationResult(result)
}
```

### ✅ Correct: Clear Immediately
```typescript
const verifyDocument = async (requestId: string) => {
  setIsVerifying(true)
  setVerificationResult(null) // Clear first
  const result = await fetch(...)
  setVerificationResult(result)
}
```

---

## Testing Matrix

| Status | Expires At | Current Date | Expected Badge | Expected Icon |
|--------|-----------|--------------|----------------|---------------|
| completed | 2025-09-25 | 2025-10-01 | ✓ Valid (Green) | ✓ Green |
| completed | 2025-10-15 | 2025-10-01 | ✓ Valid (Green) | ✓ Green |
| expired | 2025-09-25 | 2025-10-01 | ⚠️ Expired (Orange) | ⚠️ Orange |
| pending | 2025-09-25 | 2025-10-01 | ⚠️ Expired (Orange) | ⚠️ Orange |
| pending | 2025-10-15 | 2025-10-01 | ⏳ Pending (Blue) | ✓ Blue |
| in_progress | 2025-09-25 | 2025-10-01 | ⚠️ Expired (Orange) | ⚠️ Orange |
| cancelled | any | any | ✕ Cancelled (Gray) | ⚠️ Red |
| declined | any | any | ✕ Declined (Red) | ⚠️ Red |

---

## Key Principles

1. **Completed = Always Valid**
   - Completed documents are finalized agreements
   - Expiration date only matters during signing period
   - Once completed, document is permanently valid

2. **Expiration Only for Incomplete**
   - Expiration prevents new signatures
   - Doesn't invalidate already-completed documents
   - Checked only after confirming document isn't completed

3. **Clear Old Data Immediately**
   - Prevents confusion when verifying multiple documents
   - Provides immediate visual feedback
   - Ensures UI always reflects current state

4. **Consistent Icon and Badge**
   - Header icon color matches badge color
   - Same logic applied to both
   - Provides cohesive visual experience

---

## Summary

✅ **Completed documents**: Always show as "Valid" (green), regardless of expiration  
⚠️ **Expired documents**: Only non-completed documents can be expired (orange)  
🔄 **Data clearing**: Old results cleared immediately on new verification or input change  
🎨 **Visual consistency**: Icon and badge always match in color and meaning

