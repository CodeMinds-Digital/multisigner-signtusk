I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

## Current Implementation Status

The Send module has **extensive implementation** with 60+ API routes, 50+ components, and 20+ database tables. Based on comprehensive agent analysis:

### ✅ **Fully Implemented Features:**
- Document upload & management with versioning
- Share link creation with comprehensive security (password, email verification, NDA)
- Real-time analytics with polling (5s intervals)
- Data rooms with folder organization
- Granular permissions & user groups
- Collaborator management with role-based access
- Branding system (logos, colors, templates, live preview)
- Advanced access controls (IP, country, domain restrictions stored in DB)
- Watermarks & screenshot protection (client-side overlays)
- Document versioning system
- FAQ system with full-text search
- Conversation/chat system for documents
- Webhook delivery with retries & signature verification
- API key management (basic CRUD)
- Custom domain management with DNS instructions
- Email notifications via Resend + QStash job queue
- Bulk file upload with validation
- Page-by-page analytics visualization
- Device/browser fingerprinting
- Geographic analytics (frontend ready, backend needs IP geolocation)
- Activity heatmaps (24×7 grid)
- Engagement scoring (frontend display, backend computation)

### ⚠️ **Partially Implemented / Gaps:**
1. **Access Control Enforcement**: Stored in `send_link_access_controls` but NOT enforced in GET endpoints
2. **Email Verification**: Inconsistent between single links (✅) and data room links (❌)
3. **AI Chat**: Mock implementation only - no real AI provider integration
4. **SSO/SAML**: Basic OAuth flows exist, SAML parsing is simplified/stubbed
5. **File Format Support**: Only PDF & images render inline; Office docs/videos show fallback
6. **Real-time**: Polling-based (not WebSocket/SSE)
7. **IP Geolocation**: `getLocationData()` is a stub returning `{}`
8. **Password Security**: Sent via URL query params (insecure)

### ❌ **Missing Features (DocSend/Papermark 2025 Standards):**
1. **PowerPoint/Video inline rendering** - No embedded media support
2. **Bulk folder import** - No webkitdirectory or recursive folder upload
3. **"Shared with me" recipient dashboard** - No recipient-facing view
4. **Production SAML** - No robust SAML library integration
5. **Audit logs** - Partial (fields exist, no immutable/tamper-evident storage)
6. **Data residency controls** - No multi-region support
7. **CRM integrations** (Salesforce, HubSpot) - Only scaffolding exists
8. **Slack/Teams connectors** - Preference flags only, no implementation
9. **Conversion tracking & A/B testing** - Not implemented
10. **Export capabilities** (CSV/PDF) - No export endpoints or UI
11. **Document versioning UI** - Backend exists, no frontend interface
12. **PermissionManager component** - Referenced but not provided
13. **GroupShareLinks component** - Referenced but not provided
14. **WebSocket real-time** - Only HTTP polling exists

### Approach

## High-Level Approach

To achieve **complete end-to-end workflow replication** of DocSend and Papermark 2025 standards, we'll address gaps in **three phases**:

### **Phase 1: Critical Security & Enforcement Fixes** (High Priority)
Fix security vulnerabilities and enforce existing access controls that are stored but not applied.

### **Phase 2: Core Feature Completeness** (Medium Priority)  
Implement missing core features required for DocSend/Papermark parity (file format support, recipient dashboard, bulk operations).

### **Phase 3: Enterprise & Advanced Features** (Lower Priority)
Add enterprise-grade features (SSO/SAML production, audit logs, CRM integrations, real-time WebSocket).

**Key Principles:**
- **Security First**: Fix password transmission, enforce access controls, add rate limiting
- **Backward Compatible**: Don't break existing functionality
- **Progressive Enhancement**: Build on existing infrastructure
- **Production Ready**: Use established libraries for SAML, file conversion, etc.

### Reasoning

I explored the Send module codebase by:
1. Reading documentation files showing "100% complete" claims
2. Analyzing database schema (20+ tables with comprehensive features)
3. Deploying 5 specialized agents to inspect:
   - API routes implementation (links, documents, analytics, webhooks, domains, AI)
   - Document viewer capabilities (file format support, watermarks, protection)
   - Integration features (webhooks, API keys, SSO, audit logs, notifications)
   - Workflow & UX components (templates, branding, collaborators, bulk upload)
   - Analytics & tracking (real-time, heatmaps, engagement scoring, exports)
4. Comparing findings against DocSend 2025 and Papermark 2025 feature lists from web search
5. Identifying gaps between stored data and enforced logic

## Mermaid Diagram

