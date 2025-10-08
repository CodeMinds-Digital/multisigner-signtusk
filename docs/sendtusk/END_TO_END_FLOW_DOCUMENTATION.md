# 📋 SendTusk End-to-End Flow Documentation
## Complete Document Sharing Flow with All Features

---

## 🎯 **Overview**

This document provides comprehensive end-to-end flow documentation for the SendTusk document sharing module, covering all features including expiry, custom views, access controls, analytics, and more.

---

## 🔄 **Complete Document Sharing Flow**

### **Phase 1: Document Upload & Preparation**

#### **1.1 Document Upload Process**
```
User Action: Upload Document
↓
Frontend: DocumentUpload Component
↓
API: POST /api/send/documents/upload
↓
Validation: File size, type, user authentication
↓
Storage: Upload to Supabase Storage (send-documents bucket)
↓
Database: Insert record in send_shared_documents table
↓
Response: Document ID and metadata
```

**Key Features:**
- ✅ File validation (size, type)
- ✅ Secure storage with unique file paths
- ✅ Version tracking support
- ✅ Thumbnail generation (for supported formats)

#### **1.2 Document Processing**
```sql
-- Database Record Created
INSERT INTO send_shared_documents (
  user_id,
  title,
  file_name,
  file_url,
  file_size,
  file_type,
  status,
  version_number
)
```

---

### **Phase 2: Link Creation & Configuration**

#### **2.1 Link Generation Process**
```
User Action: Create Share Link
↓
Frontend: CreateLinkModal Component
↓
API: POST /api/send/links/create
↓
Generate: Unique link ID (nanoid)
↓
Database: Insert in send_document_links table
↓
Access Controls: Configure restrictions
↓
Response: Shareable link with settings
```

#### **2.2 Available Link Settings**

**Basic Settings:**
- 🔗 **Custom Link Name**: User-friendly identifier
- 📅 **Expiration Date**: Auto-expire links
- 👁️ **View Limit**: Maximum number of views
- 🔒 **Password Protection**: Secure access

**Advanced Access Controls:**
- 📧 **Email Verification**: Require email confirmation
- 📝 **NDA Requirement**: Legal agreement acceptance
- 🌍 **Geographic Restrictions**: Country-based access
- 🖥️ **IP Restrictions**: Specific IP addresses
- 📱 **Device Restrictions**: Mobile/desktop only

**Viewer Permissions:**
- ⬇️ **Download Control**: Allow/prevent downloads
- 🖨️ **Print Control**: Allow/prevent printing
- 💧 **Watermarking**: Custom watermark text
- 📸 **Screenshot Prevention**: Browser-level protection

#### **2.3 Database Schema for Link Creation**
```sql
-- Main Link Record
INSERT INTO send_document_links (
  document_id,
  link_id,
  title,
  password_hash,
  expires_at,
  max_views,
  allow_download,
  require_email,
  require_nda,
  is_active
)

-- Access Controls (if advanced features used)
INSERT INTO send_link_access_controls (
  link_id,
  allowed_emails,
  allowed_domains,
  blocked_countries,
  allowed_ips,
  watermark_enabled,
  watermark_text
)
```

---

### **Phase 3: Document Sharing & Email Delivery**

#### **3.1 Email Sharing Process**
```
User Action: Send Email
↓
Frontend: Email form in CreateLinkModal
↓
API: POST /api/send/links/send-email
↓
Authentication: Verify user ownership
↓
Email Service: Send via Resend API
↓
Database: Log email in send_link_emails
↓
Response: Success confirmation
```

#### **3.2 Email Features**

**Email Content:**
- 📄 Document title and description
- 👤 Sender name and custom message
- 🔗 Secure access link
- 🔒 Password (if required)
- ⏰ Expiration notice
- 👁️ View limit information
- 📋 Access requirements (email/NDA)

**Custom Branding:**
- 🎨 Custom logo and colors
- 🏢 Company branding
- 📧 Custom email templates
- 🌐 Custom domain support

