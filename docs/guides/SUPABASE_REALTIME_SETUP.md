# Supabase Realtime Setup Guide

## 📋 Prerequisites

Before the realtime auto-refresh feature works, you need to enable Realtime in your Supabase project.

---

## 🔧 Step-by-Step Setup

### **Step 1: Enable Realtime Replication**

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://app.supabase.com
   - Select your project

2. **Navigate to Database → Replication**
   - Click on "Database" in the left sidebar
   - Click on "Replication" tab

3. **Enable Replication for Tables**

   Enable replication for these tables:
   
   #### **Table 1: `signing_requests`**
   - Find `signing_requests` in the list
   - Toggle the switch to enable replication
   - This allows real-time updates for sent requests

   #### **Table 2: `signing_request_signers`**
   - Find `signing_request_signers` in the list
   - Toggle the switch to enable replication
   - This allows real-time updates for received requests

4. **Save Changes**
   - Changes are applied immediately
   - No restart required

---

### **Step 2: Verify RLS Policies**

Realtime respects Row Level Security (RLS) policies. Ensure your policies allow SELECT access.

#### **Check `signing_requests` Policies:**

```sql
-- Policy for users to view their own sent requests
CREATE POLICY "Users can view their own signing requests"
ON signing_requests
FOR SELECT
USING (auth.uid() = initiated_by);
```

#### **Check `signing_request_signers` Policies:**

```sql
-- Policy for users to view requests where they are signers
CREATE POLICY "Users can view their signer records"
ON signing_request_signers
FOR SELECT
USING (auth.email() = signer_email);
```

---

### **Step 3: Test Realtime Connection**

1. **Open Browser Console**
   - Press F12 or right-click → Inspect
   - Go to Console tab

2. **Navigate to Sign Inbox**
   - Go to `/sign-inbox` in your app
   - Look for these console messages:

   ```
   📡 Setting up Realtime subscriptions for user: [user-id]
   📡 Sent requests channel status: SUBSCRIBED
   📡 Received requests channel status: SUBSCRIBED
   ```

3. **Check Connection Status**
   - Look for the "Live" badge (green) in the header
   - If it shows "Offline" (gray), check the troubleshooting section

---

## 🧪 Testing the Setup

### **Test 1: Single Tab Update**

1. Sign a document
2. Watch for "Generating PDF..." badge
3. Wait for PDF generation
4. Verify badge disappears
5. Click preview button
6. Verify final PDF opens

**Expected Console Output:**
```
📡 Realtime update for sent request: { id: '...', final_pdf_url: '...' }
✅ Fetched complete updated request: { ... }
🎉 Final PDF is ready! https://...
```

---

### **Test 2: Multi-Tab Update**

1. Open Sign Inbox in two browser tabs
2. Sign a document in Tab 1
3. Watch Tab 2 for automatic update
4. Verify both tabs show the same data

**Expected Behavior:**
- Both tabs update simultaneously
- No manual refresh needed
- Connection status shows "Live" in both tabs

---

### **Test 3: Reconnection**

1. Disconnect internet
2. Verify status shows "Offline"
3. Reconnect internet
4. Verify status shows "Live" again

**Expected Console Output:**
```
📡 Sent requests channel status: CLOSED
📡 Sent requests channel status: SUBSCRIBED
```

---

## 🔍 Troubleshooting

### **Problem: Connection Status Shows "Offline"**

#### **Solution 1: Check Realtime is Enabled**
1. Go to Supabase Dashboard
2. Database → Replication
3. Verify `signing_requests` and `signing_request_signers` are enabled

#### **Solution 2: Check Browser Console**
Look for error messages:
```
Error: Realtime is not enabled for this project
```

**Fix:** Enable Realtime in Supabase Dashboard → Settings → API

#### **Solution 3: Check RLS Policies**
```sql
-- Test if you can query the tables
SELECT * FROM signing_requests WHERE initiated_by = auth.uid();
SELECT * FROM signing_request_signers WHERE signer_email = auth.email();
```

If queries fail, update RLS policies.

---

### **Problem: Updates Not Appearing**

#### **Check 1: Verify Subscription**
Console should show:
```
📡 Sent requests channel status: SUBSCRIBED
📡 Received requests channel status: SUBSCRIBED
```

If not subscribed, check:
- User is authenticated
- User ID and email are valid
- Network connection is stable

#### **Check 2: Verify Database Changes**
1. Go to Supabase Dashboard → Table Editor
2. Find the signing request
3. Verify `final_pdf_url` is populated
4. Check `updated_at` timestamp

