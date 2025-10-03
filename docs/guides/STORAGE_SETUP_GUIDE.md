# Storage Setup Guide for Supabase

The error "relation storage.policies does not exist" means Storage is not enabled. Follow these steps:

## Quick Fix Steps:

### 1. Run Simple RLS Fix First
Run `SIMPLE_RLS_FIX.sql` in Supabase SQL Editor - this fixes the database table policies.

### 2. Enable Storage in Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `signtuskfinal`
3. Click "Storage" in left sidebar
4. Click "Enable Storage" if not already enabled

### 3. Create Two Buckets Manually

**Documents Bucket:**
- Name: `documents`
- Public: `false`
- File size limit: `50MB`
- Allowed MIME types: `application/pdf`

**Templates Bucket:**
- Name: `templates`
- Public: `false`
- File size limit: `10MB`
- Allowed MIME types: `application/json`

### 4. Set Bucket Policies

For each bucket, go to Policies tab and add these policies:

**For documents bucket:**
```sql
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert own documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own documents" ON storage.objects
FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents" ON storage.objects
FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**For templates bucket:**
```sql
CREATE POLICY "Users can view own templates" ON storage.objects
FOR SELECT USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert own templates" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own templates" ON storage.objects
FOR UPDATE USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own templates" ON storage.objects
FOR DELETE USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 5. Test
Try uploading a document again. The RLS error should be resolved.

## File Structure
Files will be organized as:
```
documents/{user_id}/{filename}.pdf
templates/{user_id}/{document_id}-template.json
```

This ensures each user can only access their own files.
