import { NextRequest, NextResponse } from 'next/server';
import { mailRateLimiter } from './rate-limiter';
import { mailLogger } from './logger';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import { z } from 'zod';

export interface SecurityMiddlewareOptions {
  rateLimitType?: 'general' | 'auth' | 'email-send' | 'domain-verify' | 'template-compile';
  requireAuth?: boolean;
  validateInput?: z.ZodSchema;
  logRequest?: boolean;
  checkSuspiciousContent?: boolean;
}

export interface MiddlewareContext {
  user?: any;
  userId?: string;
  emailAccountId?: string;
  ip: string;
  userAgent: string;
  startTime: number;
}

export class SecurityMiddleware {
  /**
   * Apply security middleware to mail API routes
   */
  static async apply(
    request: NextRequest,
    options: SecurityMiddlewareOptions = {}
  ): Promise<{
    success: boolean;
    response?: NextResponse;
    context?: MiddlewareContext;
    error?: string;
  }> {
    const startTime = Date.now();
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      // 1. Rate limiting
      if (options.rateLimitType) {
        const rateLimitResult = await this.checkRateLimit(request, options.rateLimitType);
        if (!rateLimitResult.success) {
          return rateLimitResult;
        }
      }

      // 2. Authentication
      let user = null;
      let userId = undefined;
      if (options.requireAuth) {
        user = await getCurrentUser(request);
        if (!user) {
          mailLogger.warn('Unauthorized access attempt', 'security', {
            ip,
            userAgent,
            path: request.nextUrl.pathname
          });
          
          return {
            success: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          };
        }
        userId = user.id;
      }

      // 3. Input validation
      if (options.validateInput && request.method !== 'GET') {
        const validationResult = await this.validateInput(request, options.validateInput);
        if (!validationResult.success) {
          return validationResult;
        }
      }

      // 4. Suspicious content check
      if (options.checkSuspiciousContent && request.method !== 'GET') {
        const contentResult = await this.checkSuspiciousContent(request);
        if (!contentResult.success) {
          return contentResult;
        }
      }

      // 5. Log request
      if (options.logRequest) {
        mailLogger.info('API request started', 'api', {
          method: request.method,
          path: request.nextUrl.pathname,
          userId,
          ip,
          userAgent
        });
      }

      const context: MiddlewareContext = {
        user,
        userId,
        ip,
        userAgent,
        startTime
      };

      return { success: true, context };

    } catch (error) {
      mailLogger.error('Security middleware error', 'security', error as Error, {
        ip,
        userAgent,
        path: request.nextUrl.pathname
      });

      return {
        success: false,
        response: NextResponse.json({ error: 'Internal security error' }, { status: 500 })
      };
    }
  }

  /**
   * Complete request logging with response details
   */
  static completeRequest(
    request: NextRequest,
    response: NextResponse,
    context: MiddlewareContext,
    error?: Error
  ): void {
    const duration = Date.now() - context.startTime;
    const statusCode = response.status;

    if (error) {
      mailLogger.error('API request failed', 'api', error, {
        method: request.method,
        path: request.nextUrl.pathname,
        statusCode,
        duration,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent
      });
    } else {
      mailLogger.logApiRequest(
        request.method,
        request.nextUrl.pathname,
        statusCode,
        duration,
        context.userId,
        context.ip,
        context.userAgent
      );
    }
  }

  /**
   * Check rate limits
   */
  private static async checkRateLimit(
    request: NextRequest,
    limitType: string
  ): Promise<{ success: boolean; response?: NextResponse }> {
    let rateLimitResult;

    switch (limitType) {
      case 'general':
      case 'auth':
        rateLimitResult = await mailRateLimiter.checkApiLimit(request, limitType as any);
        break;
      case 'email-send':
        const user = await getCurrentUser(request);
        if (!user) {
          return {
            success: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          };
        }
        rateLimitResult = await mailRateLimiter.checkEmailSendLimit(user.id);
        break;
      default:
        return { success: true };
    }

    if (!rateLimitResult.success) {
      mailLogger.logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        userId: (await getCurrentUser(request))?.id,
        ip: this.getClientIP(request),
        details: {
          limitType,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        }
      });

      const headers = mailRateLimiter.getRateLimitHeaders(rateLimitResult);
      return {
        success: false,
        response: NextResponse.json(
          { error: rateLimitResult.error },
          { status: 429, headers }
        )
      };
    }

    return { success: true };
  }

  /**
   * Validate request input
   */
  private static async validateInput(
    request: NextRequest,
    schema: z.ZodSchema
  ): Promise<{ success: boolean; response?: NextResponse }> {
    try {
      const body = await request.json();
      schema.parse(body);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');

        mailLogger.warn('Input validation failed', 'validation', {
          errors: error.errors,
          path: request.nextUrl.pathname,
          ip: this.getClientIP(request)
        });

        return {
          success: false,
          response: NextResponse.json(
            { error: 'Validation failed', details: errorMessages },
            { status: 400 }
          )
        };
      }

      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        )
      };
    }
  }

  /**
   * Check for suspicious content
   */
  private static async checkSuspiciousContent(
    request: NextRequest
  ): Promise<{ success: boolean; response?: NextResponse }> {
    try {
      const body = await request.json();
      const contentToCheck = [
        body.html,
        body.text,
        body.subject,
        JSON.stringify(body.metadata || {})
      ].filter(Boolean).join(' ');

      if (contentToCheck) {
        const { InputValidator } = await import('./input-validator');
        const suspiciousCheck = InputValidator.checkSuspiciousContent(contentToCheck);

        if (suspiciousCheck.isSuspicious) {
          mailLogger.logSecurityEvent({
            type: 'suspicious_content',
            severity: 'high',
            userId: (await getCurrentUser(request))?.id,
            ip: this.getClientIP(request),
            details: {
              reasons: suspiciousCheck.reasons,
              path: request.nextUrl.pathname
            }
          });

          return {
            success: false,
            response: NextResponse.json(
              { error: 'Content flagged as suspicious', reasons: suspiciousCheck.reasons },
              { status: 400 }
            )
          };
        }
      }

      return { success: true };
    } catch (error) {
      // If we can't check content, allow it but log the error
      mailLogger.warn('Failed to check suspicious content', 'security', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: request.nextUrl.pathname
      });
      return { success: true };
    }
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfIP = request.headers.get('cf-connecting-ip');
    
    return cfIP || (forwarded ? forwarded.split(',')[0] : realIP) || 'unknown';
  }

  /**
   * Create a wrapper for API routes with security
   */
  static withSecurity(
    handler: (request: NextRequest, context: MiddlewareContext) => Promise<NextResponse>,
    options: SecurityMiddlewareOptions = {}
  ) {
    return async (request: NextRequest) => {
      const securityResult = await this.apply(request, options);
      
      if (!securityResult.success) {
        return securityResult.response!;
      }

      const context = securityResult.context!;
      let response: NextResponse;
      let error: Error | undefined;

      try {
        response = await handler(request, context);
      } catch (err) {
        error = err as Error;
        response = NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }

      this.completeRequest(request, response, context, error);
      return response;
    };
  }
}

export { SecurityMiddleware as securityMiddleware };