#### **3.3 Email Template Structure**
```typescript
interface DocumentShareEmail {
  to: string
  documentTitle: string
  shareUrl: string
  senderName: string
  message?: string
  password?: string
  expiresAt?: string
  viewLimit?: number
  requiresEmail?: boolean
  requiresNda?: boolean
  customBranding?: {
    logoUrl?: string
    brandColor?: string
    companyName?: string
  }
}
```

---

### **Phase 4: Public Document Access**

#### **4.1 Access Flow with All Gates**
```
Visitor: Clicks share link
↓
Public Viewer: /v/[linkId]
↓
Validation: Check link status, expiry, view limits
↓
Gate 1: Password Protection (if enabled)
↓
Gate 2: Email Verification (if enabled)
↓
Gate 3: NDA Acceptance (if enabled)
↓
Gate 4: Geographic/IP Restrictions
↓
Document Viewer: Display with controls
↓
Analytics: Track all interactions
```

#### **4.2 Access Control Gates**

**Gate 1: Password Protection**
```typescript
// Password verification
if (link.password_hash) {
  const isValid = await SendPasswordService.verifyPassword(
    password, 
    link.password_hash
  )
  if (!isValid) {
    return { error: 'Incorrect password' }
  }
}
```

**Gate 2: Email Verification**
```typescript
// Email verification flow
1. User enters email
2. System sends OTP code
3. User enters verification code
4. System validates and grants access
```

**Gate 3: NDA Acceptance**
```typescript
// NDA acceptance flow
1. Display NDA text
2. User reads and accepts
3. Record acceptance with signature data
4. Grant document access
```

#### **4.3 Document Viewer Features**

**Viewing Controls:**
- 📖 PDF rendering with page navigation
- 🔍 Zoom controls (25% to 200%)
- 🖥️ Fullscreen mode
- 📱 Mobile-responsive design

**Security Features:**
- 💧 Dynamic watermarking
- 📸 Screenshot prevention (browser-level)
- 🖨️ Print control
- ⬇️ Download control
- ⏱️ Session timeout

**Analytics Tracking:**
- 👁️ Page-by-page view tracking
- ⏱️ Time spent per page
- 📊 Scroll depth measurement
- 🖱️ Interaction tracking
- 📍 Geographic location
- 🖥️ Device fingerprinting

---

### **Phase 5: Real-Time Analytics & Tracking**

#### **5.1 Analytics Data Collection**
```
Document View Event
↓
Visitor Tracking: Generate fingerprint
↓
Session Management: Create/update session
↓
Page Tracking: Record page views
↓
Engagement Scoring: Calculate metrics
↓
Real-time Updates: Notify document owner
↓
Database Storage: Persistent analytics
```

#### **5.2 Tracked Metrics**

**Visitor Information:**
- 📧 Email address (if provided)
- 🌍 Geographic location (country, city)
- 🖥️ Device type and browser
- 📱 Operating system
- 🌐 IP address
- 🔍 Referrer source

**Engagement Metrics:**
- ⏱️ Total viewing time
- 📄 Pages viewed
- 📊 Completion percentage
- 🖱️ Scroll depth per page
- 🔄 Return visits
- ⬇️ Download actions
- 🖨️ Print actions

**Session Data:**
- 🕐 First visit timestamp
- 🕐 Last visit timestamp
- 🔢 Total visit count
- ⏱️ Total duration
- 📄 Total pages viewed
- 🔄 Returning visitor flag

#### **5.3 Real-Time Notifications**
```typescript
// Notification triggers
- Document viewed (first time)
- High engagement detected
- Document downloaded
- NDA accepted
- Returning visitor
- Link expiring soon
```

---

### **Phase 6: Advanced Features**

#### **6.1 Team Collaboration**
- 👥 Team workspaces
- 🔐 Role-based permissions
- 📤 Shared document libraries
- 📊 Team analytics dashboard

