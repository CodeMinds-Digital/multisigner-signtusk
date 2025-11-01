# 📚 SendTusk Complete API Reference
## Comprehensive API Documentation for Document Sharing

---

## 🔐 **Authentication**

All API endpoints require authentication via JWT token in cookies or Authorization header.

```typescript
// Cookie-based (automatic)
Cookie: accessToken=your_jwt_token

// Header-based
Authorization: Bearer your_jwt_token
```

---

## 📄 **Document Management APIs**

### **Upload Document**
```http
POST /api/send/documents/upload
Content-Type: multipart/form-data

Body: FormData with 'file' field
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "title": "document.pdf",
    "file_name": "document.pdf",
    "file_url": "https://storage.url/path",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### **List Documents**
```http
GET /api/send/documents?page=1&limit=20&status=active
```

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "title": "Document Title",
      "file_name": "document.pdf",
      "file_size": 1024000,
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "links_count": 3,
      "total_views": 45
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### **Get Document Details**
```http
GET /api/send/documents/[documentId]
```

### **Delete Document**
```http
DELETE /api/send/documents/[documentId]
```

---

## 🔗 **Link Management APIs**

### **Create Share Link**
```http
POST /api/send/links/create
Content-Type: application/json

{
  "documentId": "uuid",
  "name": "Q4 Report Link",
  "password": "optional_password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxViews": 100,
  "allowDownload": true,
  "allowPrinting": false,
  "requireEmail": true,
  "requireNda": false,
  "enableNotifications": true,
  "watermarkText": "CONFIDENTIAL"
}
```

**Response:**
```json
{
  "success": true,
  "link": {
    "id": "uuid",
    "linkId": "abc123def",
    "shareUrl": "https://app.com/v/abc123def",
    "name": "Q4 Report Link",
    "allowDownload": true,
    "allowPrinting": false,
    "requireEmail": true,
    "expiresAt": "2024-12-31T23:59:59Z",
    "maxViews": 100,
    "currentViews": 0,
    "isActive": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### **Get Link Details**
```http
GET /api/send/links/[linkId]?password=optional&email=optional
```

### **Update Link Settings**
```http
PATCH /api/send/links/[linkId]
Content-Type: application/json

{
  "name": "Updated Link Name",
  "expiresAt": "2024-12-31T23:59:59Z",
  "isActive": false
}
```

### **Delete Link**
```http
DELETE /api/send/links/[linkId]
```

### **Send Document Email**
```http
POST /api/send/links/send-email
Content-Type: application/json

{
  "linkId": "uuid",
  "recipientEmail": "user@example.com",
  "message": "Please review this document",
  "documentTitle": "Q4 Report",
  "shareUrl": "https://app.com/v/abc123def",
  "password": "optional_password"
}
```

---

## 👁️ **Public Access APIs**

### **Access Document (Public)**
```http
GET /api/send/view/[linkId]?password=optional&email=optional
```

**Response (Success):**
```json
{
  "success": true,
  "link": {
    "id": "uuid",
    "linkId": "abc123def",
    "name": "Document Link",
    "allowDownload": true,
    "allowPrinting": false,
    "enableWatermark": true,
    "watermarkText": "CONFIDENTIAL",
    "viewCount": 15
  },
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "file_url": "https://storage.url/path",
    "file_name": "document.pdf",
    "file_type": "application/pdf",
    "file_size": 1024000
  }
}
```

**Response (Access Control Required):**
```json
{
  "success": false,
  "requiresPassword": true,
  "requiresEmail": true,
  "requiresNda": true,
  "ndaText": "NDA agreement text..."
}
```

### **Verify Access (Public)**
```http
POST /api/send/links/[linkId]
Content-Type: application/json

{
  "action": "verify-password",
  "password": "user_password"
}

// OR

{
  "action": "send-verification",
  "email": "user@example.com"
}

// OR

{
  "action": "verify-code",
  "email": "user@example.com",
  "code": "123456"
}

// OR

{
  "action": "accept-nda",
  "email": "user@example.com",
  "ndaText": "NDA text",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 📊 **Analytics APIs**

### **Track Analytics Event**
```http
POST /api/send/analytics/track
Content-Type: application/json

{
  "linkId": "abc123def",
  "documentId": "uuid",
  "eventType": "view|download|print|page_view",
  "pageNumber": 1,
  "duration": 30000,
  "scrollDepth": 75,
  "email": "viewer@example.com",
  "metadata": {
    "custom": "data"
  }
}
```

### **Get Document Analytics**
```http
GET /api/send/analytics/[documentId]?period=7d&timezone=UTC
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalViews": 150,
    "uniqueViewers": 45,
    "averageDuration": 180000,
    "completionRate": 0.75,
    "downloadCount": 12,
    "printCount": 3,
    "topPages": [
      { "page": 1, "views": 150, "avgDuration": 45000 },
      { "page": 2, "views": 120, "avgDuration": 60000 }
    ],
    "viewsByDay": [
      { "date": "2024-01-01", "views": 25, "uniqueViewers": 8 }
    ],
    "topLocations": [
      { "country": "US", "views": 80, "percentage": 0.53 },
      { "country": "UK", "views": 30, "percentage": 0.20 }
    ],
    "deviceBreakdown": {
      "desktop": 0.60,
      "mobile": 0.35,
      "tablet": 0.05
    }
  }
}
```

### **Export Analytics**
```http
GET /api/send/analytics/export?documentIds=uuid1,uuid2&format=csv&period=30d
```

---

## 🏢 **Team Management APIs**

### **Create Team**
```http
POST /api/send/teams
Content-Type: application/json