sequenceDiagram
    participant User
    participant Client
    participant API
    participant AccessControl
    participant Database
    participant ExternalServices

    Note over User,ExternalServices: Phase 1: Security Fixes

    User->>Client: Access document link
    Client->>API: GET /api/send/links/[linkId]
    API->>AccessControl: Enforce access controls
    AccessControl->>Database: Check allowed/blocked lists
    AccessControl-->>API: Access decision
    alt Access Denied
        API-->>Client: 403 Forbidden (with reason)
    else Access Granted
        API-->>Client: Document metadata
        Client->>User: Show password prompt
        User->>Client: Enter password
        Client->>API: POST verify-password (body)
        API->>AccessControl: Rate limit check
        API->>Database: Verify password hash
        API-->>Client: Access token
    end

    Note over User,ExternalServices: Phase 2: Core Features

    User->>Client: Upload folder
    Client->>API: POST /bulk-folder-upload
    API->>Database: Create folder structure
    API->>ExternalServices: Upload files to storage
    API-->>Client: Upload results

    User->>Client: View Office document
    Client->>API: GET document content
    API-->>Client: Document URL
    Client->>ExternalServices: Load Office viewer
    ExternalServices-->>Client: Rendered document

    User->>Client: Check "Shared with me"
    Client->>API: GET /shared-with-me
    API->>Database: Query documents by email
    API-->>Client: Shared documents list

    Note over User,ExternalServices: Phase 3: Enterprise Features

    User->>Client: Initiate SSO login
    Client->>API: GET /auth/sso/[provider]/initiate
    API->>ExternalServices: Redirect to IdP
    ExternalServices->>User: IdP login page
    User->>ExternalServices: Authenticate
    ExternalServices->>API: SAML response
    API->>AccessControl: Validate SAML
    API->>Database: Create session
    API-->>Client: Session cookie

    User->>Client: Ask AI question
    Client->>API: POST /ai/chat
    API->>ExternalServices: Extract document text (OCR)
    API->>ExternalServices: Generate embeddings
    API->>ExternalServices: Query vector DB
    API->>ExternalServices: Call AI provider
    ExternalServices-->>API: AI response
    API->>Database: Log AI interaction
    API-->>Client: Answer with sources

    User->>Client: Export analytics
    Client->>API: POST /analytics/export
    API->>Database: Query analytics data
    API->>ExternalServices: Generate CSV/PDF
    API->>Database: Store export job
    API-->>Client: Export job ID
    Client->>API: Poll /export/status/[jobId]
    API-->>Client: Download URL

## Proposed File Changes

### src/app/api/send/links/[linkId]/route.ts(MODIFY)

References: 

- src/lib/send-email-verification.ts
- src/lib/upstash-config.ts

**CRITICAL SECURITY FIX**: Change password verification from URL query parameter to POST body.

1. **Remove password from GET query params** - Password should never be in URL (logged in proxies/browsers)
2. **Add new POST action 'verify-password'** - Accept password in request body like other verification actions
3. **Add rate limiting** - Implement brute-force protection using Upstash rate limiter (max 5 attempts per 15 minutes per IP)
4. **Enforce access controls** - Check `send_link_access_controls` table for allowed/blocked emails, domains, countries, IPs before granting access
5. **Return structured error codes** - Use specific error codes (RATE_LIMITED, BLOCKED_COUNTRY, etc.) for better client handling

Refer to existing rate limiting in `/src/lib/send-email-verification.ts` for pattern. Access control enforcement should query the `send_link_access_controls` table and validate against arrays (allowed_emails, blocked_domains, allowed_countries, blocked_countries, allowed_ips, blocked_ips).

### src/app/api/send/dataroom-links/[slug]/route.ts(MODIFY)

References: 

- src/app/api/send/links/[linkId]/route.ts(MODIFY)

**FIX EMAIL VERIFICATION ENFORCEMENT**: Complete the email verification check that is currently stubbed.

1. **Implement email verification check in GET** - Query `send_email_verifications` table to verify email has been verified (similar to `/api/send/links/[linkId]/route.ts` implementation)
2. **Enforce access controls** - Check `send_link_access_controls` for data room links (allowed/blocked lists)
3. **Add rate limiting** - Protect against brute-force password attempts
4. **Return consistent error structure** - Match error format from single document links

Refer to the working implementation in `/src/app/api/send/links/[linkId]/route.ts` lines 151-196 for the email verification pattern.

### src/lib/access-control-enforcer.ts(NEW)

**CREATE CENTRALIZED ACCESS CONTROL SERVICE**: Extract and centralize access control enforcement logic.

1. **Create AccessControlEnforcer class** with methods:
   - `checkEmailAccess(email, controls)` - Validate against allowed/blocked email lists
   - `checkDomainAccess(email, controls)` - Validate against allowed/blocked domain lists
   - `checkIPAccess(ipAddress, controls)` - Validate against allowed/blocked IP lists
   - `checkCountryAccess(country, controls)` - Validate against allowed/blocked country lists
   - `enforceAllControls(context, controls)` - Run all checks and return detailed result

2. **Return structured results** - Include which rule blocked access and why
3. **Support wildcards** - Handle patterns like `*.company.com` for domain matching
4. **Add logging** - Log all access denials for audit trail

This service will be imported by both `/api/send/links/[linkId]/route.ts` and `/api/send/dataroom-links/[slug]/route.ts` to ensure consistent enforcement.

### src/lib/ip-geolocation-service.ts(NEW)

References: 

- src/lib/send-visitor-tracking.ts
- src/lib/upstash-config.ts

**IMPLEMENT IP GEOLOCATION SERVICE**: Replace the stubbed `getLocationData()` function.

1. **Integrate IP geolocation provider** - Use a service like MaxMind GeoLite2, ipapi.co, or ip-api.com
2. **Create IPGeolocationService class** with methods:
   - `getLocation(ipAddress)` - Returns { country, city, region, latitude, longitude }
   - `getCachedLocation(ipAddress)` - Check Redis cache first (TTL 24 hours)
   - `batchLookup(ipAddresses[])` - Efficient batch processing

3. **Add caching layer** - Use Upstash Redis to cache lookups (reduce API costs)
4. **Handle errors gracefully** - Return null/unknown on failures, don't block document access
5. **Add environment variable** - `IP_GEOLOCATION_API_KEY` for the chosen provider

Update `SendVisitorTracking.getLocationData()` in `/src/lib/send-visitor-tracking.ts` to call this service instead of returning `{}`.