#### **6.2 Virtual Data Rooms**
- 📁 Multi-document collections
- 🗂️ Folder organization
- 🔐 Granular access controls
- 📧 Bulk sharing capabilities

#### **6.3 Custom Branding**
- 🎨 Custom logos and colors
- 🌐 Custom domains
- 📧 Branded email templates
- 🏢 White-label experience

#### **6.4 API & Integrations**
- 🔑 API key management
- 🪝 Webhook notifications
- 📊 Analytics exports
- 🔗 Third-party integrations

---

## 🔧 **Technical Implementation**

### **Database Tables Used**
```sql
-- Core tables
send_shared_documents      -- Document metadata
send_document_links        -- Shareable links
send_link_access_controls  -- Access restrictions

-- Analytics tables
send_document_views        -- Individual views
send_page_views           -- Page-by-page tracking
send_visitor_sessions     -- Session aggregation
send_analytics_events     -- Event tracking

-- Security tables
send_email_verifications  -- Email verification
send_document_ndas        -- NDA acceptances
send_link_emails          -- Email logs

-- Advanced features
send_teams                -- Team management
send_data_rooms          -- Virtual data rooms
send_branding_settings   -- Custom branding
send_custom_domains      -- Domain management
```

### **API Endpoints**
```typescript
// Document management
POST   /api/send/documents/upload
GET    /api/send/documents
DELETE /api/send/documents/[id]

// Link management
POST   /api/send/links/create
GET    /api/send/links/[linkId]
PATCH  /api/send/links/[linkId]
DELETE /api/send/links/[linkId]

// Email sharing
POST   /api/send/links/send-email

// Public access
GET    /api/send/view/[linkId]
POST   /api/send/analytics/track

// Analytics
GET    /api/send/analytics/[documentId]
GET    /api/send/dashboard/stats
```

---

## 🎯 **Usage Examples**

### **Example 1: Basic Document Sharing**
```typescript
// 1. Upload document
const document = await uploadDocument(file)

// 2. Create simple link
const link = await createLink(document.id, {
  name: "Quarterly Report",
  expiresAt: "2024-12-31"
})

// 3. Send email
await sendDocumentEmail({
  linkId: link.id,
  recipientEmail: "client@company.com",
  message: "Please review our Q4 report"
})
```

### **Example 2: Secure Document with All Features**
```typescript
// 1. Create secure link with all features
const secureLink = await createLink(document.id, {
  name: "Confidential Contract",
  password: "SecurePass123",
  expiresAt: "2024-01-15",
  maxViews: 5,
  requireEmail: true,
  requireNda: true,
  allowDownload: false,
  allowPrinting: false,
  enableWatermark: true,
  watermarkText: "CONFIDENTIAL"
})

// 2. Send with custom branding
await sendDocumentEmail({
  linkId: secureLink.id,
  recipientEmail: "legal@partner.com",
  message: "Please review and sign the NDA before viewing",
  customBranding: {
    logoUrl: "https://company.com/logo.png",
    brandColor: "#1a365d",
    companyName: "Acme Corp"
  }
})
```

---

## 📊 **Analytics Dashboard Features**

### **Document Analytics**
- 📈 View count trends
- 🌍 Geographic distribution
- 📱 Device breakdown
- ⏱️ Engagement metrics
- 🔄 Returning visitors

### **Link Performance**
- 👁️ Total views per link
- ⏱️ Average viewing time
- 📊 Completion rates
- 🔗 Most popular links
- 📧 Email open rates

### **Visitor Insights**
- 👤 Visitor profiles
- 🔄 Visit patterns
- 📊 Engagement scoring
- 🌍 Location tracking
- 📱 Device preferences

---

This comprehensive flow documentation covers all aspects of the SendTusk document sharing system, from initial upload to detailed analytics tracking. The system provides enterprise-grade security, detailed analytics, and extensive customization options that match or exceed industry standards set by DocSend and PaperMark.
