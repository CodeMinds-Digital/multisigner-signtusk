# 📤 How to Share Documents with Anyone

Complete guide on how to upload and share documents using the Send module.

---

## 🎯 Quick Start

### **Method 1: Upload & Share (Recommended)**

1. **Go to Upload Page**
   - Navigate to `/send/upload`
   - Or click "Send" in sidebar → "Upload Document"

2. **Upload Your Document**
   - Drag & drop your PDF file
   - Or click to browse and select
   - Wait for upload to complete ✅

3. **Create Share Link** (Modal opens automatically)
   - Configure your sharing settings
   - Click "Create Share Link"
   - Copy the generated URL

4. **Share with Anyone**
   - Send the URL via:
     - Email
     - WhatsApp
     - Slack
     - SMS
     - Any messaging app
   - Recipients click the link to view

---

### **Method 2: Share from Document Library**

1. **Go to Documents Page**
   - Navigate to `/send/documents`
   - Or click "Send" in sidebar → "Documents"

2. **Find Your Document**
   - Browse your uploaded documents
   - Use search to find specific files

3. **Click Share Button**
   - Click the "Share" icon on any document
   - Modal opens with sharing options

4. **Create & Share Link**
   - Configure settings
   - Create link
   - Copy and share the URL

---

## ⚙️ Share Link Settings

### **Basic Settings**

| Setting | Description | Example |
|---------|-------------|---------|
| **Link Name** | Custom name for the link | "Q4 Report for Client" |
| **Description** | Optional description | "Financial report for review" |
| **Custom Slug** | Custom URL path | `my-report` → `/v/my-report` |

### **Security Settings**

| Setting | Description | When to Use |
|---------|-------------|-------------|
| **Password Protection** | Require password to view | Confidential documents |
| **Expiration Date** | Link expires after date | Time-sensitive content |
| **View Limit** | Max number of views | Limited access control |
| **Require Email** | Visitor must enter email | Track who views |
| **Require NDA** | Visitor must accept NDA | Legal protection |

### **Access Settings**

| Setting | Description | Default |
|---------|-------------|---------|
| **Allow Download** | Let visitors download PDF | ✅ Enabled |

---

## 📋 Step-by-Step Example

### **Scenario: Share a Contract with a Client**

**Step 1: Upload the Contract**
```
1. Go to /send/upload
2. Upload "Client_Contract_2024.pdf"
3. Wait for success message
```

**Step 2: Configure Share Link**
```
Link Name: "Client Contract - Review Required"
Description: "Please review and sign by Friday"
Password: "SecurePass123"
Expiration: 7 days from now
Require Email: ✅ Yes
Require NDA: ✅ Yes
Allow Download: ✅ Yes
```

**Step 3: Create Link**
```
Click "Create Share Link"
Copy the generated URL:
https://yourdomain.com/v/client-contract-review
```

**Step 4: Share with Client**
```
Email to client:
---
Hi John,

Please review the contract here:
https://yourdomain.com/v/client-contract-review

Password: SecurePass123

This link expires in 7 days.

Best regards
---
```

**Step 5: Track Engagement**
```
1. Go to /send/analytics/[documentId]
2. See who viewed, when, and for how long
3. Check if they downloaded the document
```

---

## 🔗 Share URL Format

### **Standard Link**
```
https://yourdomain.com/v/[link-id]
```

### **Custom Slug Link**
```
https://yourdomain.com/v/[your-custom-slug]
```

### **Example URLs**
```
https://yourdomain.com/v/abc123xyz
https://yourdomain.com/v/q4-financial-report
https://yourdomain.com/v/client-proposal-2024
```

---

## 👥 Recipient Experience

### **What Recipients See**

1. **Click the Link**
   - Opens in browser
   - No login required

2. **Enter Password** (if set)
   - Simple password prompt
   - One-time entry

3. **Provide Email** (if required)
   - Enter email address
   - Validates format

4. **Accept NDA** (if required)
   - Read NDA terms
   - Click "I Accept"

5. **View Document**
   - PDF viewer opens
   - Can zoom, scroll, navigate
   - Download button (if enabled)

---

## 📊 Track Document Engagement

### **Analytics Dashboard**

**View Analytics:**
```
1. Go to /send/documents
2. Click "Analytics" icon on any document
3. See detailed metrics
```

**Metrics Available:**
- Total views
- Unique visitors
- Average view time
- Download count
- Geographic location
- Device type
- Browser used
- Engagement score

---

## 🎨 Sharing Best Practices

### **✅ Do's**