### src/components/features/send/universal-document-viewer.tsx(MODIFY)

References: 

- src/lib/send-analytics-service.ts

**ADD OFFICE DOCUMENT & VIDEO SUPPORT**: Extend file format support beyond PDF and images.

1. **Add Office document rendering**:
   - For Word/Excel/PowerPoint: Use Microsoft Office Online Viewer embed (`https://view.officeapps.live.com/op/embed.aspx?src=`) or Google Docs Viewer
   - Add new document types: 'word', 'excel', 'powerpoint' in `getDocumentType()`
   - Render iframe with viewer URL when documentType matches Office formats

2. **Add video playback**:
   - Add 'video' document type detection (mp4, webm, mov, avi)
   - Render HTML5 `<video>` element with controls
   - Support watermark overlay on video player
   - Track video play/pause/seek events via SendAnalyticsService

3. **Add audio playback**:
   - Add 'audio' document type (mp3, wav, ogg)
   - Render HTML5 `<audio>` element with controls

4. **Add text file rendering**:
   - Implement actual text content fetching (currently shows placeholder)
   - Fetch text content from documentUrl and display in `<pre>` with syntax highlighting for code files

Refer to existing PDF/image rendering patterns. For Office docs, test with both Microsoft and Google viewers to determine best compatibility.

### src/app/(dashboard)/send/shared-with-me/page.tsx(NEW)

References: 

- src/app/(dashboard)/send/documents/page.tsx

**CREATE RECIPIENT DASHBOARD**: Implement "Shared with me" view for document recipients.

1. **Create recipient-facing page** at `/send/shared-with-me` showing:
   - All documents/data rooms shared with the current user's email
   - Filter by status (new, viewed, expiring soon)
   - Sort by shared date, expiry date, last viewed
   - Visual indicators for unread/new documents
   - Expiry warnings for documents expiring within 7 days

2. **Fetch shared documents** - Query `send_document_views` and `send_email_verifications` tables to find documents where user's email appears
3. **Show metadata** - Document title, sender name, shared date, expiry date, view count, last viewed timestamp
4. **Quick actions** - View document, mark as read, archive
5. **Search functionality** - Search by document name or sender

Refer to `/src/app/(dashboard)/send/documents/page.tsx` for layout patterns and UI components.

### src/app/api/send/shared-with-me/route.ts(NEW)

**CREATE RECIPIENT API ENDPOINT**: Backend for "Shared with me" dashboard.

1. **GET endpoint** - Fetch documents shared with authenticated user:
   - Query `send_document_views` WHERE `viewer_email = user.email`
   - Join with `send_document_links` and `send_shared_documents`
   - Include link metadata (expiry, password_protected, etc.)
   - Calculate status (new, viewed, expiring)
   - Support pagination and filtering

2. **Return structured data**:
   - Document details (id, title, file_name, file_type)
   - Link details (linkId, expires_at, is_active)
   - Sender information (created_by user)
   - View history (first_viewed, last_viewed, view_count)
   - Status flags (is_new, is_expiring, days_until_expiry)

3. **Add authentication** - Verify user via access token
4. **Add caching** - Cache results in Redis for 5 minutes

### src/components/features/send/bulk-operations/bulk-folder-import-modal.tsx(NEW)

References: 

- src/components/features/send/bulk-operations/bulk-upload-modal.tsx

**CREATE BULK FOLDER IMPORT**: Allow users to upload entire folder structures.

1. **Add folder selection UI**:
   - Use `<input type="file" webkitdirectory directory multiple />` for folder selection
   - Display folder tree preview before upload
   - Show file count and total size
   - Allow folder structure customization before upload

2. **Preserve folder hierarchy**:
   - Parse File.webkitRelativePath to extract folder structure
   - Create folder records in data room
   - Maintain parent-child relationships
   - Set correct folder_path for each document

3. **Batch upload with progress**:
   - Upload files in chunks (10 at a time)
   - Show overall progress and per-file progress
   - Handle errors gracefully (continue on individual file failures)
   - Create summary report at end

4. **Integration**:
   - Add "Import Folder" button to DataRoomDocumentManager
   - Use similar patterns to `bulk-upload-modal.tsx`

Refer to `/src/components/features/send/bulk-operations/bulk-upload-modal.tsx` for upload patterns and UI structure.

### src/app/api/send/documents/bulk-folder-upload/route.ts(NEW)

References: 

- src/app/api/send/documents/bulk-upload/route.ts
- src/app/api/send/documents/upload/route.ts

**CREATE BULK FOLDER UPLOAD API**: Backend endpoint for folder structure uploads.

1. **POST endpoint** accepting:
   - FormData with multiple files
   - Folder structure metadata (JSON with folder hierarchy)
   - Target data room ID

2. **Process folder structure**:
   - Create folder records in `send_data_room_documents` table
   - Maintain folder_path hierarchy
   - Upload files to Supabase storage preserving paths
   - Create document records with correct folder associations

3. **Transaction handling**:
   - Use database transactions to ensure atomicity
   - Rollback on errors
   - Clean up uploaded files if database operations fail

4. **Return detailed results**:
   - Success/failure per file
   - Created folder IDs
   - Document IDs
   - Any errors encountered

Refer to `/src/app/api/send/documents/bulk-upload/route.ts` for upload patterns.

### src/components/features/send/document-version-viewer.tsx(NEW)

References: 

- database/migrations/20250107_add_document_versioning.sql

**CREATE VERSION CONTROL UI**: Frontend interface for document versioning.

