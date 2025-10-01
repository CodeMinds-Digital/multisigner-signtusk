# Multi-Signature Display Enhancement

## Overview
Enhanced the Sign Inbox to properly display all signers and signing mode (sequential/parallel) for multi-signature requests, especially for received requests.

## Issues Fixed

### 1. **Multi-Signature Received Requests Not Showing All Signers** ✅
**Problem:** 
- When receiving a multi-signature request, it only showed "From: Pradeep K Multi-Signature (2)"
- Users couldn't see who all the signers were or their individual statuses

**Solution:**
- Created `getAllSignersDisplay()` function to show all signers with their status
- Updated RequestCard to conditionally display all signers for multi-signature received requests
- Each signer now shows with a status icon and color-coded status

### 2. **Signing Mode Not Displayed** ✅
**Problem:**
- The signing model (sequential or parallel) was not indicated anywhere in the UI

**Solution:**
- Updated `getSignatureTypeDisplay()` to read signing mode from `metadata.signing_mode`
- Now displays both "Multi-Signature (N)" and the mode (Sequential/Parallel) as separate badges
- Color-coded: Indigo for Sequential, Purple for Parallel

---

## Changes Made

### File 1: `src/components/features/documents/unified-signing-requests-list.tsx`

#### 1. Updated Interface (Lines 38-55)
Added `metadata` field to store signing mode:
```typescript
interface UnifiedSigningRequest extends SigningRequestListItem {
    // ... existing fields
    metadata?: {
        signing_mode?: 'sequential' | 'parallel'
        message?: string
        created_at?: string
    }
}
```

#### 2. Created `getAllSignersDisplay()` Function (Lines 850-881)
Displays all signers with status icons and colors:
```typescript
const getAllSignersDisplay = (request: UnifiedSigningRequest) => {
    const signers = request.signers || []
    if (signers.length === 0) return null

    return (
        <div className="space-y-1">
            {signers.map((signer, index) => {
                const statusColor = 
                    signer.status === 'signed' ? 'text-green-600' :
                    signer.status === 'declined' ? 'text-red-600' :
                    signer.status === 'viewed' ? 'text-blue-600' :
                    'text-gray-600'
                
                const statusIcon = 
                    signer.status === 'signed' ? '✓' :
                    signer.status === 'declined' ? '✕' :
                    signer.status === 'viewed' ? '👁' :
                    '○'

                return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <span className={`font-medium ${statusColor}`}>{statusIcon}</span>
                        <span className="text-gray-700">{signer.name || signer.email}</span>
                        <span className={`text-xs ${statusColor} capitalize`}>
                            ({signer.status || 'pending'})
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
```

**Status Icons:**
- ✓ = Signed (Green)
- ✕ = Declined (Red)
- 👁 = Viewed (Blue)
- ○ = Pending (Gray)

#### 3. Enhanced `getSignatureTypeDisplay()` Function (Lines 883-914)
Now shows signing mode for multi-signature requests:
```typescript
const getSignatureTypeDisplay = (request: UnifiedSigningRequest) => {
    const signerCount = request.signers?.length || 0
    
    if (signerCount === 1) {
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                Single Signature
            </span>
        )
    } else if (signerCount > 1) {
        // Get signing mode from metadata
        const signingMode = request.metadata?.signing_mode || 'sequential'
        const modeLabel = signingMode === 'parallel' ? 'Parallel' : 'Sequential'
        const modeColor = signingMode === 'parallel' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
        
        return (
            <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${modeColor}`}>
                    Multi-Signature ({signerCount})
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {modeLabel} Mode
                </span>
            </div>
        )
    }
    // ...
}
```

**Badge Colors:**
- **Sequential Mode**: Indigo background (#e0e7ff), Indigo text (#3730a3)
- **Parallel Mode**: Purple background (#f3e8ff), Purple text (#7e22ce)

#### 4. Updated All RequestCard Instances (Lines 1118-1202)
Added `getAllSignersDisplay` prop to all three tabs:
- All tab (line 1124)
- Sent tab (line 1156)
- Received tab (line 1188)

---

### File 2: `src/components/features/documents/request-card.tsx`

#### 1. Updated Interface (Lines 6-59)
Added `metadata` field and `getAllSignersDisplay` prop:
```typescript
interface UnifiedSigningRequest {
    // ... existing fields
    metadata?: {
        signing_mode?: 'sequential' | 'parallel'
        message?: string
        created_at?: string
    }
}

