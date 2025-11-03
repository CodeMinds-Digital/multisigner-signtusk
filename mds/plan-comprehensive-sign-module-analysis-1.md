I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

## Current State Analysis

The Sign module has **4 overlapping signature services** (`signature-request-service.ts`, `unified-signature-service.ts`, `multi-signature-service.ts`, `signing-workflow-service.ts`) causing confusion and maintenance burden. Error handling is inconsistent (some return null, others return error objects), input validation is missing or incomplete, and there are hardcoded values throughout. The module lacks comprehensive testing, has performance bottlenecks (no pagination, sequential queries), and is missing critical features like templates, bulk operations, and advanced analytics.

**Strengths**: Good security (TOTP, JWT), real-time updates, PDF generation, and normalized database schema.
**Critical Issues**: Service redundancy, inconsistent patterns, missing validation, poor type safety, and incomplete test coverage.


### Approach

## Comprehensive Sign Module Improvement Plan

This plan addresses all identified weaknesses and required improvements in the Sign module through a systematic, phased approach:

**Phase 1: Foundation (Weeks 1-2)** - Service consolidation, error handling standardization, and input validation
**Phase 2: Performance & Quality (Weeks 3-4)** - Query optimization, caching, and comprehensive testing
**Phase 3: Features (Weeks 5-8)** - Templates, bulk operations, analytics, and expiration management
**Phase 4: UX Enhancement (Weeks 9-10)** - Design system, loading states, and mobile optimization
**Phase 5: Advanced Features (Weeks 11-12)** - Field positioning and offline support

Each phase builds upon the previous, ensuring stability while adding functionality.


### Reasoning

I reviewed the comprehensive analysis document which identified 7 code-level weaknesses, 5 module structure issues, and 5 categories of required improvements. I then examined the existing signature service files to understand the current implementation patterns, service overlap, and architectural issues. This revealed significant redundancy across four signature services with inconsistent APIs and error handling approaches.


## Mermaid Diagram

sequenceDiagram
    participant User
    participant API
    participant SignatureService
    participant TemplateService
    participant ValidationMiddleware
    participant Database
    participant NotificationService
    participant PDFService

    Note over User,PDFService: Phase 1: Service Consolidation & Validation

    User->>API: POST /api/v1/signatures/requests
    API->>ValidationMiddleware: Validate request data
    ValidationMiddleware->>ValidationMiddleware: Apply Zod schema
    alt Validation fails
        ValidationMiddleware-->>API: 400 Validation Error
        API-->>User: Error response
    end
    
    ValidationMiddleware->>SignatureService: createRequest(validated data)
    SignatureService->>Database: Insert signature_request
    SignatureService->>Database: Insert signers
    SignatureService->>Database: Log audit event
    SignatureService-->>API: Success result
    API->>NotificationService: Send notifications to signers
    API-->>User: 201 Created

    Note over User,PDFService: Phase 3: Template Application

    User->>API: GET /api/v1/signatures/templates
    API->>TemplateService: listTemplates(userId)
    TemplateService->>Database: Query templates
    TemplateService-->>API: Template list
    API-->>User: Templates

    User->>API: POST /api/v1/signatures/templates/{id}/apply
    API->>TemplateService: applyTemplate(templateId, overrides)
    TemplateService->>Database: Get template
    TemplateService->>TemplateService: Merge defaults with overrides
    TemplateService->>SignatureService: createRequest(merged data)
    SignatureService->>Database: Create request
    TemplateService->>Database: Increment usage_count
    TemplateService-->>API: Created request
    API-->>User: 201 Created

    Note over User,PDFService: Signing Flow

    User->>API: POST /api/v1/signatures/requests/{id}/sign
    API->>SignatureService: signDocument(params)
    SignatureService->>Database: Validate signer permissions
    alt Sequential signing - not signer's turn
        SignatureService-->>API: 403 Not your turn
        API-->>User: Error
    end
    
    SignatureService->>Database: Update signer status
    SignatureService->>Database: Check completion
    alt All signers completed
        SignatureService->>PDFService: Generate final PDF
        PDFService->>Database: Store signed PDF
        SignatureService->>NotificationService: Notify completion
    end
    SignatureService-->>API: Success
    API-->>User: 200 Signed

## Proposed File Changes

### src/lib/signature/core/signature-service.ts(NEW)

References: 