1. **Version history panel**:
   - List all versions of a document (fetch from `send_document_versions` table)
   - Show version number, upload date, uploader, file size, version notes
   - Highlight current/primary version
   - Allow version comparison (side-by-side view)

2. **Version actions**:
   - View specific version (open in viewer)
   - Download specific version
   - Restore version (make it primary)
   - Add version notes/comments
   - Delete old versions (with confirmation)

3. **Version upload**:
   - "Upload New Version" button
   - Prompt for version notes
   - Call existing upload API with `documentId` parameter (already supports versioning)

4. **Integration**:
   - Add "Version History" button to document cards
   - Show version badge on documents with multiple versions
   - Display in modal or side panel

Refer to database schema in `/database/migrations/20250107_add_document_versioning.sql` for data structure.

### src/app/api/send/documents/[id]/versions/route.ts(MODIFY)

References: 

- database/migrations/20250107_add_document_versioning.sql

**ENHANCE VERSION API**: Ensure version management API is complete.

1. **Verify GET endpoint** returns all versions using `get_document_version_tree()` function from database
2. **Add POST endpoint** for restoring a version:
   - Update `is_primary` flag on specified version
   - Set all other versions to `is_primary = false`
   - Return updated version list

3. **Add DELETE endpoint** for removing old versions:
   - Verify user owns document
   - Prevent deletion of primary version
   - Delete from `send_document_versions` table
   - Clean up associated storage file

4. **Add PATCH endpoint** for updating version notes

The database function `get_document_version_tree()` already exists in the schema - use it for fetching version history.

### src/components/features/send/data-rooms/permission-manager.tsx(MODIFY)

References: 

- src/components/features/send/data-rooms/user-group-manager.tsx
- database/ADD_GRANULAR_PERMISSIONS_SYSTEM.sql

**CREATE PERMISSION MANAGER COMPONENT**: Dedicated UI for managing granular permissions.

1. **Permission matrix view**:
   - Table showing documents/folders (rows) vs user groups (columns)
   - Checkboxes for permissions: View, Download, Upload, Share, Comment
   - Bulk permission actions (apply to all, copy permissions)

2. **Folder-level permissions**:
   - Set permissions on folders (inherited by contents)
   - Override permissions for specific documents
   - Visual indicators for inherited vs explicit permissions

3. **User group integration**:
   - List all user groups from `send_dataroom_viewer_groups`
   - Create/edit/delete groups inline
   - Assign permissions per group

4. **API integration**:
   - Fetch permissions from `/api/send/data-rooms/[roomId]/permissions`
   - Update permissions via PATCH requests
   - Real-time validation of permission conflicts

Refer to `/src/components/features/send/data-rooms/user-group-manager.tsx` for group management patterns and `/database/ADD_GRANULAR_PERMISSIONS_SYSTEM.sql` for data structure.

### src/components/features/send/data-rooms/group-share-links.tsx(MODIFY)

References: 

- database/ADD_GRANULAR_PERMISSIONS_SYSTEM.sql

**VERIFY GROUP SHARE LINKS COMPONENT**: Ensure this component is complete and functional.

1. **Verify component exists** and implements:
   - List of group-specific share links from `send_dataroom_links` table
   - Create new group link with group selection
   - Link settings (password, expiry, watermark, etc.)
   - Link analytics (views per group)
   - Copy link to clipboard functionality

2. **If component is incomplete**, add:
   - Group selector dropdown (from `send_dataroom_viewer_groups`)
   - Link preview with group badge
   - Bulk link operations (delete multiple, update settings)
   - Link performance comparison across groups

3. **Integration with permissions**:
   - Show which documents each group can access
   - Warn if group has no permissions
   - Link to PermissionManager for quick permission edits

Refer to `/database/ADD_GRANULAR_PERMISSIONS_SYSTEM.sql` for `send_dataroom_links` and `send_dataroom_viewer_groups` schema.

### src/lib/sso-service.ts(MODIFY)

**UPGRADE SAML TO PRODUCTION-READY**: Replace simplified SAML parsing with robust library.

1. **Install SAML library** - Add `samlify` or `passport-saml` to package.json
2. **Replace `parseSAMLResponse()` function**:
   - Use library's XML parser and signature validation
   - Verify SAML signature using IdP certificate
   - Validate assertion timestamps and conditions
   - Extract attributes using proper XPath queries

3. **Add SAML metadata support**:
   - `generateSPMetadata()` - Generate Service Provider metadata XML
   - `importIdPMetadata(metadataXml)` - Parse IdP metadata
   - Store metadata in `sso_providers` table

4. **Enhance security**:
   - Validate SAML Response signature
   - Check assertion expiry and NotBefore/NotOnOrAfter
   - Verify Audience restriction
   - Implement replay attack prevention (store used assertion IDs)

5. **Add comprehensive error handling** - Return specific SAML error codes

The current implementation has explicit comments saying "use proper SAML library in production" - this addresses that requirement.

### src/app/api/auth/sso/[provider]/route.ts(NEW)

References: 

- src/lib/sso-service.ts(MODIFY)

**CREATE SSO AUTHENTICATION ROUTES**: Complete SSO flow with initiation and callback endpoints.

1. **GET /api/auth/sso/[provider]/initiate** - Start SSO flow:
   - Fetch provider config from `sso_providers` table
   - Generate OAuth authorization URL or SAML request
   - Store state parameter in Redis (prevent CSRF)
   - Redirect user to IdP