#### **Check 3: Use Manual Refresh**
- Click the refresh button in the header
- This bypasses realtime and fetches fresh data

---

### **Problem: "Generating PDF..." Badge Stuck**

#### **Possible Causes:**
1. PDF generation failed
2. Database not updated
3. Realtime event missed

#### **Solutions:**

**1. Check Server Logs:**
```bash
# Look for PDF generation errors
grep "PDF generation" /var/log/app.log
```

**2. Check Database:**
```sql
SELECT id, status, final_pdf_url, updated_at 
FROM signing_requests 
WHERE id = 'your-request-id';
```

**3. Manual Refresh:**
- Click the refresh button
- This will fetch the latest data

**4. Retry PDF Generation:**
- If `final_pdf_url` is null, PDF generation may have failed
- Check the API logs for errors
- You may need to manually trigger regeneration

---

## 📊 Monitoring Realtime Usage

### **Supabase Dashboard:**

1. **Go to Settings → Usage**
   - View Realtime connections
   - Monitor bandwidth usage
   - Check for rate limits

2. **Expected Usage:**
   - 2 connections per active user (sent + received channels)
   - Minimal bandwidth (only change events)
   - No polling overhead

### **Browser Console:**

Monitor these logs:
```
📡 Setting up Realtime subscriptions
📡 Sent requests channel status: SUBSCRIBED
📡 Received requests channel status: SUBSCRIBED
📡 Realtime update for sent request: { ... }
✅ Fetched complete updated request: { ... }
🎉 Final PDF is ready!
🔌 Cleaning up Realtime subscriptions
```

---

## 🔐 Security Considerations

### **1. Row Level Security (RLS)**

Realtime respects RLS policies. Users can only receive updates for:
- Requests they initiated (`initiated_by = user.id`)
- Requests where they are signers (`signer_email = user.email`)

### **2. Authentication**

Realtime requires valid authentication:
- User must be logged in
- Access token must be valid
- Session must be active

### **3. Data Filtering**

Server-side filtering prevents unauthorized access:
```typescript
// Only user's own requests
filter: `initiated_by=eq.${user.id}`

// Only requests where user is signer
filter: `signer_email=eq.${user.email}`
```

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] Realtime enabled in Supabase Dashboard
- [ ] Replication enabled for `signing_requests`
- [ ] Replication enabled for `signing_request_signers`
- [ ] RLS policies verified and tested
- [ ] Connection status indicator working
- [ ] Manual refresh button working
- [ ] Multi-tab updates tested
- [ ] Reconnection tested
- [ ] Error handling verified
- [ ] Console logs reviewed
- [ ] Performance monitored
- [ ] Security policies reviewed

---

## 📈 Performance Tips

### **1. Optimize Subscriptions**

Current implementation:
- ✅ Filters by user ID/email
- ✅ Only fetches when needed
- ✅ Cleans up on unmount

### **2. Monitor Connection Count**

- Each user = 2 connections (sent + received)
- 100 users = 200 connections
- Supabase free tier: 200 concurrent connections
- Supabase Pro tier: 500+ concurrent connections

### **3. Reduce Event Frequency**

If you have high-frequency updates:
- Consider debouncing updates
- Batch multiple changes
- Use manual refresh for non-critical updates

---

## 🆘 Support

### **Supabase Documentation:**
- Realtime: https://supabase.com/docs/guides/realtime
- Replication: https://supabase.com/docs/guides/realtime/postgres-changes
- RLS: https://supabase.com/docs/guides/auth/row-level-security

### **Common Issues:**
- Realtime not enabled: Enable in Dashboard → Settings → API
- RLS blocking access: Update policies to allow SELECT
- Connection limit reached: Upgrade Supabase plan

---

## ✅ Verification

After setup, you should see:

1. **In Supabase Dashboard:**
   - ✅ Realtime enabled
   - ✅ Replication enabled for both tables
   - ✅ RLS policies allow SELECT

2. **In Browser:**
   - ✅ "Live" status (green) in header
   - ✅ Console shows "SUBSCRIBED" status
   - ✅ Automatic updates working

3. **In Testing:**
   - ✅ Single tab updates automatically
   - ✅ Multi-tab updates simultaneously
   - ✅ Reconnection works after disconnect
   - ✅ Manual refresh works as backup

---

## 🎉 Success!

If all checks pass, your Supabase Realtime setup is complete and the preview button will automatically refresh when final PDFs are generated!

**Next Steps:**
1. Deploy to production
2. Monitor usage in Supabase Dashboard
3. Gather user feedback
4. Consider adding toast notifications for better UX