- src/lib/signature-request-service.ts(DELETE)
- src/lib/unified-signature-service.ts(DELETE)
- src/lib/multi-signature-service.ts(DELETE)
- src/lib/signing-workflow-service.ts(DELETE)

Create a unified, consolidated SignatureService that replaces all existing signature services (`signature-request-service.ts`, `unified-signature-service.ts`, `multi-signature-service.ts`, `signing-workflow-service.ts`). This service will provide a single, authoritative API for all signature operations with clear method organization:

- **Request Management**: createRequest, getRequest, listRequests, updateRequest, cancelRequest, deleteRequest
- **Signer Management**: addSigner, removeSigner, updateSignerStatus, getSignerDetails
- **Signing Operations**: signDocument, verifySignature, validateSigningPermission
- **Workflow Control**: processSequentialSigning, handleParallelSigning, checkCompletion
- **Analytics**: getRequestStats, getSignerMetrics, getCompletionRates

Implement standardized error handling using custom error classes (SignatureError, ValidationError, AuthorizationError) with consistent return types: `Promise<Result<T>>` where Result = `{ success: boolean; data?: T; error?: ErrorDetails }`. Include comprehensive JSDoc comments for all public methods. Use dependency injection for Supabase client to enable testing.

### src/lib/signature/validation/signature-validation-schemas.ts(NEW)

Create comprehensive Zod validation schemas for all signature-related inputs:

- **CreateSignatureRequestSchema**: Validates document_id (UUID), title (1-255 chars), signers array (1-50 signers), signature_type (enum), signing_order (enum), expires_in_days (1-365), metadata (object)
- **SignerSchema**: Validates email (RFC 5322), name (1-100 chars), signing_order (positive integer), signer_id (UUID)
- **SignDocumentSchema**: Validates signature_request_id (UUID), signer_id (UUID), signature_data (base64 or data URL), signature_method (enum: draw, type, upload)
- **UpdateSignerStatusSchema**: Validates status transitions, required fields per status
- **BulkOperationSchema**: Validates request_ids array (max 100), operation type, batch parameters

Include custom refinements for business rules (e.g., sequential signing order must be unique, parallel signing allows duplicates). Export typed interfaces derived from schemas using `z.infer<typeof Schema>`. Add helper functions for common validations: isValidEmail, isValidUUID, isValidSignatureData.

### src/lib/signature/errors/signature-errors.ts(NEW)

Define custom error classes for standardized error handling across the signature module:

- **SignatureError** (base class): Extends Error with code, statusCode, details properties
- **ValidationError**: For input validation failures (400)
- **AuthorizationError**: For permission/access issues (403)
- **NotFoundError**: For missing resources (404)
- **ConflictError**: For state conflicts (409) - e.g., already signed
- **ExpirationError**: For expired requests (410)
- **RateLimitError**: For rate limiting (429)

Each error class includes:
- Unique error code (e.g., 'SIGNATURE_REQUEST_NOT_FOUND')
- HTTP status code
- User-friendly message
- Technical details object
- Timestamp

Implement error factory functions: createValidationError, createAuthError, etc. Add error serialization for API responses and logging. Include error recovery suggestions in details object.

### src/lib/signature/config/signature-config.ts(NEW)

Centralize all signature-related configuration values to eliminate hardcoded magic numbers:

- **Expiration Settings**: DEFAULT_EXPIRATION_DAYS (30), MAX_EXPIRATION_DAYS (365), MIN_EXPIRATION_DAYS (1), EXPIRATION_WARNING_DAYS ([7, 3, 1])
- **Reminder Settings**: MIN_REMINDER_INTERVAL_HOURS (24), MAX_REMINDERS_PER_REQUEST (5), REMINDER_BATCH_SIZE (50)
- **Limits**: MAX_SIGNERS_PER_REQUEST (50), MAX_REQUESTS_PER_USER (1000), MAX_BULK_OPERATION_SIZE (100)
- **Cache Settings**: CACHE_TTL_SECONDS (300), CACHE_KEY_PREFIX ('signature:')
- **Pagination**: DEFAULT_PAGE_SIZE (20), MAX_PAGE_SIZE (100)
- **Analytics**: ANALYTICS_RETENTION_DAYS (999), RECENT_SIGNATURES_LIMIT (100)

Support environment-based overrides using process.env with fallback to defaults. Export typed configuration object with validation. Include configuration validation function to ensure values are within acceptable ranges.