2. **GET /api/auth/sso/[provider]/callback** - Handle SSO response:
   - Validate state parameter from Redis
   - For OAuth: exchange code for tokens, fetch user info
   - For SAML: validate and parse SAML response
   - Call `SSOService.handleOAuthCallback()` or `handleSAMLResponse()`
   - Create or update user session
   - Redirect to application with session cookie

3. **POST /api/auth/sso/[provider]/acs** - SAML Assertion Consumer Service:
   - Accept SAML POST binding
   - Validate SAML response
   - Create session
   - Redirect to application

4. **Error handling** - Redirect to error page with specific error codes

Refer to `/src/lib/sso-service.ts` for SSOService methods to call.

### src/lib/audit-log-service.ts(NEW)

References: 

- src/lib/data-retention-service.ts

**CREATE ENTERPRISE AUDIT LOG SERVICE**: Implement immutable, tamper-evident audit logging.

1. **Create AuditLogService class** with methods:
   - `logEvent(userId, action, resourceType, resourceId, metadata, ipAddress)` - Log audit event
   - `getAuditLogs(filters, pagination)` - Query audit logs
   - `exportAuditLogs(startDate, endDate, format)` - Export to CSV/JSON
   - `verifyIntegrity(logId)` - Verify log hasn't been tampered

2. **Implement tamper-evident storage**:
   - Each log entry includes hash of previous entry (blockchain-like chain)
   - Store hash in `audit_trail` JSONB field
   - Verify chain integrity on read

3. **Store comprehensive metadata**:
   - User ID, action type, resource type/ID
   - IP address, user agent, timestamp
   - Before/after values for updates
   - Session ID, request ID for tracing

4. **Add retention policies**:
   - Configurable retention periods per action type
   - Archive old logs to cold storage
   - Prevent deletion of logs within retention period

5. **Integration points**:
   - Call from all sensitive operations (document access, permission changes, user invites, etc.)
   - Add middleware to auto-log API requests

Refer to existing audit_trail fields in database schema and `/src/lib/data-retention-service.ts` for retention patterns.

### src/app/api/send/analytics/export/route.ts(MODIFY)

References: 

- src/app/api/send/analytics/export/queue/route.ts
- src/app/api/send/analytics/export/download/[jobId]/route.ts

**IMPLEMENT ANALYTICS EXPORT**: Add CSV/PDF export functionality.

1. **Verify existing export queue endpoint** works correctly (already exists per agent report)
2. **Add format support**:
   - CSV export using `json2csv` library
   - PDF export using `pdfkit` or `puppeteer`
   - Excel export using `exceljs`

3. **Export types**:
   - Document analytics (views, downloads, page stats)
   - Data room analytics (all documents, aggregated)
   - Visitor analytics (sessions, devices, locations)
   - Time-series data (views over time)

4. **Implement streaming for large exports**:
   - Use Node.js streams to handle large datasets
   - Generate file in chunks
   - Store in Supabase storage temporarily
   - Return download URL

5. **Add export history**:
   - Track export requests in `send_export_jobs` table (already exists, see migration 20250109_add_send_export_jobs_table.sql)
   - Allow users to download previous exports
   - Auto-delete exports after 7 days

Refer to existing export queue endpoints at `/api/send/analytics/export/queue` and `/api/send/analytics/export/download/[jobId]`.

### src/components/features/send/analytics-export-button.tsx(MODIFY)

References: 

- src/components/features/send/analytics-dashboard.tsx
- src/components/features/send/data-rooms/advanced-analytics.tsx

**ADD EXPORT UI CONTROLS**: Ensure export button component is fully functional.

1. **Verify component implements**:
   - Format selector (CSV, PDF, Excel)
   - Date range picker for export
   - Export type selector (views, downloads, sessions, etc.)
   - Progress indicator during export generation
   - Download link when ready

2. **Add features if missing**:
   - Schedule recurring exports (daily/weekly/monthly)
   - Email export when ready (for large exports)
   - Export templates (predefined report formats)
   - Preview before export

3. **Integration**:
   - Add export button to AnalyticsDashboard and AdvancedAnalytics components
   - Call `/api/send/analytics/export/queue` to initiate export
   - Poll `/api/send/analytics/export/status/[jobId]` for progress
   - Download from `/api/send/analytics/export/download/[jobId]`

Refer to existing export API endpoints structure.

### src/lib/realtime-websocket-service.ts(NEW)

References: 

- src/hooks/use-realtime-analytics.ts
- src/lib/upstash-config.ts

**IMPLEMENT WEBSOCKET REAL-TIME**: Upgrade from polling to WebSocket-based real-time updates.

1. **Create WebSocket server** using Next.js custom server or separate WebSocket server:
   - Use `ws` library or Socket.io
   - Handle connection authentication via JWT
   - Maintain connection pool per link/data room

2. **Implement real-time events**:
   - `viewer:joined` - New viewer started session
   - `viewer:left` - Viewer ended session
   - `viewer:page_changed` - Viewer navigated to different page
   - `document:viewed` - Document view event
   - `document:downloaded` - Download event
   - `analytics:updated` - Analytics metrics changed

3. **Client-side WebSocket hook**:
   - Create `useWebSocketAnalytics(linkId)` hook
   - Auto-reconnect on disconnect
   - Fallback to polling if WebSocket unavailable
   - Emit events to server (heartbeat, page changes)

4. **Update existing hooks**:
   - Modify `useRealtimeAnalytics` to use WebSocket instead of polling
   - Keep polling as fallback
   - Modify `useViewerTracking` to emit events via WebSocket