interface RequestCardProps {
    // ... existing props
    getAllSignersDisplay: (request: UnifiedSigningRequest) => JSX.Element | null
}
```

#### 2. Updated Card Layout (Lines 126-172)
Conditionally displays signers based on request type and signer count:

**For Single Signature or Sent Requests:**
```tsx
{(request.signers?.length === 1 || request.type === 'sent') && (
    <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <button onClick={() => handleFromToClick(request)}>
            {getFromToDisplay(request)}
        </button>
    </div>
)}
```

**For Multi-Signature Received Requests:**
```tsx
{request.type === 'received' && request.signers?.length > 1 && (
    <div className="space-y-2">
        <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 font-medium">From: {request.sender_name || 'Unknown'}</span>
        </div>
        <div className="ml-6 space-y-1">
            <div className="text-gray-600 font-medium text-xs mb-1">All Signers:</div>
            {getAllSignersDisplay(request)}
        </div>
    </div>
)}
```

---

## Visual Examples

### Before:
```
┌─────────────────────────────────────────────────────────────┐
│ ┃ 📄 Contract.pdf                          [Received]       │
│ ┃ 🆔 DS-123                                                 │
│ ┃                                                           │
│ ┃ Status: [Pending]                                         │
│ ┃ 👤 From: Pradeep K Multi-Signature (2)                   │
│ ┃ 📄 Multi-Signature (2)                                    │
│ ┃ 📅 Jan 1, 2025                                            │
└─────────────────────────────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────────────────────────────┐
│ ┃ 📄 Contract.pdf                          [Received]       │
│ ┃ 🆔 DS-123                                                 │
│ ┃                                                           │
│ ┃ Status: [Pending]                                         │
│ ┃ 👤 From: Pradeep K                                        │
│ ┃    All Signers:                                           │
│ ┃      ✓ John Doe (signed)                                 │
│ ┃      ○ Jane Smith (pending)                               │
│ ┃                                                           │
│ ┃ 📄 Multi-Signature (2)                                    │
│ ┃    Sequential Mode                                        │
│ ┃ 📅 Jan 1, 2025                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Display Logic

### Single Signature Requests
- Shows "To: [Name]" or "From: [Name]"
- Badge: "Single Signature" (Blue)

### Multi-Signature Sent Requests
- Shows "To: X recipients"
- Badge: "Multi-Signature (X)" (Indigo/Purple based on mode)
- Badge: "Sequential Mode" or "Parallel Mode" (Gray)

### Multi-Signature Received Requests
- Shows "From: [Sender Name]"
- Shows "All Signers:" section with:
  - Each signer's name/email
  - Status icon (✓, ✕, 👁, ○)
  - Status text (signed, declined, viewed, pending)
  - Color-coded by status
- Badge: "Multi-Signature (X)" (Indigo/Purple based on mode)
- Badge: "Sequential Mode" or "Parallel Mode" (Gray)

---

## Status Color Coding

| Status    | Icon | Color       | Hex Code  |
|-----------|------|-------------|-----------|
| Signed    | ✓    | Green       | #16a34a   |
| Declined  | ✕    | Red         | #dc2626   |
| Viewed    | 👁    | Blue        | #2563eb   |
| Pending   | ○    | Gray        | #6b7280   |

---

## Signing Mode Badges

| Mode       | Badge Color | Background | Text Color |
|------------|-------------|------------|------------|
| Sequential | Indigo      | #e0e7ff    | #3730a3    |
| Parallel   | Purple      | #f3e8ff    | #7e22ce    |

---

## Benefits

✅ **Complete Visibility** - Users can see all signers and their individual statuses  
✅ **Clear Signing Mode** - Sequential vs Parallel mode is clearly indicated  
✅ **Status at a Glance** - Color-coded icons make it easy to see who has signed  
✅ **Better Organization** - Sender info separate from signer list  
✅ **Consistent Design** - Follows the same card-based layout  
✅ **Responsive** - Works well on all screen sizes  

---

## Testing Checklist

### Single Signature Requests
- [ ] Shows "To: [Name]" for sent requests
- [ ] Shows "From: [Name]" for received requests
- [ ] Badge shows "Single Signature" in blue

### Multi-Signature Sent Requests
- [ ] Shows "To: X recipients"
- [ ] Badge shows "Multi-Signature (X)"
- [ ] Badge shows correct mode (Sequential/Parallel)
- [ ] Mode badge has correct color (Indigo/Purple)

### Multi-Signature Received Requests
- [ ] Shows "From: [Sender Name]"
- [ ] Shows "All Signers:" section
- [ ] Each signer displays with correct icon
- [ ] Each signer displays with correct color
- [ ] Status text is capitalized and in parentheses
- [ ] Badge shows "Multi-Signature (X)"
- [ ] Badge shows correct mode (Sequential/Parallel)

### Status Icons
- [ ] ✓ appears for signed signers (green)
- [ ] ✕ appears for declined signers (red)
- [ ] 👁 appears for viewed signers (blue)
- [ ] ○ appears for pending signers (gray)

---

## Files Modified

1. **src/components/features/documents/unified-signing-requests-list.tsx**
   - Added `metadata` to interface (lines 38-55)
   - Created `getAllSignersDisplay()` function (lines 850-881)
   - Enhanced `getSignatureTypeDisplay()` function (lines 883-914)
   - Updated all RequestCard instances (lines 1118-1202)

2. **src/components/features/documents/request-card.tsx**
   - Added `metadata` to interface (lines 6-37)
   - Added `getAllSignersDisplay` prop (line 44)
   - Updated card layout to conditionally show signers (lines 126-172)