### src/lib/signature/types/signature-types.ts(NEW)

References: 

- src/lib/signature-request-service.ts(DELETE)
- src/lib/unified-signature-service.ts(DELETE)

Define comprehensive TypeScript types and interfaces for the signature module, eliminating 'any' types:

- **SignatureRequest**: Complete type with all fields properly typed, including metadata as Record<string, unknown>
- **Signer**: Full signer details with proper status enum, optional fields marked with ?
- **SigningSession**: Session data with access tokens, expiration, field tracking
- **SignatureAuditLog**: Audit trail entry with action enum, details object
- **Result<T>**: Generic result type for service methods
- **PaginatedResult<T>**: Result with pagination metadata (total, page, pageSize, hasMore)
- **SignatureStats**: Analytics and metrics types
- **SignatureTemplate**: Template definition with default signers, settings

Use strict TypeScript types throughout - no 'any', proper null/undefined handling with strict null checks. Export enums for SignatureStatus, SignerStatus, SigningOrder, SignatureMethod. Include utility types: Partial, Required, Pick for common operations.

### src/lib/signature/templates/template-service.ts(NEW)

Implement signature template functionality for reusable workflows:

- **createTemplate**: Save template with name, description, default signers, signing order, TOTP requirements, expiration settings. Validate template data using Zod schema.
- **updateTemplate**: Modify existing template, increment version number, track usage count
- **deleteTemplate**: Soft delete with cascade checks (prevent deletion if actively used)
- **listTemplates**: Get user's templates with pagination, filtering (public/private), sorting
- **getTemplate**: Retrieve single template with full details
- **applyTemplate**: Create signature request from template, merge template defaults with provided overrides
- **shareTemplate**: Make template public/private, manage sharing permissions
- **duplicateTemplate**: Clone existing template with new name

Store templates in new 'signature_templates' table with fields: id, user_id, name, description, is_public, default_signers (JSONB), signing_order, require_totp, expires_in_days, usage_count, last_used_at. Track template usage analytics. Implement template validation to ensure signer emails are valid, signing order is consistent.

### src/lib/signature/bulk/bulk-operations-service.ts(NEW)

Implement bulk operations for efficient high-volume management:

- **bulkRemind**: Send reminders to multiple requests using Promise.allSettled for parallel execution, return BulkResult with success/failure counts and error details
- **bulkCancel**: Cancel multiple requests with authorization checks, update status in batch
- **bulkExport**: Export multiple requests to PDF/CSV/JSON, generate zip archive for download
- **bulkUpdateExpiration**: Extend expiration for multiple requests
- **bulkDelete**: Delete multiple requests with cascade handling
- **bulkResend**: Resend notifications to pending signers across multiple requests

Implement rate limiting (max 100 operations per batch), progress tracking using Redis for long-running operations, error aggregation with detailed failure reasons. Use database transactions for atomic operations. Return BulkResult type: { total, successful, failed, errors: Array<{id, error}>, duration }. Queue large bulk operations using job queue for async processing. Implement retry logic with exponential backoff for failed operations.

### src/lib/signature/analytics/analytics-service.ts(NEW)

References: 

- src/lib/upstash-analytics.ts

Create advanced analytics service for signature insights:

- **getCompletionRate**: Calculate completion metrics (total, completed, pending, expired, completion percentage, average time to complete) with date range filtering
- **getSignerEngagement**: Track view-to-sign conversion, time from send to view, time from view to sign, reminder effectiveness
- **getGeographicDistribution**: Use IP geolocation data to group signatures by country/region, calculate signing rates by location
- **getTimeToSignMetrics**: Analyze average, median, p95, p99 signing times, identify bottlenecks
- **getDocumentTypeAnalytics**: Break down signatures by document type, identify popular templates
- **getTrendAnalytics**: Time-series data for signatures over time (daily, weekly, monthly)
- **getSignerPerformance**: Identify fast/slow signers, track individual signer metrics
- **exportAnalytics**: Generate CSV/Excel/PDF reports with charts and visualizations

Implement efficient queries with proper indexing, use Redis for caching frequently accessed metrics (5-minute TTL). Support custom date ranges, filtering by status/type/signer. Return structured analytics data with metadata (calculation_time, data_points, filters_applied). Integrate with existing `upstash-analytics.ts` for real-time tracking.

### src/lib/signature/expiration/expiration-service.ts(NEW)

References: 

- src/lib/notification-service.ts