5. **Infrastructure**:
   - Add WebSocket endpoint configuration
   - Use Redis pub/sub for multi-instance coordination
   - Add connection limits and rate limiting

Refer to `/src/hooks/use-realtime-analytics.ts` for current polling implementation to replace.

### src/app/api/send/ai/chat/route.ts(MODIFY)

**IMPLEMENT PRODUCTION AI CHAT**: Replace mock AI service with real AI provider integration.

1. **Choose AI provider** - OpenAI GPT-4, Anthropic Claude, or open-source model
2. **Replace AIDocumentService mock**:
   - Implement document text extraction (OCR for images/PDFs using Tesseract or cloud OCR)
   - Chunk documents for context window limits
   - Generate embeddings using OpenAI embeddings or similar
   - Store embeddings in vector database (Pinecone, Weaviate, or Supabase pgvector)

3. **Implement semantic search**:
   - Query vector DB for relevant document chunks
   - Construct prompt with retrieved context
   - Call AI provider API with context + question
   - Return answer with source citations

4. **Add conversation memory**:
   - Store conversation history in database
   - Include previous Q&A in context
   - Implement conversation summarization for long threads

5. **Add safety & moderation**:
   - Content filtering for inappropriate questions
   - Rate limiting per user
   - Cost tracking and limits

6. **Environment variables**:
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `VECTOR_DB_URL` and credentials
   - `OCR_SERVICE_KEY` if using cloud OCR

The current implementation is explicitly marked as "Mock AI service - replace with actual AI provider" - this addresses that requirement.

### .env.example(MODIFY)

**UPDATE ENVIRONMENT VARIABLES**: Add all new required environment variables.

Add the following variables with descriptions:

```
# IP Geolocation Service
IP_GEOLOCATION_API_KEY=your_api_key_here
IP_GEOLOCATION_PROVIDER=maxmind # or ipapi, ip-api

# AI Chat Service (choose one)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
VECTOR_DB_URL=your_vector_db_url
VECTOR_DB_API_KEY=your_vector_db_key

# SAML/SSO (if using enterprise SSO)
SAML_CERT_PATH=/path/to/cert.pem
SAML_KEY_PATH=/path/to/key.pem

# WebSocket (if deploying separate WebSocket server)
WEBSOCKET_SERVER_URL=wss://your-websocket-server.com
WEBSOCKET_SECRET=your_secret_key

# Feature Flags
ENABLE_WEBSOCKET_REALTIME=false
ENABLE_AI_CHAT=false
ENABLE_SSO=false
```

Add comments explaining each variable's purpose and where to obtain API keys.

### package.json(MODIFY)

**ADD REQUIRED NPM PACKAGES**: Install dependencies for new features.

Add the following packages to dependencies:

```json
"dependencies": {
  // Existing packages...
  
  // SAML/SSO
  "samlify": "^2.8.11",
  
  // AI Integration
  "openai": "^4.20.0",
  "@anthropic-ai/sdk": "^0.9.0",
  "@pinecone-database/pinecone": "^1.1.0",
  "tesseract.js": "^5.0.0",
  
  // Export functionality
  "json2csv": "^6.0.0",
  "exceljs": "^4.3.0",
  "pdfkit": "^0.13.0",
  
  // WebSocket
  "ws": "^8.14.0",
  "socket.io": "^4.6.0",
  "socket.io-client": "^4.6.0",
  
  // IP Geolocation
  "maxmind": "^4.3.0",
  "axios": "^1.6.0"
}
```

Note: Some packages may already exist (axios is already present). Only add missing ones.

### IMPLEMENTATION_GUIDE.md(NEW)

**CREATE IMPLEMENTATION GUIDE**: Comprehensive guide for implementing the plan.

# Send Module - Complete Implementation Guide

## Overview
This guide covers implementing missing features to achieve 100% DocSend/Papermark 2025 parity.

## Phase 1: Critical Security Fixes (Week 1)

### 1.1 Password Security
- Modify `/api/send/links/[linkId]/route.ts` to accept password via POST body
- Update client-side viewer to send password via POST
- Add rate limiting (5 attempts per 15 min)
- Test: Verify passwords not in URL logs

### 1.2 Access Control Enforcement
- Create `AccessControlEnforcer` service
- Update link access endpoints to enforce controls
- Test: Verify blocked IPs/countries/emails cannot access

### 1.3 Email Verification
- Fix data room link email verification
- Test: Verify email verification required for data rooms

## Phase 2: Core Features (Weeks 2-4)

### 2.1 File Format Support
- Add Office document viewers (Microsoft/Google)
- Add video/audio players
- Test: Upload and view various file types

### 2.2 Recipient Dashboard
- Create "Shared with me" page and API
- Test: Share documents and verify recipient can see them

### 2.3 Bulk Operations
- Implement folder import
- Test: Upload folder with 100+ files

### 2.4 Version Control UI
- Create version viewer component
- Test: Upload versions and restore old versions

## Phase 3: Enterprise Features (Weeks 5-8)

### 3.1 Production SAML
- Install samlify library
- Implement proper SAML validation
- Create SSO routes
- Test: Configure test IdP and authenticate

### 3.2 Audit Logs
- Implement tamper-evident logging
- Add audit log viewer
- Test: Verify all sensitive actions logged

### 3.3 Real-time WebSocket
- Set up WebSocket server
- Migrate from polling to WebSocket
- Test: Verify real-time updates work

### 3.4 AI Chat
- Choose AI provider
- Implement document extraction and embeddings
- Test: Ask questions about documents

