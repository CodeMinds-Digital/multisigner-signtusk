import { NextResponse } from 'next/server'

export interface ApiError {
  message: string
  code?: string
  status: number
  details?: any
}

export class AppError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly details?: any

  constructor(message: string, status: number = 500, code?: string, details?: any) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Common error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle known AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.status }
    )
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as any
    
    // Map common Supabase error codes
    if (supabaseError.code === '23505') {
      return NextResponse.json(
        {
          error: {
            message: 'Resource already exists',
            code: 'DUPLICATE_ERROR',
            details: supabaseError.details,
          },
        },
        { status: 409 }
      )
    }

    if (supabaseError.code === '23503') {
      return NextResponse.json(
        {
          error: {
            message: 'Referenced resource not found',
            code: 'FOREIGN_KEY_ERROR',
            details: supabaseError.details,
          },
        },
        { status: 400 }
      )
    }

    if (supabaseError.code === 'PGRST116') {
      return NextResponse.json(
        {
          error: {
            message: 'Resource not found',
            code: 'NOT_FOUND_ERROR',
          },
        },
        { status: 404 }
      )
    }
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'Internal server error'
  
  return NextResponse.json(
    {
      error: {
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : message,
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  )
}

// Async wrapper for API route handlers
export function withErrorHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

// Client-side error handler
export function handleClientError(error: unknown): string {
  console.error('Client Error:', error)

  if (error instanceof AppError) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return (error as Error).message
  }

  return 'An unexpected error occurred'
}

// Validation helper
export function validateRequired(data: Record<string, any>, fields: string[]): void {
  const missing = fields.filter(field => !data[field])
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    )
  }
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Clean up expired rate limit records
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes
