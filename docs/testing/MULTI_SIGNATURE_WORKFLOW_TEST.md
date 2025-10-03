# Multi-Signature Workflow Test Guide

## Overview
This guide helps you test the complete multi-signature workflow to ensure all fixes are working correctly.

## Prerequisites

### 1. Setup the 'signed' Storage Bucket
First, run the SQL script to create the missing 'signed' bucket:

```sql
-- Run this in your Supabase SQL Editor
-- File: SIGNED_BUCKET_SETUP.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('signed', 'signed', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf'];
```

### 2. Verify Storage Buckets
Check that all required buckets exist:
- ✅ documents
- ✅ signatures  
- ✅ templates
- ✅ files
- ✅ qrcodes
- ✅ avatars
- ✅ **signed** (newly created)

## Test Scenarios

### Test 1: Multi-Signature Parallel Mode

1. **Create a Multi-Signature Request**
   - Upload a document
   - Add 2-3 signers with different email addresses
   - Set signing mode to "Parallel"
   - Send the request

2. **First Signer Signs**
   - Open the signing link as the first signer
   - Verify view tracking: Check that "Viewed" count increases to 1/X
   - Complete the signature
   - Verify signature data is saved to JSON
   - Check that status shows "In Progress"

3. **Second Signer Signs**
   - Open the signing link as the second signer
   - Verify view tracking: Check that "Viewed" count increases to 2/X
   - Complete the signature
   - Verify signature data is saved to JSON
   - If this is the last signer, check final PDF generation

4. **Final PDF Generation (All Signers Complete)**
   - Verify final PDF is generated with ALL signers' data
   - Check that final PDF is saved to 'signed' bucket
   - Verify signing request status changes to "Completed"
   - Confirm final_pdf_url is populated

### Test 2: Multi-Signature Sequential Mode

1. **Create a Sequential Multi-Signature Request**
   - Upload a document
   - Add 2-3 signers with signing order (1, 2, 3)
   - Set signing mode to "Sequential"
   - Send the request

2. **First Signer (Order 1) Signs**
   - Only the first signer should be able to sign initially
   - Complete the signature
   - Verify next signer is notified (when implemented)

3. **Second Signer (Order 2) Signs**
   - Complete the signature
   - Verify progression to next signer

4. **Final Signer Signs**
   - Complete the signature
   - Verify final PDF generation with all signers' data

### Test 3: View Tracking Verification

1. **Check View Status Display**
   - Open a multi-signature request
   - Verify the Info popup shows correct "X/Y signers viewed"
   - Should NOT show "Pending – 0/2 signers viewed"

2. **Track Views Correctly**
   - Have each signer view the document
   - Verify view count increases correctly
   - Check database: `signing_request_signers.viewed_at` should be populated

## Expected Results

### ✅ Working Multi-Signature Flow
- Each signer's data (name, signature) is saved to JSON
- View tracking works correctly and displays accurate counts
- Final PDF generation includes ALL signers' signatures
- Final PDF is saved to 'signed' bucket
- Signing request status updates correctly
- Both parallel and sequential modes work

### ❌ Previous Issues (Should be Fixed)
- ~~Final PDF not saved to signed bucket~~
- ~~Only first signer's data in final PDF~~
- ~~View tracking showing "0/2 signers viewed"~~
- ~~Multi-signature completion not triggering PDF generation~~

## Database Verification

### Check Signing Request Progress
```sql
SELECT 
    id,
    title,
    status,
    signed_count,
    viewed_signers,
    completed_signers,
    final_pdf_url,
    completed_at
FROM signing_requests 
WHERE id = 'your-request-id';
```

### Check Individual Signer Status
```sql
SELECT 
    signer_email,
    signer_name,
    status,
    signer_status,
    viewed_at,
    signed_at,
    signature_data IS NOT NULL as has_signature_data
FROM signing_request_signers 
WHERE signing_request_id = 'your-request-id'
ORDER BY signing_order;
```

### Check Signed Bucket Contents
```sql
SELECT 
    name,
    created_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'signed'
ORDER BY created_at DESC;
```

## Troubleshooting

### Issue: Signed bucket doesn't exist
**Solution**: Run the `SIGNED_BUCKET_SETUP.sql` script

### Issue: View tracking not working
**Check**: 
- API calls to `/api/signature-requests/track-view`
- Database updates in `signing_request_signers.viewed_at`
- Frontend display in progress stepper

### Issue: Final PDF missing signatures
**Check**:
- Each signer's `signature_data` in database
- PDF generation logs for multi-signer processing
- Template schema field assignments

### Issue: PDF not saved to signed bucket
**Check**:
- Bucket permissions and policies
- API logs in `/api/signature-requests/generate-pdf`
- Storage upload errors

## Success Criteria

✅ **Multi-signature workflow is complete when:**
1. All signers can view and sign documents
2. View tracking displays correct counts
3. Each signer's data is preserved in JSON
4. Final PDF contains all signatures
5. Final PDF is saved to 'signed' bucket
6. Both parallel and sequential modes work
7. Status updates correctly throughout the process

## Next Steps

After successful testing:
1. Document any remaining issues
2. Test edge cases (declined signatures, expired requests)
3. Implement notification system for sequential signing
4. Add audit logging for compliance
5. Performance testing with larger numbers of signers