Implement automated document expiration management:

- **checkExpirations**: Cron job handler to find expiring/expired requests, process in batches
- **expireRequest**: Mark request as expired, update all pending signers to expired status, send expiration notifications
- **sendExpirationWarning**: Send warnings at 7, 3, 1 days before expiration using email and in-app notifications
- **extendExpiration**: Extend expiration date by specified days, validate extension limits (max 365 days total)
- **requestExtension**: Allow signers to request extension, notify request initiator
- **autoArchiveExpired**: Move expired requests to archive after retention period
- **getExpiringRequests**: List requests expiring within specified timeframe

Implement using QStash for scheduled execution (daily at midnight UTC). Use database triggers to automatically update request status when expires_at is reached. Track expiration events in audit log. Send multi-channel notifications (email, in-app, webhook). Implement grace period (24 hours) before hard expiration. Cache expiration warnings to prevent duplicate sends. Integrate with notification preferences to respect user settings.

### src/lib/signature/fields/field-service.ts(NEW)

Implement signature field positioning and management:

- **saveFieldConfiguration**: Store field positions, types, assignments to document template
- **getFieldConfiguration**: Retrieve field layout for document
- **validateFieldAssignments**: Ensure all required fields are assigned, all signers have fields, no overlapping positions
- **assignFieldToSigner**: Link field to specific signer
- **updateFieldPosition**: Modify field coordinates and dimensions
- **deleteField**: Remove field from configuration
- **duplicateField**: Clone field with new position
- **getFieldTemplates**: Retrieve predefined field layouts

Support field types: signature, initials, date, text, checkbox, dropdown. Store field data in document_templates.schemas as JSONB array. Implement field validation rules (required, format, min/max length). Support conditional fields (show/hide based on other field values). Calculate field positions as percentages for responsive rendering. Validate field positions don't overlap using bounding box collision detection. Track field completion status per signer.

### src/lib/signature/offline/offline-service.ts(NEW)

Implement offline signing support for mobile devices:

- **saveOfflineSignature**: Store signature data in IndexedDB with request metadata
- **syncPendingSignatures**: Upload queued signatures when connection restored
- **getOfflineRequests**: Retrieve cached requests available for offline signing
- **cacheRequestForOffline**: Download request data and document for offline access
- **clearOfflineData**: Remove cached data after successful sync
- **getOfflineStatus**: Check sync status, pending operations count
- **handleConflicts**: Resolve conflicts if request state changed while offline

Use IndexedDB for client-side storage with 'signatures' database. Implement service worker for offline detection and background sync. Store minimal data: request_id, signer_id, signature_data, timestamp, metadata. Implement conflict resolution: server state wins, notify user of conflicts. Add retry logic with exponential backoff for failed syncs. Show offline indicator in UI. Validate signature data before sync. Encrypt sensitive data in IndexedDB using Web Crypto API.

### src/middleware/signature-validation.ts(NEW)

References: 

- src/lib/signature/validation/signature-validation-schemas.ts(NEW)

Create Next.js middleware for request validation:

- **validateSignatureRequest**: Middleware to validate incoming signature request data using Zod schemas before reaching route handlers
- **validateSigner**: Validate signer data and permissions
- **validateBulkOperation**: Validate bulk operation parameters and limits
- **sanitizeInput**: Sanitize user inputs to prevent XSS/injection attacks
- **checkRateLimit**: Implement rate limiting per user/IP

Use Zod schemas from `signature-validation-schemas.ts` for validation. Return standardized error responses (400) with detailed validation errors. Log validation failures for security monitoring. Implement request sanitization using DOMPurify or similar. Add rate limiting using Redis (max 100 requests/hour per user). Support validation bypass for internal API calls. Include request ID in all responses for tracing.

### src/app/api/v1/signatures/requests/route.ts(NEW)

References: 

- src/lib/signature/core/signature-service.ts(NEW)
- src/lib/signature/validation/signature-validation-schemas.ts(NEW)

Create versioned API route for signature request CRUD operations:

- **GET**: List signature requests with pagination, filtering (status, type, date range), sorting. Support query params: page, pageSize, status, signature_type, from_date, to_date, sort_by, sort_order
- **POST**: Create new signature request using consolidated SignatureService. Validate input with Zod schema, check user permissions, return created request with 201 status

