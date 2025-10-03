# Document Management System Setup Guide

## Quick Setup Instructions

### 1. Database Setup

**Option A: Safe Setup (Recommended - Preserves Existing Data)**
Run the safe setup that preserves existing data and handles conflicts:

```sql
-- Copy and paste the contents of DOCUMENT_MANAGEMENT_SAFE_SETUP.sql
-- into your Supabase SQL Editor and execute it
```

**File Location:** `signtusk-nextjs/DOCUMENT_MANAGEMENT_SAFE_SETUP.sql`

**Option B: Full Clean Setup**
If you want a completely fresh setup (⚠️ **Warning: This will drop existing document_templates table**):

```sql
-- Copy and paste the contents of DOCUMENT_MANAGEMENT_SETUP.sql
-- into your Supabase SQL Editor and execute it
```

**File Location:** `signtusk-nextjs/DOCUMENT_MANAGEMENT_SETUP.sql`

**Option C: Minimal Setup Only**
If you encounter any conflicts, use the minimal setup:

```sql
-- Copy and paste the contents of DOCUMENT_MANAGEMENT_MINIMAL_SETUP.sql
-- into your Supabase SQL Editor and execute it
```

**File Location:** `signtusk-nextjs/DOCUMENT_MANAGEMENT_MINIMAL_SETUP.sql`

Then follow the manual storage setup guide: `MANUAL_STORAGE_SETUP.md`

This will create:
- ✅ `document_templates` table with proper schema
- ✅ All required storage buckets (documents, signatures, templates, etc.)
- ✅ Row Level Security (RLS) policies for data isolation
- ✅ Storage policies for secure file access
- ✅ Performance indexes

### 2. Environment Variables

Ensure your `.env.local` file has the correct Supabase configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Storage Buckets Verification

After running the SQL, verify these buckets exist in your Supabase Storage:

- 📁 **documents** (Private) - PDF files and templates
- 📁 **signatures** (Private) - Signature files  
- 📁 **templates** (Private) - JSON templates
- 📁 **files** (Private) - General files
- 📁 **qrcodes** (Private) - QR code images
- 📁 **avatars** (Public) - User profile pictures

### 4. Test the Implementation

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Document Management:**
   - Open http://localhost:3000
   - Login to your account
   - Click "Document Management" in the sidebar

3. **Test the workflow:**
   - Click "Add Document"
   - Fill in document details
   - Upload a PDF file
   - Verify file appears in Supabase Storage
   - Open the PDF Designer
   - Add some schemas (text fields, signatures, etc.)
   - Save the template
   - Verify document status changes to "Completed"

## Troubleshooting

### Common Issues:

#### 1. SQL Syntax Errors
- **Issue:** Error running DOCUMENT_MANAGEMENT_SETUP.sql
- **Solution:** Copy the SQL content exactly as provided, ensure no extra characters

#### 2. Storage Bucket Errors
- **Issue:** "Bucket does not exist" errors
- **Solution:** Manually create buckets in Supabase Dashboard > Storage if SQL creation fails

#### 3. RLS Policy Errors
- **Issue:** Users can't access their own documents
- **Solution:** Verify RLS policies are correctly applied and user is authenticated

#### 4. File Upload Errors
- **Issue:** PDF upload fails
- **Solution:** Check file size limits and MIME type restrictions in bucket settings

#### 5. Designer Loading Issues
- **Issue:** PDF Designer doesn't load
- **Solution:** Verify pdfme-complete package is properly installed and built

### Manual Storage Bucket Creation:

If the SQL bucket creation fails, create them manually in Supabase Dashboard:

1. Go to **Storage** in Supabase Dashboard
2. Create these buckets with settings:

**documents:**
- Public: ❌ No
- File size limit: 50 MB
- Allowed MIME types: `application/pdf`

**signatures:**
- Public: ❌ No  
- File size limit: 10 MB
- Allowed MIME types: `image/png, image/jpeg, image/svg+xml`

**templates:**
- Public: ❌ No
- File size limit: 50 MB
- Allowed MIME types: `application/json, application/pdf`

**files:**
- Public: ❌ No
- File size limit: 50 MB
- Allowed MIME types: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**qrcodes:**
- Public: ❌ No
- File size limit: 2 MB
- Allowed MIME types: `image/png, image/jpeg, image/svg+xml`

**avatars:**
- Public: ✅ Yes
- File size limit: 2 MB
- Allowed MIME types: `image/png, image/jpeg, image/gif, image/webp`

## Verification Checklist

After setup, verify these items:

### Database:
- [ ] `document_templates` table exists
- [ ] RLS is enabled on `document_templates`
- [ ] User can insert/select their own records
- [ ] Indexes are created for performance

### Storage:
- [ ] All 6 buckets exist (documents, signatures, templates, files, qrcodes, avatars)
- [ ] Bucket permissions are correctly set (private vs public)
- [ ] File size limits are appropriate
- [ ] MIME type restrictions are in place

### Application:
- [ ] Document Management tab appears in sidebar
- [ ] Add Document modal opens and works
- [ ] PDF upload succeeds and file appears in storage
- [ ] PDF Designer loads with uploaded document
- [ ] Schemas can be added and saved
- [ ] Document status updates correctly
- [ ] Document list shows all user documents

### Security:
- [ ] Users can only see their own documents
- [ ] File access requires authentication
- [ ] Signed URLs work for PDF preview
- [ ] Storage policies prevent unauthorized access

## Support

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs** for database/storage errors  
3. **Verify authentication** - user must be logged in
4. **Test with simple PDF** - ensure file is valid PDF format
5. **Check network tab** for failed API requests

## Success Indicators

When everything is working correctly, you should see:

- ✅ Clean document list interface
- ✅ Smooth document creation workflow
- ✅ PDF files uploading to Supabase Storage
- ✅ PDF Designer loading with uploaded documents
- ✅ Schemas saving and status updating
- ✅ Preview functionality working
- ✅ No console errors or failed network requests

The document management system is now ready for production use! 🎉
