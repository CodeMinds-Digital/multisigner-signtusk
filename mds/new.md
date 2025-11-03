I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---

## Comment 1: Received view now avoids subquery, but filters signer_email using userId, returning no results.

Review the received-view logic in \`src/lib/signature/core/signature-service.ts#listRequests()\`. The current implementation first queries \`signing_request_signers\` then filters \`signing_requests\` via \`.in('id', requestIds)\`, which is correct structurally. The bug is comparing email to a UUID: \`.eq('signer_email', userId)\`. Fix by either:

Option A (email-based):

- Change \`listRequests()\` signature to accept both \`authUserId\` and \`authUserEmail\`.
- When \`options.view === 'received'\`, query signers using \`.eq('signer_email', authUserEmail)\`.
- Update the route handler \`src/app/api/v1/signatures/requests/route.ts\` to pass \`user.email\`.

Option B (id-based):

- Ensure \`signing_request_signers.signer_id\` is reliably set to the signer’s auth UUID.
- Change the filter to \`.eq('signer_id', authUserId)\`.

Alternatively, remove the two-step and use an inner join: \`from('signing_requests').select('\*, signers:signing_request_signers!inner(\*)', { count: 'exact' }).eq('signers.signer_email', authUserEmail)\` with pagination.

After change, verify received lists return expected records, add a unit test for both id/email matching, and keep pagination/count behavior intact.

### Referred Files

- src/lib/signature/core/signature-service.ts
- src/app/api/v1/signatures/requests/route.ts

---

## Comment 2: getRequest() still compares email to userId; function lacks auth email parameter.

Refactor \`getRequest()\` in \`src/lib/signature/core/signature-service.ts\` to accept \`{ authUserId, authUserEmail }\`. Compute:

- \`isInitiator = request.initiated_by === authUserId\`
- \`isSigner = request.signers?.some(s => s.signer_id === authUserId || s.signer_email === authUserEmail)\`
  Update route handlers:
- \`src/app/api/v1/signatures/requests/[id]/route.ts\` (GET, PATCH, DELETE) to pass both \`user.id\` and \`user.email\`.
- Any other callers (\`sign\` route) to pass both values.
  Alternatively, if you standardize on UUID-only, remove the email check and ensure \`signer_id\` is populated for all signer rows (migrate data), then compare strictly by \`signer_id\`.
  Add tests covering access via initiator, signer by id, and signer by email.

### Referred Files

- src/lib/signature/core/signature-service.ts
- src/app/api/v1/signatures/requests/[id]/route.ts
- src/app/api/v1/signatures/requests/[id]/sign/route.ts

---

## Comment 3: signDocument() still doesn’t verify TOTP; it only checks presence of totp_code.

Implement real TOTP verification in \`signDocument()\` (\`src/lib/signature/core/signature-service.ts\`):

- Import a verifier from \`src/lib/totp-service.ts\` (e.g., \`TOTPService.verifyTOTP\`).
- After checking \`require_totp\`, call \`const res = await TOTPService.verifyTOTP(userId, input.totp_code!, 'signing')\`.
- If \`!res.success\`, throw \`createValidationError(res.error || 'Invalid TOTP code', 'totp_code')\`.
- Optionally update signer row with \`totp_verified\` fields if available.
- Add unit tests for valid/invalid TOTP, and ensure behavior toggles based on \`require_totp\`.
  Avoid hard dependencies by allowing the verifier to be injected in the service constructor for easier mocking.

### Referred Files

- src/lib/signature/core/signature-service.ts
- src/lib/totp-service.ts

---

## Comment 4: Template apply still sends empty signer emails and skips merged request validation.

Fix the template apply flow in \`src/app/api/v1/signatures/templates/[id]/apply/route.ts\`:

- Build \`requestData\` from template defaults and overrides but DO NOT default \`signer_email\` to empty string.
- If placeholders are allowed, mark them via a \`placeholder\` field and omit \`signer_email\` entirely; otherwise require an override.
- Validate \`requestData\` with \`CreateSignatureRequestSchema\` before calling \`signatureService.createRequest()\`; return 400 on validation failure.
- Update tests to cover placeholder vs concrete signers.
  Ensure \`signatureService.createRequest()\` doesn’t accept invalid emails silently.

### Referred Files

- src/app/api/v1/signatures/templates/[id]/apply/route.ts
- src/lib/signature/validation/signature-validation-schemas.ts

---

## Comment 5: Offline sync still posts to \`/requests/sign\`; missing request id in path.

Update the offline sync endpoint in \`src/lib/signature/offline-service.ts\`:

- Change fetch URL to \`/api/v1/signatures/requests/\${signature.signature_request_id}/sign\`.
- Keep the same body payload.
- Ensure auth context is available when syncing (e.g., cookies or token) or consider a signer-link token endpoint.
- Add a test for \`syncPendingSignatures()\` to assert correct endpoint and success path.

### Referred Files

- src/lib/signature/offline-service.ts
- src/app/api/v1/signatures/requests/[id]/sign/route.ts

---

## Comment 6: SignatureField shape remains inconsistent between types and services/components.

Normalize \`SignatureField\` across code:

- Option A: Promote \`x/y/width/height/page\` to top-level in \`types/signature-types.ts\` and remove the \`position\` wrapper.
- Option B: Keep the nested \`position\` object in types and update \`FieldService\` and \`FieldPositioner\` to read/write \`field.position.{x,y,width,height,page}\` consistently.
- Migrate any persisted field configurations if schema changes.
- Add type-checked unit tests to prevent regressions.

### Referred Files

- src/lib/signature/types/signature-types.ts
- src/lib/signature/fields/field-service.ts
- src/components/features/signatures/fields/FieldPositioner.tsx

---

## Comment 7: \`SignerEngagementMetrics\` is declared twice with conflicting properties in types file.

Consolidate \`SignerEngagementMetrics\` into a single interface in \`src/lib/signature/types/signature-types.ts\` with the intended fields. Remove the duplicate declaration. Update \`analytics-service.ts\` and \`AnalyticsDashboard.tsx\` to use the final shape consistently. Add a type test or a build check to prevent duplicate interface names.

### Referred Files

- src/lib/signature/types/signature-types.ts
- src/lib/signature/analytics-service.ts
- src/components/features/signatures/analytics/AnalyticsDashboard.tsx

---

## Comment 8: Bulk result shape still mismatches: missing \`code\` in errors and unexpected \`data\` payload.

Align bulk result types:

- Update \`extractErrors()\` to additionally include a \`code\` (e.g., map known errors to codes or default to \`UNKNOWN_ERROR\`).
- Either (A) extend \`BulkOperationResult\` in \`types\` with an optional \`payload\` field for export metadata, or (B) return export data directly from the API route while keeping \`BulkOperationResult\` for operation stats.
- Update UI (\`BulkActionsPanel.tsx\`) to read the aligned field.
- Add tests for each bulk op to validate response shape.

### Referred Files

- src/lib/signature/bulk-operations-service.ts
- src/components/features/signatures/bulk/BulkActionsPanel.tsx
- src/lib/signature/types/signature-types.ts

---

## Comment 9: Rate limiting middleware is still absent from v1 routes; endpoints remain unprotected.

Implement and wire rate limiting:

- Create a \`checkRateLimit(userId, ip, key)\` helper using Redis/Upstash with per-user/IP quotas (e.g., 100/hour) in \`src/middleware/signature-validation.ts\` or a new middleware file.
- In \`requests\` (GET/POST), \`requests/[id]/sign\` (POST), \`requests/bulk\` (POST), \`analytics\` (GET), and \`templates\` (GET/POST), call \`checkRateLimit\` at the top and return 429 when exceeded.
- Add tests to assert 429 behavior and proper headers (\`Retry-After\`).

### Referred Files

- src/middleware/signature-validation.ts
- src/app/api/v1/signatures/requests/route.ts
- src/app/api/v1/signatures/requests/[id]/sign/route.ts
- src/app/api/v1/signatures/requests/bulk/route.ts
- src/app/api/v1/signatures/analytics/route.ts
- src/app/api/v1/signatures/templates/route.ts

---

## Comment 10: No caching implemented for templates and analytics; all requests hit Supabase directly.

Add short-lived caching:

- Introduce a cache client (Upstash Redis) and create helpers to \`getCache(key)\` / \`setCache(key, value, ttl)\` in a shared util.
- Wrap template list and analytics results with cache lookups using keys like \`signature:templates:\${user.id}:\${page}:\${pageSize}:\${isPublic}:\${search}\` and \`signature:analytics:\${user.id}:\${metric}:\${from}:\${to}:\${groupBy}\`.
- Set \`Cache-Control\` headers (e.g., \`private, max-age=300\`).
- Invalidate template cache on create/update/delete.
- Add tests to verify cache hits/misses.

### Referred Files

- src/app/api/v1/signatures/templates/route.ts
- src/app/api/v1/signatures/analytics/route.ts

---

## Comment 11: Index migration still targets unrelated tables; signature-specific tables remain unoptimized.

Rewrite \`database/migrations/002_signature_indexes.sql\` to create indexes for:

- \`signing_requests\`: \`(initiated_by, status)\`, partial on \`expires_at\` for active statuses, and \`created_at DESC\`.
- \`signing_request_signers\`: \`(signer_email, status)\` and \`(signing_request_id, signing_order)\`.
  Remove unrelated document indexes. Add \`IF NOT EXISTS\` guards. Include comments. Re-run migration in dev and update docs.

### Referred Files

- database/migrations/002_signature_indexes.sql

---

## Comment 12: Legacy services are still present as empty files instead of being removed or stubbed.

Remove the legacy empty service files or replace their default export with a stub that throws a clear deprecation error instructing to import \`src/lib/signature/core/signature-service.ts\` instead. Run a project-wide search to update any remaining imports to the new service. Add a lint rule or TS path mapping to prevent usage.

### Referred Files

- src/lib/signature-request-service.ts
- src/lib/unified-signature-service.ts
- src/lib/multi-signature-service.ts
- src/lib/signing-workflow-service.ts

---

## Comment 13: Analytics still computed in memory; no SQL aggregation or RPC functions implemented.

Move analytics to SQL:

- For completion rates, use \`COUNT(\*) FILTER (WHERE ...)\` in a single query grouped by status and date where needed.
- For signer engagement, aggregate on the DB (AVG time differences using \`EXTRACT(EPOCH FROM (signed_at - viewed_at))\` etc.).
- For trends, group by date/week/month using \`date_trunc()\`.
  Optionally create RPC functions for complex metrics. Limit selected columns, add necessary indexes, and paginate where appropriate. Update service methods and tests accordingly.

### Referred Files

- src/lib/signature/analytics-service.ts

---

## Comment 14: Documentation and tests are still empty files; quality gates not met.

Populate documentation and tests:

- Fill API docs with endpoints, request/response, error codes, pagination, rate limits.
- Complete the workflow guide and migration guide with before/after examples.
- Implement unit tests for \`SignatureService\` and \`TemplateService\`, integration tests for API routes, and Playwright E2E tests for main flows.
- Add CI to enforce >80% coverage and run E2E on PRs.

### Referred Files

- docs/api/signatures/README.md
- docs/guides/signature-workflows.md
- PROJECT_DOCUMENTATION/docs/implementation/SIGN_MODULE_MIGRATION_GUIDE.md
- __tests__/lib/signature-service.test.ts
- __tests__/lib/signature/template-service.test.ts
- __tests__/api/signatures/requests.test.ts
- __tests__/e2e/signature-workflow.spec.ts

---

## Comment 15: Actor-to-signer mapping not enforced; users could sign for another signer.

Before updating the signer row, assert the actor matches the signer:

- Fetch the signer record and check \`signer.signer_id === userId\` OR (if email-based flow) compare the authenticated email to \`signer.signer_email\`.
- If mismatch, throw \`createAuthError('You cannot sign on behalf of another user', 'signature', 'sign')\`.
- Add tests ensuring mismatched actor is rejected for both sequential and parallel flows.

### Referred Files

- src/lib/signature/core/signature-service.ts

---

## Comment 16: Audit logging still omits IP/user-agent; route handlers don’t pass context.

Extend \`logAuditEvent()\` signature to include \`ip?: string, userAgent?: string\`. In route handlers, read \`request.headers.get('x-forwarded-for') || request.ip\` and \`request.headers.get('user-agent')\` and pass them to service calls. Update the insert to include \`ip_address\` and \`user_agent\`. Ensure \`signDocument()\` logs the signer’s context. Add tests verifying audit entries capture IP/UA.

### Referred Files

- src/lib/signature/core/signature-service.ts
- src/app/api/v1/signatures/requests/[id]/sign/route.ts
- database/migrations/003_signature_audit_improvements.sql

---

## Comment 17: Requests API lacks query validation/clamping; arbitrary pageSize/status accepted.

Validate queries in the API route:

- Use \`PaginationSchema\` and \`SignatureRequestFilterSchema\` to parse \`page\`, \`pageSize\`, \`status\`, \`view\`, \`search\`.
- Clamp \`pageSize\` to \`SIGNATURE_CONFIG.pagination.MAX_PAGE_SIZE\` and reject invalid \`status\` values (enum only).
- Return 400 on validation errors. Keep service-level clamping as a backstop.
  Add tests covering large pageSize and invalid status cases.

### Referred Files

- src/app/api/v1/signatures/requests/route.ts
- src/lib/signature/validation/signature-validation-schemas.ts

---
