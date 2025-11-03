/**
 * Comprehensive Zod validation schemas for all signature-related inputs
 */

import { z } from 'zod'
import { LIMITS_CONFIG, EXPIRATION_CONFIG } from '../config/signature-config'
import {
  SignatureType,
  SigningOrder,
  SignatureMethod,
  SignerStatus,
  SignatureStatus,
  BulkOperationType,
} from '../types/signature-types'

// ============================================================================
// Helper Validators
// ============================================================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export const isValidSignatureData = (data: string): boolean => {
  // Check if it's a base64 string or data URL
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  const dataUrlRegex = /^data:image\/(png|jpeg|jpg);base64,/
  return dataUrlRegex.test(data) || base64Regex.test(data)
}

// ============================================================================
// Base Schemas
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format')

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must not exceed 255 characters')

export const NameSchema = z
  .string()
  .min(1, 'Name must be at least 1 character')
  .max(LIMITS_CONFIG.MAX_SIGNER_NAME_LENGTH, `Name must not exceed ${LIMITS_CONFIG.MAX_SIGNER_NAME_LENGTH} characters`)
  .optional()

export const TitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(LIMITS_CONFIG.MAX_TITLE_LENGTH, `Title must not exceed ${LIMITS_CONFIG.MAX_TITLE_LENGTH} characters`)

export const DescriptionSchema = z
  .string()
  .max(LIMITS_CONFIG.MAX_DESCRIPTION_LENGTH, `Description must not exceed ${LIMITS_CONFIG.MAX_DESCRIPTION_LENGTH} characters`)
  .optional()

// ============================================================================
// Signer Schema
// ============================================================================

export const SignerSchema = z.object({
  signer_id: UUIDSchema.optional(),
  signer_email: EmailSchema,
  signer_name: NameSchema,
  signing_order: z
    .number()
    .int('Signing order must be an integer')
    .positive('Signing order must be positive')
    .optional(),
})

export type SignerInput = z.infer<typeof SignerSchema>

// ============================================================================
// Create Signature Request Schema
// ============================================================================

export const CreateSignatureRequestSchema = z
  .object({
    document_id: UUIDSchema,
    title: TitleSchema,
    description: DescriptionSchema,
    signers: z
      .array(SignerSchema)
      .min(LIMITS_CONFIG.MIN_SIGNERS_PER_REQUEST, `At least ${LIMITS_CONFIG.MIN_SIGNERS_PER_REQUEST} signer is required`)
      .max(LIMITS_CONFIG.MAX_SIGNERS_PER_REQUEST, `Maximum ${LIMITS_CONFIG.MAX_SIGNERS_PER_REQUEST} signers allowed`),
    signature_type: z.nativeEnum(SignatureType).optional().default(SignatureType.SINGLE),
    signing_order: z.nativeEnum(SigningOrder).optional().default(SigningOrder.SEQUENTIAL),
    require_totp: z.boolean().optional().default(false),
    expires_in_days: z
      .number()
      .int('Expiration days must be an integer')
      .min(EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS, `Minimum ${EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS} day`)
      .max(EXPIRATION_CONFIG.MAX_EXPIRATION_DAYS, `Maximum ${EXPIRATION_CONFIG.MAX_EXPIRATION_DAYS} days`)
      .optional()
      .default(EXPIRATION_CONFIG.DEFAULT_EXPIRATION_DAYS),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .refine(
    (data) => {
      // For sequential signing, signing_order must be unique
      if (data.signing_order === SigningOrder.SEQUENTIAL) {
        const orders = data.signers
          .map((s) => s.signing_order)
          .filter((o): o is number => o !== undefined)

        if (orders.length > 0) {
          const uniqueOrders = new Set(orders)
          return uniqueOrders.size === orders.length
        }
      }
      return true
    },
    {
      message: 'For sequential signing, each signer must have a unique signing order',
      path: ['signers'],
    }
  )
  .refine(
    (data) => {
      // Validate signature type matches signer count
      if (data.signature_type === SignatureType.SINGLE && data.signers.length > 1) {
        return false
      }
      return true
    },
    {
      message: 'Single signature type requires exactly one signer',
      path: ['signature_type'],
    }
  )

export type CreateSignatureRequestInput = z.infer<typeof CreateSignatureRequestSchema>

// ============================================================================
// Sign Document Schema
// ============================================================================

export const SignDocumentSchema = z.object({
  signature_request_id: UUIDSchema,
  signer_id: UUIDSchema,
  signature_data: z
    .string()
    .min(1, 'Signature data is required')
    .refine(isValidSignatureData, 'Invalid signature data format'),
  signature_method: z.nativeEnum(SignatureMethod),
  totp_code: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must contain only digits')
    .optional(),
})

export type SignDocumentInput = z.infer<typeof SignDocumentSchema>

// ============================================================================
// Update Signer Status Schema
// ============================================================================

export const UpdateSignerStatusSchema = z
  .object({
    signer_id: UUIDSchema,
    status: z.nativeEnum(SignerStatus),
    decline_reason: z.string().max(500, 'Decline reason must not exceed 500 characters').optional(),
  })
  .refine(
    (data) => {
      // If status is declined, decline_reason is required
      if (data.status === SignerStatus.DECLINED && !data.decline_reason) {
        return false
      }
      return true
    },
    {
      message: 'Decline reason is required when declining',
      path: ['decline_reason'],
    }
  )

export type UpdateSignerStatusInput = z.infer<typeof UpdateSignerStatusSchema>

// ============================================================================
// Update Signature Request Schema
// ============================================================================

export const UpdateSignatureRequestSchema = z.object({
  title: TitleSchema.optional(),
  description: DescriptionSchema,
  expires_at: z.string().datetime('Invalid datetime format').optional(),
})

export type UpdateSignatureRequestInput = z.infer<typeof UpdateSignatureRequestSchema>

// ============================================================================
// Bulk Operation Schema
// ============================================================================

export const BulkOperationSchema = z.object({
  operation: z.nativeEnum(BulkOperationType),
  request_ids: z
    .array(UUIDSchema)
    .min(1, 'At least one request ID is required')
    .max(LIMITS_CONFIG.MAX_BULK_OPERATION_SIZE, `Maximum ${LIMITS_CONFIG.MAX_BULK_OPERATION_SIZE} requests allowed`),
  parameters: z.record(z.string(), z.unknown()).optional(),
})

export type BulkOperationInput = z.infer<typeof BulkOperationSchema>

// ============================================================================
// Template Schemas
// ============================================================================

export const CreateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(LIMITS_CONFIG.MAX_TEMPLATE_NAME_LENGTH, `Template name must not exceed ${LIMITS_CONFIG.MAX_TEMPLATE_NAME_LENGTH} characters`),
  description: DescriptionSchema,
  is_public: z.boolean().optional().default(false),
  default_signers: z
    .array(
      z.object({
        email: EmailSchema.optional(),
        name: NameSchema,
        signing_order: z.number().int().positive(),
        placeholder: z.string().max(100).optional(),
      })
    )
    .max(LIMITS_CONFIG.MAX_SIGNERS_PER_REQUEST, `Maximum ${LIMITS_CONFIG.MAX_SIGNERS_PER_REQUEST} signers allowed`),
  signing_order: z.nativeEnum(SigningOrder).optional().default(SigningOrder.SEQUENTIAL),
  require_totp: z.boolean().optional().default(false),
  expires_in_days: z
    .number()
    .int()
    .min(EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS)
    .max(EXPIRATION_CONFIG.MAX_EXPIRATION_DAYS)
    .optional()
    .default(EXPIRATION_CONFIG.DEFAULT_EXPIRATION_DAYS),
})

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>

