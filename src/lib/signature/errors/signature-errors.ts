/**
 * Custom error classes for standardized error handling across the signature module
 */

// ============================================================================
// Base Error Class
// ============================================================================

export interface ErrorRecoverySuggestion {
  action: string
  description: string
}

export class SignatureError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details: Record<string, unknown>
  public readonly timestamp: string
  public readonly recoverySuggestions?: ErrorRecoverySuggestion[]

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
    this.recoverySuggestions = recoverySuggestions

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      recoverySuggestions: this.recoverySuggestions,
      stack: this.stack,
    }
  }

  toAPIResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        recoverySuggestions: this.recoverySuggestions,
      },
    }
  }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

export class ValidationError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      details,
      recoverySuggestions || [
        {
          action: 'Check input data',
          description: 'Verify that all required fields are provided and in the correct format',
        },
      ]
    )
  }
}

export class AuthorizationError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      details,
      recoverySuggestions || [
        {
          action: 'Verify permissions',
          description: 'Ensure you have the necessary permissions to perform this action',
        },
      ]
    )
  }
}

export class NotFoundError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'NOT_FOUND',
      404,
      details,
      recoverySuggestions || [
        {
          action: 'Verify resource ID',
          description: 'Check that the requested resource exists and the ID is correct',
        },
      ]
    )
  }
}

export class ConflictError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'CONFLICT',
      409,
      details,
      recoverySuggestions || [
        {
          action: 'Check resource state',
          description: 'The resource may already be in the requested state or locked by another operation',
        },
      ]
    )
  }
}

export class ExpirationError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'EXPIRED',
      410,
      details,
      recoverySuggestions || [
        {
          action: 'Request extension',
          description: 'Contact the request initiator to extend the expiration date',
        },
      ]
    )
  }
}

export class RateLimitError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      429,
      details,
      recoverySuggestions || [
        {
          action: 'Wait and retry',
          description: 'You have exceeded the rate limit. Please wait before trying again',
        },
      ]
    )
  }
}

export class InternalError extends SignatureError {
  constructor(
    message: string,
    details: Record<string, unknown> = {},
    recoverySuggestions?: ErrorRecoverySuggestion[]
  ) {
    super(
      message,
      'INTERNAL_ERROR',
      500,
      details,
      recoverySuggestions || [
        {
          action: 'Retry operation',
          description: 'An internal error occurred. Please try again later',
        },
        {
          action: 'Contact support',
          description: 'If the problem persists, please contact support with the error details',
        },
      ]
    )
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

export function createValidationError(
  message: string,
  field?: string,
  value?: unknown
): ValidationError {
  return new ValidationError(message, {
    field,
    value,
  })
}

export function createAuthError(
  message: string,
  resource?: string,
  action?: string
): AuthorizationError {
  return new AuthorizationError(message, {
    resource,
    action,
  })
}

export function createNotFoundError(
  resource: string,
  id: string
): NotFoundError {
  return new NotFoundError(`${resource} not found`, {
    resource,
    id,
  })
}

export function createConflictError(
  message: string,
  currentState?: string,
  requestedState?: string
): ConflictError {
  return new ConflictError(message, {
    currentState,
    requestedState,
  })
}

export function createExpirationError(
  resource: string,
  expiredAt: string
): ExpirationError {
  return new ExpirationError(`${resource} has expired`, {
    resource,
    expiredAt,
  })
}

export function createRateLimitError(
  limit: number,
  window: string,
  retryAfter?: number
): RateLimitError {
  return new RateLimitError('Rate limit exceeded', {
    limit,
    window,
    retryAfter,
  })
}

export function createInternalError(
  message: string,
  originalError?: Error
): InternalError {
  return new InternalError(message, {
    originalError: originalError?.message,
    stack: originalError?.stack,
  })
}

// ============================================================================
// Error Serialization
// ============================================================================

export function serializeError(error: unknown): {
  code: string
  message: string
  statusCode: number
  details: Record<string, unknown>
  timestamp: string
  recoverySuggestions?: ErrorRecoverySuggestion[]
} {
  if (error instanceof SignatureError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: error.timestamp,
      recoverySuggestions: error.recoverySuggestions,
    }
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: 500,
      details: {
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    statusCode: 500,
    details: {
      error: String(error),
    },
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

export function isSignatureError(error: unknown): error is SignatureError {
  return error instanceof SignatureError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError
}

export function isExpirationError(error: unknown): error is ExpirationError {
  return error instanceof ExpirationError
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError
}

export function isInternalError(error: unknown): error is InternalError {
  return error instanceof InternalError
}