{
  "name": "Marketing Team",
  "slug": "marketing-team",
  "plan": "pro"
}
```

### **Invite Team Member**
```http
POST /api/send/teams/[teamId]/invite
Content-Type: application/json

{
  "email": "member@example.com",
  "role": "admin|member|viewer"
}
```

### **List Team Members**
```http
GET /api/send/teams/[teamId]/members
```

---

## 📁 **Data Rooms APIs**

### **Create Data Room**
```http
POST /api/send/data-rooms
Content-Type: application/json

{
  "name": "Project Alpha",
  "description": "Confidential project documents",
  "teamId": "uuid",
  "folderStructure": {
    "/": {
      "name": "Root",
      "documents": [],
      "subfolders": ["contracts", "reports"]
    }
  }
}
```

### **Add Document to Data Room**
```http
POST /api/send/data-rooms/[roomId]/documents
Content-Type: application/json

{
  "documentId": "uuid",
  "folderPath": "/contracts",
  "sortOrder": 1
}
```

### **Grant Data Room Access**
```http
POST /api/send/data-rooms/[roomId]/access
Content-Type: application/json

{
  "email": "user@example.com",
  "permissions": "view|download|admin",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

---

## 🎨 **Branding & Settings APIs**

### **Update Branding Settings**
```http
PATCH /api/send/settings/branding
Content-Type: application/json

{
  "logoUrl": "https://company.com/logo.png",
  "brandColor": "#1a365d",
  "fontFamily": "Inter",
  "companyName": "Acme Corp",
  "removeBranding": false
}
```

### **Add Custom Domain**
```http
POST /api/send/settings/domains
Content-Type: application/json

{
  "domain": "docs.company.com"
}
```

### **Verify Custom Domain**
```http
POST /api/send/settings/domains/[domainId]/verify
```

---

## 🔔 **Notifications APIs**

### **Get Notification Preferences**
```http
GET /api/send/notifications/preferences
```

### **Update Notification Preferences**
```http
PATCH /api/send/notifications/preferences
Content-Type: application/json

{
  "emailNotifications": true,
  "documentViewed": true,
  "documentDownloaded": true,
  "highEngagement": true,
  "linkExpiring": true,
  "weeklyDigest": false
}
```

### **Trigger Manual Notification**
```http
POST /api/send/notifications/trigger
Content-Type: application/json

{
  "type": "document_viewed|high_engagement|link_expiring",
  "documentId": "uuid",
  "metadata": {
    "viewerEmail": "viewer@example.com",
    "engagementScore": 85
  }
}
```

---

## 🔑 **API Keys & Webhooks**

### **Create API Key**
```http
POST /api/send/api-keys
Content-Type: application/json

{
  "name": "Integration Key",
  "permissions": ["read", "write"],
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### **Create Webhook**
```http
POST /api/send/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["document.viewed", "document.downloaded"],
  "secret": "webhook_secret"
}
```

---

## 🔄 **Real-time APIs**

### **Get Real-time Analytics**
```http
GET /api/send/realtime/[linkId]
```

**Response:**
```json
{
  "success": true,
  "realtime": {
    "activeViewers": 3,
    "currentSessions": [
      {
        "sessionId": "session123",
        "viewerEmail": "user@example.com",
        "location": "New York, US",
        "device": "desktop",
        "currentPage": 2,
        "startTime": "2024-01-01T10:00:00Z"
      }
    ],
    "recentEvents": [
      {
        "type": "page_view",
        "page": 3,
        "timestamp": "2024-01-01T10:05:00Z",
        "viewerEmail": "user@example.com"
      }
    ]
  }
}
```

---

## 📋 **Dashboard APIs**

### **Get Dashboard Stats**
```http
GET /api/send/dashboard/stats?period=7d
```

### **Get Recent Activity**
```http
GET /api/send/dashboard/activity?limit=20
```

### **Get Top Documents**
```http
GET /api/send/dashboard/top-documents?period=30d&limit=10
```

---

## ❌ **Error Responses**

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🔄 **Rate Limiting**

All APIs are rate limited:
- **Authenticated users**: 1000 requests/hour
- **Public access**: 100 requests/hour per IP
- **Email sending**: 50 emails/hour per user

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

This comprehensive API reference covers all endpoints in the SendTusk document sharing system, providing complete documentation for developers integrating with or extending the platform.