### 3.5 Analytics Export
- Implement CSV/PDF/Excel export
- Test: Export large datasets

## Testing Checklist

### Security
- [ ] Passwords not in URLs
- [ ] Rate limiting works
- [ ] Access controls enforced
- [ ] Email verification required

### Features
- [ ] All file types render
- [ ] Recipient dashboard shows shared docs
- [ ] Folder import preserves structure
- [ ] Version control works
- [ ] SSO authentication works
- [ ] Audit logs capture all actions
- [ ] Real-time updates instant
- [ ] AI chat answers questions
- [ ] Exports generate correctly

## Deployment

1. **Environment Setup**
   - Add all new environment variables
   - Configure external services (AI, geolocation, etc.)

2. **Database Migrations**
   - All schema changes already exist in migrations
   - Run any new migrations if added

3. **Feature Flags**
   - Enable features gradually
   - Monitor performance and errors

4. **Monitoring**
   - Set up alerts for failed authentications
   - Monitor AI API costs
   - Track WebSocket connection counts

## Support & Troubleshooting

Refer to individual file change descriptions for detailed implementation notes.

---

## 📋 MISSING SUPABASE COMPONENTS - FIXED

### ✅ Database Tables (All Present)

The following tables are referenced in the plan and **ALL EXIST** in the database:

| Table Name | Status | Location |
|------------|--------|----------|
| `send_shared_documents` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `send_document_links` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `send_link_access_controls` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `send_document_views` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `send_email_verifications` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `send_document_versions` | ✅ Exists | migrations/20250107_add_document_versioning.sql |
| `send_dataroom_viewer_groups` | ✅ Exists | ADD_GRANULAR_PERMISSIONS_SYSTEM.sql |
| `send_dataroom_links` | ✅ Exists | ADD_GRANULAR_PERMISSIONS_SYSTEM.sql |
| `send_data_rooms` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `send_data_room_documents` | ✅ Exists | SEND_TAB_SCHEMA.sql |
| `sso_providers` | ✅ Exists | INTEGRATION_COMPLIANCE_SCHEMA_UPDATE.sql |
| `sso_sessions` | ✅ Exists | INTEGRATION_COMPLIANCE_SCHEMA_UPDATE.sql |
| `audit_trails` | ✅ Exists | INTEGRATION_COMPLIANCE_SCHEMA_UPDATE.sql |
| `send_export_jobs` | ✅ **CREATED** | migrations/20250109_add_send_export_jobs_table.sql |

### ✅ Storage Buckets (All Present)

| Bucket Name | Status | Size Limit | Access | Location |
|-------------|--------|------------|--------|----------|
| `send-documents` | ✅ Exists | 100 MB | Private | SEND_TAB_STORAGE_BUCKETS.sql |
| `send-thumbnails` | ✅ Exists | 5 MB | Public | SEND_TAB_STORAGE_BUCKETS.sql |
| `send-watermarks` | ✅ Exists | 2 MB | Private | SEND_TAB_STORAGE_BUCKETS.sql |
| `send-brand-assets` | ✅ Exists | 5 MB | Public | SEND_TAB_STORAGE_BUCKETS.sql |

### ✅ RLS Policies (All Configured)

All tables have Row Level Security enabled with appropriate policies:
- User-based access control (users can only access their own data)
- Anonymous access for public viewing (where applicable)
- Admin access policies (where applicable)

**Location**: `SEND_TAB_RLS_POLICIES.sql` and individual migration files

### ✅ Database Functions

| Function Name | Status | Purpose |
|---------------|--------|---------|
| `get_document_version_tree()` | ✅ Exists | Returns version history for documents |
| `manage_document_version()` | ✅ Exists | Auto-manages version numbers |
| `delete_expired_export_jobs()` | ✅ **CREATED** | Cleans up expired export jobs |

---

## 🎯 IMPLEMENTATION SUMMARY

### Phase 1: Critical Security Fixes (Priority: HIGH)
**Files to Modify**: 3
- `src/app/api/send/links/[linkId]/route.ts` - Password security & access control
- `src/app/api/send/dataroom-links/[slug]/route.ts` - Email verification enforcement
- `src/lib/access-control-enforcer.ts` - **NEW** centralized access control

**Database Changes**: None (uses existing tables)

### Phase 2: Core Feature Completeness (Priority: MEDIUM)
**Files to Create**: 6
- `src/lib/ip-geolocation-service.ts` - IP geolocation integration
- `src/app/(dashboard)/send/shared-with-me/page.tsx` - Recipient dashboard UI
- `src/app/api/send/shared-with-me/route.ts` - Recipient dashboard API
- `src/components/features/send/bulk-operations/bulk-folder-import-modal.tsx` - Folder upload UI
- `src/app/api/send/documents/bulk-folder-upload/route.ts` - Folder upload API
- `src/components/features/send/document-version-viewer.tsx` - Version control UI

**Files to Modify**: 2
- `src/components/features/send/universal-document-viewer.tsx` - Add Office/video support
- `src/app/api/send/documents/[id]/versions/route.ts` - Enhance version API

**Database Changes**: None (uses existing tables)

### Phase 3: Enterprise Features (Priority: LOWER)
**Files to Create**: 4
- `src/lib/sso-service.ts` - **MODIFY** (upgrade SAML)
- `src/app/api/auth/sso/[provider]/route.ts` - SSO authentication routes
- `src/lib/audit-log-service.ts` - Enterprise audit logging
- `src/lib/realtime-websocket-service.ts` - WebSocket real-time

