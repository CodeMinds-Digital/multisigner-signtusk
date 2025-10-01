# Sign Inbox Redesign - Visual Guide

## Before & After Comparison

### BEFORE: Table-Based Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sign Inbox                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [All (10)] [Sent (6)] [Received (4)]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Type │ Document Title │ Sign ID │ Status │ From/To │ Type │ Date │ Expires │
├──────┼────────────────┼─────────┼────────┼─────────┼──────┼──────┼─────────┤
│ Sent │ Contract.pdf   │ DS-123  │ Pending│ John    │Single│ Jan 1│ 5 days  │
├──────┼────────────────┼─────────┼────────┼─────────┼──────┼──────┼─────────┤
│ Recv │ Agreement.pdf  │ DS-456  │ Signed │ Alice   │Multi │ Jan 2│ Done    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Issues:**
- ❌ Cramped on mobile devices
- ❌ Difficult to scan quickly
- ❌ Limited space for information
- ❌ Not visually appealing
- ❌ Hard to distinguish between sent/received at a glance

---

### AFTER: Card-Based Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sign Inbox                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [All (10)] [Sent (6)] [Received (4)]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ ┃ 📄 Contract.pdf                              [Sent]                 │ │
│ │ ┃ 🆔 DS-123                                                            │ │
│ │ ┃                                                                      │ │
│ │ ┃ Status: [Pending]  To: John Doe  Type: Single  Date: Jan 1, 2025   │ │
│ │ ┃                                                                      │ │
│ │ ┃ 🕐 5 days remaining                                                 │ │
│ │ ┃                                                                      │ │
│ │ ┃ [👁 Preview] [ℹ Details] [⋯ More]                                   │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│   ↑ Green border for sent requests                                         │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ ┃ 📄 Agreement.pdf                          [Received]                │ │
│ │ ┃ 🆔 DS-456                                                            │ │
│ │ ┃                                                                      │ │
│ │ ┃ Status: [Signed]  From: Alice  Type: Multi (3)  Date: Jan 2, 2025  │ │
│ │ ┃                                                                      │ │
│ │ ┃ 🕐 Completed                                                        │ │
│ │ ┃                                                                      │ │
│ │ ┃ [👁 Preview] [ℹ Details] [📥 Final PDF]                             │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│   ↑ Purple border for received requests                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Spacious and easy to read
- ✅ Color-coded borders for quick identification
- ✅ More information visible at once
- ✅ Modern and visually appealing
- ✅ Works great on all screen sizes

---

## Card Anatomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┃ [1] Document Icon & Title                    [2] Type Badge          │
│ ┃ [3] Document Sign ID                                                 │
│ ┃                                                                       │
│ ┃ [4] Metadata Grid:                                                   │
│ ┃     • Status Badge                                                   │
│ ┃     • From/To (clickable)                                            │
│ ┃     • Signature Type                                                 │
│ ┃     • Date Initiated                                                 │
│ ┃                                                                       │
│ ┃ [5] Expiration Status (with icon and color)                          │
│ ┃                                                                       │
│ ┃ [6] Decline Reason (if applicable)                                   │
│ ┃                                                                       │
│ ┃ [7] Action Buttons                                                   │
│ └───────────────────────────────────────────────────────────────────────┘
  ↑ [8] Color-coded left border
