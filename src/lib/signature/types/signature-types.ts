/**
 * Comprehensive TypeScript types and interfaces for the signature module
 * Eliminates 'any' types and provides strict type safety
 */

// ============================================================================
// Enums
// ============================================================================

export enum SignatureStatus {
  INITIATED = 'initiated',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum SignerStatus {
  PENDING = 'pending',
  SENT = 'sent',
  VIEWED = 'viewed',
  SIGNED = 'signed',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum SigningOrder {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

export enum SignatureMethod {
  DRAW = 'draw',
  TYPE = 'type',
  UPLOAD = 'upload',
}

export enum SignatureType {
  SINGLE = 'single',
  MULTI = 'multi',
}

export enum AuditAction {
  CREATED = 'created',
  SENT = 'sent',
  VIEWED = 'viewed',
  SIGNED = 'signed',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REMINDED = 'reminded',
  EXTENDED = 'extended',
  UPDATED = 'updated',
  DELETED = 'deleted',
}

// ============================================================================
// Core Types
// ============================================================================

export interface SignatureRequest {
  id: string
  document_id: string
  initiated_by: string
  title: string
  description?: string
  signature_type: SignatureType
  signing_order: SigningOrder
  status: SignatureStatus
  total_signers: number
  completed_signers: number
  viewed_signers: number
  require_totp: boolean
  expires_at?: string
  created_at: string
  updated_at: string
  completed_at?: string
  metadata: Record<string, unknown>
}

export interface Signer {
  id: string
  signing_request_id: string
  signer_id?: string
  signer_email: string
  signer_name?: string
  signing_order: number
  status: SignerStatus
  signature_data?: string
  signature_method?: SignatureMethod
  signature_metadata?: Record<string, unknown>
  sent_at?: string
  viewed_at?: string
  signed_at?: string
  declined_at?: string
  decline_reason?: string
  ip_address?: string
  user_agent?: string
  location?: {
    country?: string
    region?: string
    city?: string
    latitude?: number
    longitude?: number
  }
  created_at: string
  updated_at: string
}

export interface SigningSession {
  id: string
  signing_request_id: string
  signer_id: string
  access_token: string
  expires_at: string
  fields_completed: string[]
  last_activity_at: string
  created_at: string
}

export interface SignatureAuditLog {
  id: string
  signature_request_id: string
  signer_id?: string
  action: AuditAction
  details: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// ============================================================================
// Result Types
// ============================================================================

export interface ErrorRecoverySuggestion {
  action: string
  description: string
}

export interface ErrorDetails {
  code: string
  message: string
  statusCode: number
  field?: string
  details?: Record<string, unknown>
  timestamp: string
  recoverySuggestions?: ErrorRecoverySuggestion[]
}

export interface Result<T> {
  success: boolean
  data?: T
  error?: ErrorDetails
}

export interface PaginationMetadata {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export interface PaginatedResult<T> {
  success: boolean
  data?: T[]
  pagination?: PaginationMetadata
  error?: ErrorDetails
}

// ============================================================================
// Statistics and Analytics Types
// ============================================================================

export interface SignatureStats {
  total_requests: number
  completed_requests: number
  pending_requests: number
  expired_requests: number
  cancelled_requests: number
  completion_rate: number
  average_time_to_complete: number // in hours
  total_signers: number
  completed_signers: number
}

export interface GeographicDistribution {
  country: string
  region?: string
  total_signatures: number
  completion_rate: number
}

export interface TrendData {
  date: string
  total_requests: number
  completed_requests: number
  completion_rate: number
}

// ============================================================================
// Template Types
// ============================================================================

export interface SignatureTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  is_public: boolean
  default_signers: TemplateSignerConfig[]
  signing_order: SigningOrder
  require_totp: boolean
  expires_in_days: number
  usage_count: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface TemplateSignerConfig {
  email?: string
  name?: string
  signing_order: number
  placeholder?: string // e.g., "Client", "Manager", "Legal"
}

// ============================================================================
// Field Types (for field positioning)
// ============================================================================

export enum FieldType {
  SIGNATURE = 'signature',
  INITIALS = 'initials',
  DATE = 'date',
  TEXT = 'text',
  CHECKBOX = 'checkbox',
  DROPDOWN = 'dropdown',
}

export interface SignatureField {
  id: string
  type: FieldType
  assigned_to?: string // signer_id or placeholder
  position: {
    x: number // percentage
    y: number // percentage
    width: number // percentage
    height: number // percentage
    page: number
  }
  required: boolean
  validation?: {
    format?: string
    min_length?: number
    max_length?: number
  }
  options?: string[] // for dropdown
  value?: string
  completed: boolean
}

export interface FieldConfiguration {
  document_template_id: string
  fields: SignatureField[]
  created_at: string
  updated_at: string
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

export enum BulkOperationType {
  REMIND = 'remind',
  CANCEL = 'cancel',
  EXPORT = 'export',
  DELETE = 'delete',
  EXTEND_EXPIRATION = 'extend_expiration',
  RESEND = 'resend',
}

export interface BulkOperationRequest {
  operation: BulkOperationType
  request_ids: string[]
  parameters?: Record<string, unknown>
}

export interface BulkOperationError {
  id: string
  error: string
  code: string
}

export interface BulkOperationResult {
  total: number
  successful: number
  failed: number
  errors: BulkOperationError[]
  duration: number // in milliseconds
  payload?: Record<string, unknown> // Optional payload for export operations (Comment 8)
}

// ============================================================================
// Input/Request Types
// ============================================================================

export interface CreateSignatureRequestInput {
  document_id: string
  title: string
  description?: string
  signers: CreateSignerInput[]
  signature_type?: SignatureType
  signing_order?: SigningOrder
  require_totp?: boolean
  expires_in_days?: number
  metadata?: Record<string, unknown>
}

export interface CreateSignerInput {
  signer_id?: string
  signer_email: string
  signer_name?: string
  signing_order?: number
}

export interface SignDocumentInput {
  signature_request_id: string
  signer_id: string
  signature_data: string
  signature_method: SignatureMethod
  totp_code?: string
}

export interface UpdateSignerStatusInput {
  signer_id: string
  status: SignerStatus
  decline_reason?: string
}

export interface UpdateSignatureRequestInput {
  title?: string
  description?: string
  expires_at?: string
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface CompletionRateMetrics {
  total: number
  completed: number
  pending: number
  expired: number
  cancelled: number
  completion_rate: number
  average_time_to_complete_hours: number
}

export interface SignerEngagementMetrics {
  total_signers: number
  viewed_signers: number
  signed_signers: number
  view_rate: number
  sign_rate: number
  average_time_to_view_hours: number
  average_time_to_sign_hours: number
}

export interface TimeToSignMetrics {
  average_hours: number
  median_hours: number
  p95_hours: number
  p99_hours: number
  min_hours: number
  max_hours: number
  sample_size: number
}

export interface AnalyticsData {
  period: string
  total: number
  completed: number
  completion_rate: number
}

// ============================================================================
// Expiration Types
// ============================================================================

export interface ExpirationCheckResult {
  checked: number
  expired: number
  warnings_sent: number
  errors: Array<{ id: string; error: string }>
}

// ============================================================================
// Offline Types
// ============================================================================

export interface OfflineSignature {
  id?: number
  signature_request_id: string
  signer_id: string
  signature_data: string
  signature_method: SignatureMethod
  timestamp?: string
  synced?: boolean
  synced_at?: string
  metadata?: Record<string, unknown>
}

export interface OfflineStatus {
  is_online: boolean
  pending_signatures: number
  last_sync: string | null
}

// ============================================================================
// Utility Types
// ============================================================================

export type PartialSignatureRequest = Partial<SignatureRequest>
export type RequiredSignatureRequest = Required<SignatureRequest>
export type SignatureRequestUpdate = Pick<SignatureRequest, 'title' | 'description' | 'expires_at'>