export const UpdateTemplateSchema = CreateTemplateSchema.partial()

export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>

export const ApplyTemplateSchema = z.object({
  template_id: UUIDSchema,
  document_id: UUIDSchema,
  signers: z.array(SignerSchema).optional(), // Override template signers
  expires_in_days: z
    .number()
    .int()
    .min(EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS)
    .max(EXPIRATION_CONFIG.MAX_EXPIRATION_DAYS)
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateSchema>

// ============================================================================
// Pagination Schema
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(LIMITS_CONFIG.MAX_BULK_OPERATION_SIZE)
    .optional()
    .default(20),
})

export type PaginationInput = z.infer<typeof PaginationSchema>

// ============================================================================
// Request List Query Schema (Comment 15)
// ============================================================================

const validStatusValues = Object.values(SignatureStatus)

export const RequestListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100) // MAX_PAGE_SIZE
    .optional()
    .default(20),
  status: z
    .string()
    .optional()
    .transform((val) => val?.split(',').filter(Boolean))
    .refine(
      (statuses) => {
        if (!statuses || statuses.length === 0) return true
        return statuses.every((s) => validStatusValues.includes(s as SignatureStatus))
      },
      {
        message: `Status must be one of: ${validStatusValues.join(', ')}`,
      }
    ),
  view: z.enum(['sent', 'received']).optional(),
  search: z.string().max(255).optional(),
})

export type RequestListQueryInput = z.infer<typeof RequestListQuerySchema>

// ============================================================================
// Filter Schemas
// ============================================================================

export const SignatureRequestFilterSchema = z.object({
  status: z.array(z.string()).optional(),
  signature_type: z.nativeEnum(SignatureType).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  search: z.string().max(255).optional(),
})

export type SignatureRequestFilterInput = z.infer<typeof SignatureRequestFilterSchema>

// ============================================================================
// Analytics Schemas
// ============================================================================

export const AnalyticsQuerySchema = z.object({
  metric: z.enum([
    'completion_rate',
    'signer_engagement',
    'geographic_distribution',
    'time_to_sign',
    'trends',
    'document_type',
  ]),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  status: z.array(z.string()).optional(),
  signature_type: z.nativeEnum(SignatureType).optional(),
  group_by: z.enum(['day', 'week', 'month']).optional().default('day'),
})

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>

// ============================================================================
// Export Helper Types
// ============================================================================

export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: z.ZodError
}

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    errors: result.error,
  }
}

