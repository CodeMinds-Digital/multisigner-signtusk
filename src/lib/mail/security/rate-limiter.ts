import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/upstash-config';
import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  error?: string;
}

interface RateLimitConfig {
  requests: number;
  window: string;
  prefix?: string;
}

export class MailRateLimiter {
  private limiters: Map<string, Ratelimit> = new Map();

  constructor() {
    this.initializeLimiters();
  }

  private initializeLimiters() {
    // Email sending limits
    this.limiters.set('email-send', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 emails per minute per user
      analytics: true,
      prefix: 'mail:send'
    }));

    this.limiters.set('email-send-burst', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 emails per hour per user
      analytics: true,
      prefix: 'mail:send:burst'
    }));

    this.limiters.set('email-send-daily', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, '24 h'), // 1000 emails per day per user
      analytics: true,
      prefix: 'mail:send:daily'
    }));

    // API endpoint limits
    this.limiters.set('api-general', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute per IP
      analytics: true,
      prefix: 'mail:api'
    }));

    this.limiters.set('api-auth', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 auth requests per minute per IP
      analytics: true,
      prefix: 'mail:auth'
    }));

    // Domain verification limits
    this.limiters.set('domain-verify', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '5 m'), // 5 verification attempts per 5 minutes
      analytics: true,
      prefix: 'mail:domain:verify'
    }));

    // Template compilation limits
    this.limiters.set('template-compile', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 template compilations per minute
      analytics: true,
      prefix: 'mail:template'
    }));

    // Webhook processing limits
    this.limiters.set('webhook', new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 webhook calls per minute
      analytics: true,
      prefix: 'mail:webhook'
    }));
  }

  /**
   * Check rate limit for email sending
   */
  async checkEmailSendLimit(userId: string): Promise<RateLimitResult> {
    const results = await Promise.all([
      this.limiters.get('email-send')!.limit(userId),
      this.limiters.get('email-send-burst')!.limit(userId),
      this.limiters.get('email-send-daily')!.limit(userId)
    ]);

    // Check if any limit is exceeded
    for (const result of results) {
      if (!result.success) {
        return {
          success: false,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          error: 'Email sending rate limit exceeded'
        };
      }
    }

    // Return the most restrictive limit info
    const mostRestrictive = results.reduce((min, current) => 
      current.remaining < min.remaining ? current : min
    );

    return {
      success: true,
      limit: mostRestrictive.limit,
      remaining: mostRestrictive.remaining,
      reset: mostRestrictive.reset
    };
  }

  /**
   * Check rate limit for API endpoints
   */
  async checkApiLimit(request: NextRequest, limitType: 'general' | 'auth' = 'general'): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(request);
    const limiter = this.limiters.get(`api-${limitType}`);
    
    if (!limiter) {
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: new Date(),
        error: 'Rate limiter not configured'
      };
    }

    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      error: result.success ? undefined : 'API rate limit exceeded'
    };
  }

  /**
   * Check rate limit for domain verification
   */
  async checkDomainVerifyLimit(userId: string, domain: string): Promise<RateLimitResult> {
    const identifier = `${userId}:${domain}`;
    const limiter = this.limiters.get('domain-verify')!;
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      error: result.success ? undefined : 'Domain verification rate limit exceeded'
    };
  }

  /**
   * Check rate limit for template compilation
   */
  async checkTemplateCompileLimit(userId: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get('template-compile')!;
    const result = await limiter.limit(userId);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      error: result.success ? undefined : 'Template compilation rate limit exceeded'
    };
  }

  /**
   * Check rate limit for webhook processing
   */
  async checkWebhookLimit(source: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get('webhook')!;
    const result = await limiter.limit(source);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      error: result.success ? undefined : 'Webhook rate limit exceeded'
    };
  }

  /**
   * Get identifier for rate limiting (IP + User Agent hash)
   */
  private getIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userAgentHash = this.hashString(userAgent).substring(0, 8);
    
    return `${ip}:${userAgentHash}`;
  }

  /**
   * Simple hash function for user agent
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.getTime().toString(),
      'Retry-After': result.success ? '0' : Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
    };
  }

  /**
   * Create custom rate limiter
   */
  createCustomLimiter(config: RateLimitConfig): Ratelimit {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: config.prefix || 'mail:custom'
    });
  }

  /**
   * Reset rate limit for user (admin function)
   */
  async resetUserLimits(userId: string): Promise<void> {
    const keys = [
      `mail:send:${userId}`,
      `mail:send:burst:${userId}`,
      `mail:send:daily:${userId}`,
      `mail:template:${userId}`
    ];

    await Promise.all(keys.map(key => redis.del(key)));
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(userId: string): Promise<{
    emailSend: RateLimitResult;
    emailBurst: RateLimitResult;
    emailDaily: RateLimitResult;
  }> {
    const [emailSend, emailBurst, emailDaily] = await Promise.all([
      this.limiters.get('email-send')!.limit(userId),
      this.limiters.get('email-send-burst')!.limit(userId),
      this.limiters.get('email-send-daily')!.limit(userId)
    ]);

    return {
      emailSend: {
        success: emailSend.success,
        limit: emailSend.limit,
        remaining: emailSend.remaining,
        reset: emailSend.reset
      },
      emailBurst: {
        success: emailBurst.success,
        limit: emailBurst.limit,
        remaining: emailBurst.remaining,
        reset: emailBurst.reset
      },
      emailDaily: {
        success: emailDaily.success,
        limit: emailDaily.limit,
        remaining: emailDaily.remaining,
        reset: emailDaily.reset
      }
    };
  }
}

export const mailRateLimiter = new MailRateLimiter();