Implement using new `signature-service.ts` with proper error handling. Return paginated results with metadata (total, page, hasMore). Use middleware for authentication and validation. Support both sent and received requests via query param (view=sent|received). Implement response caching with 5-minute TTL. Add request/response logging for audit trail. Return consistent error format using custom error classes.

### src/app/api/v1/signatures/requests/[id]/route.ts(NEW)

References: 

- src/lib/signature/core/signature-service.ts(NEW)

Create API route for individual signature request operations:

- **GET**: Retrieve single request with full details (signers, progress, audit trail). Check user has access (initiator or signer)
- **PATCH**: Update request (title, description, expiration). Validate only initiator can update
- **DELETE**: Delete request with cascade handling. Validate only initiator can delete, prevent deletion if partially signed

Use SignatureService methods with proper authorization checks. Return 404 for not found, 403 for unauthorized access. Include related data (document info, signer details, completion progress). Support partial updates via PATCH. Implement soft delete with archive. Log all operations to audit trail. Return updated resource after PATCH.

### src/app/api/v1/signatures/requests/[id]/sign/route.ts(NEW)

References: 

- src/lib/signature/core/signature-service.ts(NEW)
- src/lib/totp-service.ts

Create API route for signing documents:

- **POST**: Sign document with signature data. Validate signer permissions (sequential order check), signature data format, TOTP if required. Update signer status, check request completion, trigger PDF generation if complete

Validate signature_data (base64 image or data URL), signature_method (draw/type/upload). For sequential signing, verify it's signer's turn. Generate cryptographic signature hash. Update signer record with signature, timestamp, IP, user agent. Log signing event to audit trail. Trigger completion workflow if all signers done. Send notifications to other signers and initiator. Return updated request status and next signer info.

### src/app/api/v1/signatures/requests/bulk/route.ts(NEW)

References: 

- src/lib/signature/bulk/bulk-operations-service.ts(NEW)

Create API route for bulk operations:

- **POST**: Execute bulk operations (remind, cancel, export, delete, extend). Validate operation type and request_ids array (max 100). Return BulkResult with success/failure details

Support operations: 'remind', 'cancel', 'export', 'delete', 'extend_expiration'. Validate user owns all requests in bulk operation. Use BulkOperationsService for execution. Implement async processing for large batches (>50 items) using job queue. Return job_id for async operations with status endpoint. For sync operations, return immediate results. Include detailed error information per failed item. Implement rate limiting (max 5 bulk operations per hour).

### src/app/api/v1/signatures/templates/route.ts(NEW)

References: 

- src/lib/signature/templates/template-service.ts(NEW)

Create API route for signature template management:

- **GET**: List user's templates with pagination, filtering (public/private), search by name
- **POST**: Create new template with validation. Store default signers, settings, metadata

Use TemplateService for operations. Support query params: page, pageSize, is_public, search. Validate template data using Zod schema. Return templates with usage statistics. Implement search using full-text search on name/description. Cache template list with 10-minute TTL. Include template preview data in response.

### src/app/api/v1/signatures/templates/[id]/route.ts(NEW)

References: 

- src/lib/signature/templates/template-service.ts(NEW)

Create API route for individual template operations:

- **GET**: Retrieve template details
- **PATCH**: Update template (name, description, settings)
- **DELETE**: Delete template with usage validation

Validate user owns template or template is public (for GET). Prevent deletion if template is actively used in pending requests. Support template duplication via query param (?action=duplicate). Return usage statistics with template details.

### src/app/api/v1/signatures/templates/[id]/apply/route.ts(NEW)

References: 

- src/lib/signature/templates/template-service.ts(NEW)
- src/lib/signature/core/signature-service.ts(NEW)

Create API route to apply template to create signature request:

- **POST**: Create signature request from template. Merge template defaults with provided overrides (document_id, custom signers, expiration). Validate merged data, create request using SignatureService

Accept overrides for: document_id (required), signers (optional - merge with template defaults), expires_in_days (optional), metadata (optional). Validate final request data. Increment template usage_count. Return created signature request. Support preview mode (dry-run) via query param.

### src/app/api/v1/signatures/analytics/route.ts(NEW)

References: 

- src/lib/signature/analytics/analytics-service.ts(NEW)

Create API route for signature analytics:

- **GET**: Retrieve analytics data based on query params. Support metrics: completion_rate, signer_engagement, geographic_distribution, time_to_sign, trends. Filter by date range, status, signature_type