```

### Component Breakdown:

1. **Document Icon & Title**
   - 📄 File icon (gray)
   - Document title in medium font weight
   - Truncates if too long

2. **Type Badge** (Only in "All" tab)
   - "Sent" badge (green background)
   - "Received" badge (purple background)

3. **Document Sign ID**
   - Monospace font
   - Blue background (#eff6ff)
   - Blue text (#1e40af)
   - Format: 🆔 DS-XXXXX

4. **Metadata Grid**
   - **Status Badge**: Color-coded based on status
     - Green: Completed, Signed
     - Blue: Pending, In Progress
     - Red: Expired, Declined
     - Gray: Initiated, Viewed
   - **From/To**: Clickable link (blue on hover)
     - Shows sender for received requests
     - Shows recipient for sent requests
   - **Signature Type**:
     - "Single Signature" badge
     - "Multi-Signature (N)" badge with count
   - **Date**: Formatted as "MMM DD, YYYY"

5. **Expiration Status**
   - 🕐 Clock icon
   - Color-coded text:
     - Red: "Expired"
     - Green: "Completed"
     - Gray: "X days remaining"

6. **Decline Reason** (Conditional)
   - Only shows if request was declined
   - Red background with warning icon
   - Shows reason text

7. **Action Buttons**
   - **Preview** (👁): Opens PDF preview
   - **Details** (ℹ): Opens request details modal
   - **Sign** (for received): Green button to sign document
   - **Final PDF** (📥): Download completed PDF
   - **More** (⋯): Opens actions menu (for sent)
   - **Completed** (✓): Green badge (for sent completed)

8. **Color-coded Border**
   - **Green** (#10b981): Sent requests
   - **Purple** (#a855f7): Received requests
   - 4px thick left border

---

## Status Badge Colors

```
┌─────────────────────────────────────────────────────────────┐
│ Status          │ Color      │ Background  │ Border        │
├─────────────────┼────────────┼─────────────┼───────────────┤
│ Completed       │ Green-800  │ Green-100   │ Green-200     │
│ Signed          │ Green-800  │ Green-100   │ Green-200     │
│ Pending         │ Blue-800   │ Blue-100    │ Blue-200      │
│ In Progress     │ Blue-800   │ Blue-100    │ Blue-200      │
│ Expired         │ Red-800    │ Red-100     │ Red-200       │
│ Declined        │ Red-800    │ Red-100     │ Red-200       │
│ Initiated       │ Gray-800   │ Gray-100    │ Gray-200      │
│ Viewed          │ Gray-800   │ Gray-100    │ Gray-200      │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ [Card 1 - Full Width]                                       │
├─────────────────────────────────────────────────────────────┤
│ [Card 2 - Full Width]                                       │
├─────────────────────────────────────────────────────────────┤
│ [Card 3 - Full Width]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌─────────────────────────────────────────────────────────────┐
│ [Card 1 - Full Width]                                       │
├─────────────────────────────────────────────────────────────┤
│ [Card 2 - Full Width]                                       │
├─────────────────────────────────────────────────────────────┤
│ [Card 3 - Full Width]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌───────────────────────────────┐
│ [Card 1 - Full Width]         │
├───────────────────────────────┤
│ [Card 2 - Full Width]         │
├───────────────────────────────┤
│ [Card 3 - Full Width]         │
└───────────────────────────────┘
```

**Note:** Cards stack vertically on all screen sizes with consistent spacing (12px gap).

---

## Tab-Specific Differences

### All Tab
- Shows **both** sent and received requests
- **Type badge** visible (Sent/Received)
- Mixed green and purple borders

### Sent Tab
- Shows **only** sent requests
- **No type badge** (all are sent)
- All cards have **green borders**
- Shows "To" in metadata
- Shows "More Actions" button for incomplete
- Shows "Completed" badge for complete

### Received Tab
- Shows **only** received requests
- **No type badge** (all are received)
- All cards have **purple borders**
- Shows "From" in metadata
- Shows "Sign" button if can sign
- Shows "Final PDF" button if completed

---

## Interaction States

### Hover
```
┌─────────────────────────────────────────────────────────────┐
│ ┃ Card content...                                           │
│ ┃                                                           │
│ ┃ [Elevated shadow appears]                                │
│ └───────────────────────────────────────────────────────────┘
  ↑ Shadow increases on hover (transition: 200ms)
```

### Click on From/To
```
Opens bottom sheet with signer details:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Signer Details                                    [X]   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Name: John Doe                                          │ │
│ │ Email: john@example.com                                 │ │
│ │ Status: Pending                                         │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Empty States

### No Requests
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    📄                                       │
│                                                             │
│              No signature requests found                    │
│                                                             │
│         No requests found for selected time range           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### No Search Results
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🔍                                       │
│                                                             │
│              No matching requests found                     │
│                                                             │
│         No requests match "search query"                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Accessibility Features

- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy
- ✅ ARIA labels for buttons
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Color contrast compliance (WCAG AA)
- ✅ Screen reader friendly
- ✅ Clickable areas properly sized (min 44x44px)

---

## Performance Considerations

- ✅ Same data fetching as before (no additional queries)
- ✅ Efficient rendering (React keys properly set)
- ✅ No unnecessary re-renders
- ✅ Lazy loading ready (can add infinite scroll)
- ✅ Optimized CSS (Tailwind utility classes)
- ✅ Minimal JavaScript (no heavy libraries)