1. **Use Descriptive Names**
   - ✅ "Q4 Financial Report - Board Review"
   - ❌ "Document 1"

2. **Set Appropriate Expiration**
   - Contracts: 30 days
   - Proposals: 14 days
   - Temporary: 7 days

3. **Use Password for Sensitive Docs**
   - Financial reports
   - Legal documents
   - Confidential information

4. **Require Email for Tracking**
   - Know who accessed
   - Follow up with viewers

5. **Enable NDA for Legal Protection**
   - Contracts
   - Proprietary information
   - Trade secrets

### **❌ Don'ts**

1. **Don't Share Passwords in Same Message**
   - Send password separately
   - Use different channel

2. **Don't Set Unlimited Expiration**
   - Always set expiration date
   - Review and extend if needed

3. **Don't Forget to Track**
   - Check analytics regularly
   - Follow up with non-viewers

---

## 🔒 Security Features

### **Built-in Protection**

| Feature | Protection Level | Use Case |
|---------|-----------------|----------|
| Password | 🔒🔒🔒 High | Confidential docs |
| Expiration | 🔒🔒 Medium | Time-sensitive |
| View Limit | 🔒 Low | Limited access |
| Email Required | 🔒🔒 Medium | Tracking |
| NDA Required | 🔒🔒🔒 High | Legal protection |

---

## 📱 Sharing Channels

### **Recommended Channels**

1. **Email** ⭐⭐⭐⭐⭐
   - Professional
   - Trackable
   - Permanent record

2. **WhatsApp** ⭐⭐⭐⭐
   - Quick delivery
   - Read receipts
   - Mobile-friendly

3. **Slack** ⭐⭐⭐⭐
   - Team collaboration
   - Searchable
   - Integrated

4. **SMS** ⭐⭐⭐
   - Immediate delivery
   - High open rate
   - Simple

5. **LinkedIn** ⭐⭐⭐
   - Professional network
   - Business context
   - Credible

---

## 🎯 Common Use Cases

### **1. Client Proposals**
```
Settings:
- Password: No
- Expiration: 14 days
- Require Email: Yes
- Allow Download: Yes
```

### **2. Legal Contracts**
```
Settings:
- Password: Yes
- Expiration: 30 days
- Require Email: Yes
- Require NDA: Yes
- Allow Download: Yes
```

### **3. Internal Reports**
```
Settings:
- Password: Yes
- Expiration: 7 days
- Require Email: No
- Allow Download: No
```

### **4. Marketing Materials**
```
Settings:
- Password: No
- Expiration: 90 days
- Require Email: Yes
- Allow Download: Yes
```

---

## 🆘 Troubleshooting

### **Link Not Working**

**Check:**
- ✅ Link hasn't expired
- ✅ View limit not reached
- ✅ Correct password entered
- ✅ Link is active

### **Can't Create Link**

**Solutions:**
- Refresh the page
- Check document uploaded successfully
- Verify you're logged in
- Clear browser cache

### **Analytics Not Showing**

**Reasons:**
- No one has viewed yet
- Views are processing (wait 1 minute)
- Browser blocking tracking
- Ad blocker enabled

---

## 🚀 Quick Reference

### **Upload → Share → Track**

```
1. Upload: /send/upload
2. Configure: Set password, expiration, etc.
3. Create: Click "Create Share Link"
4. Copy: Copy the URL
5. Share: Send via email/chat/etc.
6. Track: View analytics dashboard
```

### **Keyboard Shortcuts**

| Action | Shortcut |
|--------|----------|
| Upload Page | `Ctrl/Cmd + U` |
| Documents Page | `Ctrl/Cmd + D` |
| Copy Link | `Ctrl/Cmd + C` |
| Close Modal | `Esc` |

---

## ✅ Success Checklist

Before sharing, verify:

- [ ] Document uploaded successfully
- [ ] Link name is descriptive
- [ ] Security settings configured
- [ ] Expiration date set
- [ ] Password created (if needed)
- [ ] Link tested and working
- [ ] Analytics tracking enabled
- [ ] Recipient instructions prepared

---

## 📞 Need Help?

**Resources:**
- Documentation: `/docs/sendtusk`
- Support: support@yourdomain.com
- Video Tutorial: [Link to video]

**Common Questions:**
- How long do links last? → Set your own expiration
- Can I revoke a link? → Yes, from Documents page
- Is it secure? → Yes, with password & NDA options
- Can I track views? → Yes, detailed analytics available

---

**Happy Sharing! 🎉**