Use AnalyticsService for data retrieval. Support query params: metric (required), from_date, to_date, status, signature_type, group_by (day/week/month). Return structured analytics with metadata. Implement caching with 5-minute TTL. Support CSV export via Accept header. Include calculation timestamp and data freshness indicator.

### src/app/api/jobs/check-expirations/route.ts(NEW)

References: 

- src/lib/signature/expiration/expiration-service.ts(NEW)

Create cron job endpoint for expiration checking:

- **POST**: Check for expiring/expired requests, send warnings, update statuses. Validate request is from QStash using signature verification

Process in batches of 100 requests. Find requests expiring in 7, 3, 1 days and send warnings. Find expired requests and mark as expired. Use ExpirationService for operations. Implement idempotency using request ID. Log execution results. Return summary: { checked, expired, warnings_sent, errors }. Schedule using QStash to run daily at midnight UTC.

### src/components/features/signatures/templates/TemplateSelector.tsx(NEW)

Create template selection component for signature request creation:

- Display user's templates in grid/list view with search and filtering
- Show template preview with default signers, settings, usage count
- Support template selection with apply action
- Allow creating new template from current form state
- Show public templates from organization

Fetch templates from `/api/v1/signatures/templates`. Implement search with debouncing (300ms). Show template cards with name, description, signer count, usage stats. Support quick actions: apply, edit, duplicate, delete. Implement template preview modal showing full configuration. Use optimistic updates for better UX. Integrate with form context to populate fields when template selected.

### src/components/features/signatures/fields/FieldPositioner.tsx(NEW)

References: 

- src/lib/signature/fields/field-service.ts(NEW)

Create drag-and-drop field positioning component:

- Render PDF document with overlay for field placement
- Support draggable field types: signature, initials, date, text, checkbox, dropdown
- Show field toolbar with available field types
- Display field properties panel for selected field (size, required, assigned signer)
- Implement snap-to-grid for alignment
- Support field resize with handles
- Show field assignments with color coding per signer

Use react-dnd or similar for drag-and-drop. Render PDF using react-pdf. Store field positions as percentages for responsive rendering. Implement collision detection to prevent overlapping fields. Support keyboard navigation for accessibility. Show field validation errors (unassigned required fields). Implement undo/redo for field operations. Save field configuration to FieldService.

### src/components/features/signatures/mobile/MobileSignaturePad.tsx(NEW)

References: 

- src/lib/signature/offline/offline-service.ts(NEW)

Create touch-optimized signature pad for mobile devices:

- Implement canvas-based signature drawing with touch events
- Support pressure sensitivity for stylus input
- Provide clear and save actions
- Show signature preview before saving
- Support signature smoothing and optimization
- Implement offline signature saving

Use HTML5 Canvas with touch event handlers (touchstart, touchmove, touchend). Implement Bezier curve smoothing for natural signature appearance. Support multi-touch prevention (single finger only). Optimize canvas size for mobile screens. Convert signature to base64 PNG for storage. Implement signature validation (minimum stroke count, bounding box size). Show loading state during save. Integrate with OfflineService for offline support. Support biometric authentication before signing.

### src/components/features/signatures/analytics/AnalyticsDashboard.tsx(NEW)

References: 

- src/lib/signature/analytics/analytics-service.ts(NEW)

Create comprehensive analytics dashboard for signature insights:

- Display completion rate chart (line/bar chart showing completion over time)
- Show signer engagement metrics (view-to-sign conversion, average time to sign)
- Render geographic distribution map with signing rates by location
- Display time-to-sign histogram with percentiles
- Show document type breakdown (pie/donut chart)
- Provide date range selector and filters (status, type)
- Support export to CSV/PDF

Fetch data from `/api/v1/signatures/analytics`. Use recharts or similar for visualizations. Implement responsive charts for mobile. Show loading skeletons during data fetch. Cache analytics data with 5-minute TTL. Support real-time updates using polling or WebSocket. Display key metrics in stat cards (total requests, completion rate, avg time). Implement drill-down for detailed views. Show data freshness indicator.

### src/components/features/signatures/bulk/BulkActionsPanel.tsx(NEW)

References: 

- src/lib/signature/bulk/bulk-operations-service.ts(NEW)

Create bulk actions panel for managing multiple signature requests:

- Show checkbox selection for requests in list view
- Display bulk action toolbar when items selected (remind, cancel, export, delete, extend)
- Show confirmation dialog for destructive actions
- Display progress indicator for bulk operations
- Show results summary with success/failure counts
- Support undo for recent bulk actions

