# 🚀 Quick Debug Reference - Signature Placement

## The Flow
```
Template Creation → Signature Request → Signing → PDF Generation
     (Schema)      (Map Signers)    (Save Data)  (Place Signatures)
```

## What to Check in Logs

### 1. Schema Fields (📋)
```javascript
Field 0: { name: 'signature_1', type: 'signature', signerId: 'signer_1' }
```
✅ **Good:** Has `signerId`  
❌ **Bad:** `signerId: undefined`

### 2. Available Signers (👥)
```javascript
{ email: 'john@example.com', schema_id: 'signer_1', status: 'signed' }
```
✅ **Good:** Has `schema_id`, status is `'signed'`  
❌ **Bad:** `schema_id: null` or status is `'pending'`

### 3. Signature Data (📦)
```javascript
{ hasSigner_name: true, hasSignature_image: true }
```
✅ **Good:** `hasSignature_image: true`  
❌ **Bad:** `hasSignature_image: false`

### 4. Populated Inputs (📊)
```javascript
signature_1: { isImage: true, length: 15234 }
```
✅ **Good:** `isImage: true`, length > 1000  
❌ **Bad:** `isImage: false` or length < 100

### 5. Schema Mapping (📋)
```javascript
Schema 0: { name: 'signature_1', type: 'image', hasInput: true }
```
✅ **Good:** `hasInput: true`, type is `'image'`  
❌ **Bad:** `hasInput: false`

## Common Problems & Quick Fixes

| Problem | Log Indicator | Quick Fix |
|---------|--------------|-----------|
| **No signatures appear** | `hasSignature_image: false` | Check signing process saves `signature_image` |
| **All fields use same signature** | Multiple fields → same signer | Check `signerId` assignment in template |
| **Signature field empty** | `hasInput: false` | Check field name matches between schema and inputs |
| **Wrong signer's signature** | Signer mapping logs show mismatch | Verify `schema_signer_id` matches `signerId` |

## Quick Test

1. Create request with 2 signers
2. Add 2 signature fields (one per signer)
3. Both sign
4. Check logs for:
   - ✅ 2 fields with different `signerId`
   - ✅ 2 signers with matching `schema_id`
   - ✅ 2 populated inputs with `isImage: true`
   - ✅ 2 schemas with `hasInput: true`

## Log Search Commands

```bash
# Find schema fields
grep "📋 Schema fields details" logs.txt -A 20

# Find signer mapping
grep "👥 Available signers" logs.txt -A 10

# Find signature data issues
grep "⚠️ No signature image" logs.txt

# Find empty fields
grep "⚠️ Field .* has null/undefined" logs.txt

# Find populated inputs
grep "📊 Populated inputs summary" logs.txt -A 20
```

## Decision Tree

```
Signatures not appearing?
│
├─ Check logs for "📋 Schema fields details"
│  │
│  ├─ signerId present? ─ NO → Recreate template with signer assignment
│  └─ signerId present? ─ YES → Continue
│
├─ Check logs for "👥 Available signers"
│  │
│  ├─ schema_id matches signerId? ─ NO → Fix signer creation logic
│  └─ schema_id matches signerId? ─ YES → Continue
│
├─ Check logs for "📦 Parsed signature data"
│  │
│  ├─ hasSignature_image: true? ─ NO → Fix signing process
│  └─ hasSignature_image: true? ─ YES → Continue
│
├─ Check logs for "📊 Populated inputs"
│  │
│  ├─ isImage: true? ─ NO → Check getFieldValue function
│  └─ isImage: true? ─ YES → Continue
│
└─ Check logs for "Schema-to-Input Mapping"
   │
   ├─ hasInput: true? ─ NO → Field name mismatch
   └─ hasInput: true? ─ YES → Check PDF generation library
```

## Files to Check

| Issue | File to Check |
|-------|--------------|
| Template creation | `src/components/features/drive/document-designer-wrapper.tsx` |
| Signer mapping | `src/app/api/signature-requests/route.ts` |
| Signing process | `src/app/api/signature-requests/sign/route.ts` |
| PDF generation | `src/app/api/signature-requests/generate-pdf/route.ts` |
| Field value mapping | `getFieldValue` function in generate-pdf route |

## Emergency Checklist

- [ ] Logs show schema fields with `signerId`
- [ ] Logs show signers with `schema_id`
- [ ] Logs show `hasSignature_image: true`
- [ ] Logs show `isImage: true` for signature fields
- [ ] Logs show `hasInput: true` for all fields
- [ ] No warnings about missing signature images
- [ ] No warnings about null/undefined values
- [ ] Final PDF contains all signatures

If all checked ✅ but signatures still missing → Check PDF library compatibility