**Files to Modify**: 6
- `src/components/features/send/data-rooms/permission-manager.tsx` - Permission UI
- `src/components/features/send/data-rooms/group-share-links.tsx` - Verify completeness
- `src/app/api/send/analytics/export/route.ts` - Implement CSV/PDF/Excel export
- `src/components/features/send/analytics-export-button.tsx` - Export UI controls
- `src/app/api/send/ai/chat/route.ts` - Production AI integration
- `.env.example` - Add new environment variables
- `package.json` - Add required NPM packages

**Database Changes**:
- ✅ `send_export_jobs` table already created (migration 20250109)

---

## ✅ PRE-IMPLEMENTATION CHECKLIST

Before starting implementation, verify:

### Database Setup
- [ ] Run `database/migrations/20250109_add_send_export_jobs_table.sql` in Supabase SQL Editor
- [ ] Verify all Send module tables exist (14 core tables + additional feature tables)
- [ ] Verify all storage buckets exist (4 buckets)
- [ ] Verify RLS policies are enabled on all tables
- [ ] Test database connection from application

### Environment Configuration
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add Upstash Redis credentials (already configured)
- [ ] Add Upstash QStash credentials (already configured)
- [ ] Add Resend API key for emails (already configured)
- [ ] Prepare IP geolocation API key (MaxMind, ipapi.co, or ip-api.com)
- [ ] Prepare AI provider API key (OpenAI or Anthropic) - for Phase 3
- [ ] Prepare Vector DB credentials (Pinecone or Supabase pgvector) - for Phase 3

### Development Environment
- [ ] Node.js version 18+ installed
- [ ] All dependencies installed (`npm install`)
- [ ] Development server runs without errors
- [ ] TypeScript compilation successful
- [ ] No ESLint errors in existing code

### Testing Setup
- [ ] Test Supabase connection
- [ ] Test Upstash Redis connection
- [ ] Test email sending (Resend)
- [ ] Test file upload to storage buckets
- [ ] Test authentication flow

---

## 🚀 EXECUTION ORDER

Follow this exact order to avoid dependency issues:

### Week 1: Security Fixes
1. Create `src/lib/access-control-enforcer.ts`
2. Modify `src/app/api/send/links/[linkId]/route.ts`
3. Modify `src/app/api/send/dataroom-links/[slug]/route.ts`
4. Test access control enforcement
5. Test password security (not in URL)
6. Test rate limiting

### Week 2: File Format Support
1. Create `src/lib/ip-geolocation-service.ts`
2. Modify `src/components/features/send/universal-document-viewer.tsx`
3. Test Office document viewing
4. Test video/audio playback
5. Test IP geolocation tracking

### Week 3: Recipient Features
1. Create `src/app/api/send/shared-with-me/route.ts`
2. Create `src/app/(dashboard)/send/shared-with-me/page.tsx`
3. Test recipient dashboard
4. Test document filtering and search

### Week 4: Bulk Operations & Versioning
1. Create `src/app/api/send/documents/bulk-folder-upload/route.ts`
2. Create `src/components/features/send/bulk-operations/bulk-folder-import-modal.tsx`
3. Create `src/components/features/send/document-version-viewer.tsx`
4. Modify `src/app/api/send/documents/[id]/versions/route.ts`
5. Test folder upload with 100+ files
6. Test version control workflow

### Week 5-6: Permissions & Analytics Export
1. Modify `src/components/features/send/data-rooms/permission-manager.tsx`
2. Verify `src/components/features/send/data-rooms/group-share-links.tsx`
3. Modify `src/app/api/send/analytics/export/route.ts`
4. Modify `src/components/features/send/analytics-export-button.tsx`
5. Test permission matrix
6. Test CSV/PDF/Excel exports

### Week 7-8: Enterprise Features (Optional)
1. Install SAML library (`npm install samlify`)
2. Modify `src/lib/sso-service.ts`
3. Create `src/app/api/auth/sso/[provider]/route.ts`
4. Create `src/lib/audit-log-service.ts`
5. Create `src/lib/realtime-websocket-service.ts`
6. Modify `src/app/api/send/ai/chat/route.ts`
7. Test SSO authentication
8. Test audit logging
9. Test WebSocket real-time
10. Test AI chat

---

## 📝 FINAL NOTES

### What's Already Complete
- ✅ All database tables and schemas
- ✅ All storage buckets and policies
- ✅ All RLS policies
- ✅ Basic document sharing workflow
- ✅ Analytics tracking infrastructure
- ✅ Email verification system
- ✅ NDA acceptance workflow
- ✅ Branding system
- ✅ Custom domains
- ✅ Webhook system
- ✅ API key management

### What This Plan Adds
- 🔒 **Security**: Password security, access control enforcement, rate limiting
- 📄 **File Support**: Office documents, videos, audio, text files
- 👥 **Recipient Features**: "Shared with me" dashboard
- 📁 **Bulk Operations**: Folder import with hierarchy preservation
- 🔄 **Version Control**: UI for document versioning
- 🔐 **Permissions**: Granular permission management UI
- 📊 **Analytics Export**: CSV/PDF/Excel export functionality
- 🏢 **Enterprise**: Production SAML, audit logs, WebSocket, AI chat

### Success Criteria
- All security vulnerabilities fixed
- All file types render correctly
- Recipients can view shared documents
- Folder uploads preserve structure
- Version control works end-to-end
- Permissions are granular and enforceable
- Analytics can be exported in multiple formats
- (Optional) SSO, audit logs, real-time, and AI work in production

---

**END OF PLAN**