Implement selection state management using React context or Zustand. Show selected count in toolbar. Disable actions based on request states (can't remind completed requests). Call `/api/v1/signatures/requests/bulk` for operations. Show progress modal for long-running operations. Display detailed results with expandable error list. Implement optimistic updates with rollback on failure. Support keyboard shortcuts (Ctrl+A for select all).

### __tests__/lib/signature/signature-service.test.ts(NEW)

References: 

- src/lib/signature/core/signature-service.ts(NEW)

Create comprehensive unit tests for SignatureService:

- **createRequest**: Test successful creation, validation errors, duplicate prevention, authorization checks
- **getRequest**: Test retrieval, not found handling, permission checks
- **signDocument**: Test signing flow, sequential order validation, TOTP verification, completion detection
- **updateSignerStatus**: Test status transitions, invalid transitions, audit logging
- **cancelRequest**: Test cancellation, authorization, state validation

Use Vitest as test runner. Mock Supabase client using vi.mock(). Create test fixtures for common data (sample requests, signers). Test error handling and edge cases. Verify audit log entries created. Test pagination and filtering. Achieve >80% code coverage. Use describe/it blocks for organization. Implement setup/teardown for test isolation.

### __tests__/lib/signature/template-service.test.ts(NEW)

References: 

- src/lib/signature/templates/template-service.ts(NEW)

Create unit tests for TemplateService:

- **createTemplate**: Test template creation, validation, duplicate names
- **applyTemplate**: Test template application, override merging, validation
- **listTemplates**: Test pagination, filtering, search
- **deleteTemplate**: Test deletion, usage validation, cascade handling

Mock database calls. Test public/private template visibility. Verify usage count increments. Test template sharing permissions. Achieve >80% coverage.

### __tests__/api/signatures/requests.test.ts(NEW)

References: 

- src/app/api/v1/signatures/requests/route.ts(NEW)

Create integration tests for signature request API routes:

- **GET /api/v1/signatures/requests**: Test listing with pagination, filtering, sorting, authorization
- **POST /api/v1/signatures/requests**: Test creation with valid/invalid data, validation errors
- **GET /api/v1/signatures/requests/[id]**: Test retrieval, not found, unauthorized access
- **PATCH /api/v1/signatures/requests/[id]**: Test updates, validation, authorization
- **DELETE /api/v1/signatures/requests/[id]**: Test deletion, cascade handling, authorization

Use Vitest with supertest or similar for HTTP testing. Mock authentication middleware. Create test database or use transactions with rollback. Test error responses (400, 401, 403, 404). Verify response schemas. Test rate limiting. Achieve >80% coverage.

### __tests__/e2e/signature-workflow.spec.ts(NEW)

Create end-to-end tests for complete signature workflows using Playwright:

- **Single Signature Flow**: Create request, send to signer, signer signs, verify completion, check PDF generation
- **Multi-Signature Sequential**: Create request with 3 signers, verify sequential signing order enforcement, complete all signatures
- **Multi-Signature Parallel**: Create request with parallel signing, verify all can sign simultaneously
- **Expiration Flow**: Create request with short expiration, verify expiration warnings, verify auto-expiration
- **Decline Flow**: Signer declines request, verify status updates, verify notifications
- **Template Flow**: Create template, apply to new request, verify defaults applied

Use Playwright for browser automation. Test across Chrome, Firefox, Safari. Implement page objects for maintainability. Test mobile responsive views. Verify email notifications sent (use email testing service). Test real-time updates. Capture screenshots on failure. Run in CI/CD pipeline.

### database/migrations/001_signature_templates.sql(NEW)

Create database migration for signature templates table:

```sql
CREATE TABLE signature_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  default_signers JSONB DEFAULT '[]',
  signing_order VARCHAR(20) DEFAULT 'sequential',
  require_totp BOOLEAN DEFAULT false,
  expires_in_days INTEGER DEFAULT 30,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_template_name_per_user UNIQUE(user_id, name)
);

CREATE INDEX idx_signature_templates_user_id ON signature_templates(user_id);
CREATE INDEX idx_signature_templates_is_public ON signature_templates(is_public);
CREATE INDEX idx_signature_templates_usage_count ON signature_templates(usage_count DESC);
```

Add RLS policies for user access control. Create trigger for updated_at timestamp.

### database/migrations/002_signature_indexes.sql(NEW)

Create performance optimization indexes for signature tables:

```sql
-- Optimize signature request queries
CREATE INDEX idx_signing_requests_initiated_by_status ON signing_requests(initiated_by, status);
CREATE INDEX idx_signing_requests_expires_at ON signing_requests(expires_at) WHERE status IN ('initiated', 'in_progress');
CREATE INDEX idx_signing_requests_created_at ON signing_requests(created_at DESC);

-- Optimize signer queries
CREATE INDEX idx_signing_request_signers_email_status ON signing_request_signers(signer_email, status);
CREATE INDEX idx_signing_request_signers_request_id_order ON signing_request_signers(signing_request_id, signing_order);

-- Full-text search on title
CREATE INDEX idx_signing_requests_title_search ON signing_requests USING gin(to_tsvector('english', title));
```

Analyze query performance before/after. Document index usage in comments.

### database/migrations/003_signature_audit_improvements.sql(NEW)

Enhance signature audit logging:

```sql
-- Add audit columns to signing_requests
ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add audit columns to signing_request_signers
ALTER TABLE signing_request_signers ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE signing_request_signers ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE signing_request_signers ADD COLUMN IF NOT EXISTS location JSONB;

-- Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signing_requests(id) ON DELETE CASCADE,
  signer_id UUID,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signature_audit_log_request_id ON signature_audit_log(signature_request_id);
CREATE INDEX idx_signature_audit_log_created_at ON signature_audit_log(created_at DESC);
```

### src/lib/signature-request-service.ts(DELETE)

Delete legacy signature-request-service.ts as it's replaced by the new consolidated signature-service.ts. This service has redundant functionality and inconsistent error handling patterns. All functionality is migrated to the new service with improved error handling, validation, and type safety.

### src/lib/unified-signature-service.ts(DELETE)

Delete unified-signature-service.ts as it's consolidated into the new signature-service.ts. While this service had better structure than the legacy service, it still had issues with error handling consistency and lacked comprehensive validation. All functionality is preserved in the new consolidated service.

### src/lib/multi-signature-service.ts(DELETE)

Delete multi-signature-service.ts as specialized multi-signature functionality is integrated into the consolidated signature-service.ts. The new service handles both single and multi-signature workflows through a unified API, eliminating the need for separate services.

### src/lib/signing-workflow-service.ts(DELETE)

Delete signing-workflow-service.ts as workflow management is incorporated into the consolidated signature-service.ts. The new service provides better workflow control with standardized error handling and validation.

### docs/api/signatures/README.md(NEW)

Create comprehensive API documentation for signature endpoints:

- Document all API routes with request/response examples
- Include authentication requirements
- Provide error code reference
- Show pagination and filtering examples
- Document rate limits
- Include code examples in multiple languages (JavaScript, Python, cURL)
- Provide OpenAPI/Swagger specification

Organize by endpoint groups: Requests, Templates, Analytics, Bulk Operations. Include versioning information (v1). Document breaking changes and migration guides. Provide Postman collection for testing. Include webhook documentation for real-time updates.

### docs/guides/signature-workflows.md(NEW)

Create developer guide for implementing signature workflows:

- Explain single vs multi-signature workflows
- Document sequential vs parallel signing
- Provide code examples for common scenarios
- Explain TOTP integration for secure signing
- Document PDF generation and QR verification
- Show template usage patterns
- Explain offline signing implementation
- Provide troubleshooting guide

Include architecture diagrams showing workflow flow. Provide best practices for error handling. Document performance optimization tips. Include security considerations. Show integration examples with popular frameworks.

### PROJECT_DOCUMENTATION/docs/implementation/SIGN_MODULE_MIGRATION_GUIDE.md(NEW)

References: 

- PROJECT_DOCUMENTATION/docs/analysis/SIGN_MODULE_COMPREHENSIVE_ANALYSIS.md

Create migration guide for transitioning from old signature services to new consolidated service:

- Document breaking changes in API
- Provide code migration examples (before/after)
- Explain new error handling patterns
- Document new validation requirements
- Provide migration scripts for database changes
- Include rollback procedures
- Document testing strategy for migration
- Provide timeline and phased rollout plan

Include mapping table showing old methods to new methods. Document deprecated features and alternatives. Provide automated migration tools where possible. Include FAQ section for common migration issues.