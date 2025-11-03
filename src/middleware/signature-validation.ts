/**
 * Next.js middleware for signature request validation
 * Validates incoming requests using Zod schemas before reaching route handlers
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  CreateSignatureRequestSchema,
  SignDocumentSchema,
  UpdateSignerStatusSchema,
  UpdateSignatureRequestSchema,
  BulkOperationSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  ApplyTemplateSchema,
} from '../lib/signature/validation/signature-validation-schemas'
import { ValidationError, createValidationError } from '../lib/signature/errors/signature-errors'

// ============================================================================
// Validation Middleware Functions
// ============================================================================

/**
 * Validate signature request creation
 */
export async function validateSignatureRequest(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = CreateSignatureRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signature request data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null // Validation passed
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

/**
 * Validate signer data
 */
export async function validateSigner(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = UpdateSignerStatusSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signer data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

/**
 * Validate sign document request
 */
export async function validateSignDocument(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = SignDocumentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signature data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

/**
 * Validate bulk operation request
 */
export async function validateBulkOperation(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = BulkOperationSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid bulk operation data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

/**
 * Validate template creation
 */
export async function validateCreateTemplate(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = CreateTemplateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid template data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

/**
 * Validate template update
 */
export async function validateUpdateTemplate(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = UpdateTemplateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid template update data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

/**
 * Validate template application
 */
export async function validateApplyTemplate(request: NextRequest): Promise<NextResponse | null> {
  try {
    const body = await request.json()
    const result = ApplyTemplateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid template application data',
            details: result.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }

    return null
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 400 }
    )
  }
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }

  return obj
}

// ============================================================================
// Generic Validation Helper
// ============================================================================

/**
 * Generic validation middleware factory
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const body = await request.json()
      const result = schema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: result.error.flatten(),
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        )
      }

      return null
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      )
    }
  }
}

// ============================================================================
// Request ID Generation
// ============================================================================

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Add request ID to response headers
 */
export function addRequestIdHeader(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('X-Request-ID', requestId)
  return response
}

