# 🔍 Signature Placement Debugging Guide

## Problem Statement
Signatures are not being placed in the final generated PDF for:
1. **Single signature** - Signature not appearing at all
2. **Multi-signature** - Sometimes only one signer's data (name and signature) appears for all signature fields

## Root Cause Analysis

### How the System Works

#### 1. **Template Creation Phase**
When creating a PDF template with signature fields:
- User uploads a PDF
- User adds signature fields using PDFme Designer
- Each field has:
  - `name`: Unique identifier (e.g., "signature_1", "name_1")
  - `type`: Field type ("signature", "text", "date")
  - `signerId`: Which signer this field belongs to (e.g., "signer_1", "signer_2")
  - `position`: Where on the PDF the field appears

Example schema:
```json
{
  "name": "signature_1",
  "type": "signature",
  "signerId": "signer_1",
  "position": { "x": 100, "y": 200, "width": 150, "height": 50 }
}
```

#### 2. **Signature Request Creation**
When sending a document for signature:
- System creates a `signing_request` record
- Creates `signing_request_signers` records for each signer
- Maps each signer to their `schema_signer_id` (e.g., "signer_1", "signer_2")

#### 3. **Signing Phase**
When a signer signs:
- Signature data is saved to `signing_request_signers.signature_data` as JSON:
```json
{
  "signer_name": "John Doe",
  "signature_image": "data:image/png;base64,...",
  "signed_at": "2024-01-15T10:30:00Z",
  "location": {...},
  "profile_location": {...}
}
```

#### 4. **PDF Generation Phase** (WHERE THE ISSUE OCCURS)
When all signers complete:
- System loads the template with schemas
- For each schema field, it needs to:
  1. Find the correct signer based on `field.signerId`
  2. Extract their signature data
  3. Map the signature image to the field name
  4. Generate the final PDF with all signatures placed

### The Mapping Problem

The issue is in the `populateSchemaWithSignatures` function. It needs to correctly map:

```
Schema Field → Signer → Signature Data → Field Value
```

**Current Mapping Logic:**
1. Match by `schema_signer_id` (PRIMARY - most reliable)
2. Fallback to `signer_email`
3. Fallback to `signer_id`
4. Fallback to `signing_order`
5. Last resort: distribute among signed signers

## Debugging Steps Added

### 1. Schema Field Logging
Added logging to show all schema fields and their properties:
```typescript
console.log('📋 Schema fields details:')
schemas[0]?.forEach((field: any, index: number) => {
  console.log(`  Field ${index}:`, {
    name: field.name,
    type: field.type,
    signerId: field.signerId,
    signer_email: field.signer_email,
    position: field.position
  })
})
```

### 2. Signer Data Logging
Shows available signers and their data:
```typescript
console.log(`👥 Available signers:`, signers.map(s => ({
  email: s.signer_email,
  order: s.signing_order,
  schema_id: s.schema_signer_id,
  status: s.status || s.signer_status
})))
```

### 3. Signature Data Parsing Logging
Shows what data is available for each signer:
```typescript
console.log(`📦 Parsed signature data for ${fieldName}:`, {
  hasSigner_name: !!signatureData.signer_name,
  hasSignature_image: !!signatureData.signature_image,
  hasSignature: !!signatureData.signature,
  keys: Object.keys(signatureData)
})
```

### 4. Populated Inputs Logging
Shows what values were actually set for each field:
```typescript
console.log('📊 Populated inputs summary:')
Object.keys(populatedInputs).forEach(key => {
  const value = populatedInputs[key]
  console.log(`  ${key}:`, {
    type: typeof value,
    isImage: value?.startsWith?.('data:image') || false,
    length: value?.length || 0,
    preview: typeof value === 'string' ? value.substring(0, 50) + '...' : value
  })
})
```

### 5. Schema-to-Input Mapping Logging
Shows which schema fields have corresponding input values:
```typescript
serverSchemas[0]?.forEach((field: any, index: number) => {
  console.log(`  Schema ${index}:`, {
    name: field.name,
    type: field.type,
    originalType: schemas[0][index]?.type,
    hasInput: !!populatedInputs[field.name],
    inputPreview: populatedInputs[field.name]?.substring?.(0, 30) + '...'
  })
})
```

## How to Debug

### Step 1: Trigger PDF Generation
1. Create a signature request (single or multi-signer)
2. Complete all signatures
3. Check the server logs

### Step 2: Analyze the Logs

Look for these key indicators:

#### ✅ **Good Signs:**
- All schema fields have `signerId` values
- Each signer has `schema_signer_id` matching a field's `signerId`
- Signature data contains `signature_image` field
- Populated inputs show image data for signature fields
- Each schema field has a corresponding input value

#### ❌ **Problem Signs:**
- Schema fields missing `signerId`
- Signers missing `schema_signer_id`
- Signature data has `signature` but not `signature_image`
- Populated inputs missing values for some fields
- Multiple fields mapped to the same signer

### Step 3: Common Issues and Fixes

#### Issue 1: Field Names Don't Match
**Symptom:** Schema has fields but no inputs populated
**Cause:** Field names in schema don't match the keys in populatedInputs
**Fix:** Ensure field.name is used consistently

#### Issue 2: Wrong Signature Field Name
**Symptom:** Signature data exists but not used
**Cause:** Looking for `signature` instead of `signature_image`
**Fix:** Update getFieldValue to check both:
```typescript
case 'signature':
  return signatureData.signature_image || signatureData.signature || ''
```

#### Issue 3: Signer Mapping Fails
**Symptom:** All fields use first signer's data
**Cause:** `schema_signer_id` not set or doesn't match `field.signerId`
**Fix:** Ensure signers are created with correct `schema_signer_id`

#### Issue 4: Signature Type Not Converted
**Symptom:** Signatures don't render in PDF
**Cause:** Server-side PDF generation doesn't support 'signature' type
**Fix:** Convert to 'image' type (already implemented)

## Testing Checklist

- [ ] Single signature request - signature appears in final PDF
- [ ] Multi-signature (2 signers) - both signatures appear
- [ ] Multi-signature (3+ signers) - all signatures appear
- [ ] Each signature appears in correct position
- [ ] Signer names appear correctly
- [ ] Dates appear correctly
- [ ] Check server logs for any warnings

## Files Modified

1. `src/app/api/signature-requests/generate-pdf/route.ts` - Added comprehensive logging
2. `src/lib/pdf-generation-pdfme.ts` - Added signature data logging

## Next Steps

1. Run a test signature request
2. Review the logs to identify the exact point of failure
3. Based on logs, apply the appropriate fix from the common issues section
4. Re-test to verify the fix works

