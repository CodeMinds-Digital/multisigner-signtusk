import { apiKeyManager } from './api-key-manager';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  userId?: string;
  emailAccountId?: string;
  messageId?: string;
  domain?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    operation: string;
  };
}

export interface SecurityEvent {
  type: 'rate_limit_exceeded' | 'invalid_api_key' | 'suspicious_content' | 'unauthorized_access' | 'domain_verification_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  details: any;
}

export class MailLogger {
  private readonly logLevel: LogLevel;
  private readonly enableConsole: boolean;
  private readonly enableFile: boolean;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.enableConsole = process.env.NODE_ENV === 'development';
    this.enableFile = process.env.NODE_ENV === 'production';
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'CRITICAL': return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    module: string,
    metadata?: any
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      metadata: metadata ? apiKeyManager.sanitizeForLogging(metadata) : undefined
    };

    return entry;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const module = entry.module;
    const message = entry.message;
    
    let formatted = `[${timestamp}] ${levelName} [${module}] ${message}`;
    
    if (entry.userId) {
      formatted += ` | User: ${entry.userId}`;
    }
    
    if (entry.emailAccountId) {
      formatted += ` | Account: ${entry.emailAccountId}`;
    }
    
    if (entry.messageId) {
      formatted += ` | Message: ${entry.messageId}`;
    }
    
    if (entry.ip) {
      formatted += ` | IP: ${entry.ip}`;
    }
    
    if (entry.performance) {
      formatted += ` | Duration: ${entry.performance.duration}ms`;
    }
    
    if (entry.metadata) {
      formatted += ` | Metadata: ${JSON.stringify(entry.metadata)}`;
    }
    
    if (entry.error) {
      formatted += `\nError: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return formatted;
  }

  private writeLog(entry: LogEntry): void {
    if (this.enableConsole) {
      const formatted = this.formatLogEntry(entry);
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formatted);
          break;
      }
    }

    // In production, you would write to a file or external logging service
    if (this.enableFile) {
      // TODO: Implement file logging or external service (e.g., Winston, Pino)
      // For now, we'll use console in production too
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, module: string, metadata?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, module, metadata);
    this.writeLog(entry);
  }

  info(message: string, module: string, metadata?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, message, module, metadata);
    this.writeLog(entry);
  }

  warn(message: string, module: string, metadata?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, message, module, metadata);
    this.writeLog(entry);
  }

  error(message: string, module: string, error?: Error, metadata?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, message, module, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    this.writeLog(entry);
  }

  critical(message: string, module: string, error?: Error, metadata?: any): void {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, module, metadata);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    this.writeLog(entry);
    
    // In production, you might want to send alerts for critical errors
    this.sendCriticalAlert(entry);
  }

  /**
   * Log email sending activity
   */
  logEmailSent(
    messageId: string,
    userId: string,
    emailAccountId: string,
    to: string[],
    subject: string,
    metadata?: any
  ): void {
    this.info('Email sent successfully', 'email-sending', {
      messageId,
      userId,
      emailAccountId,
      recipientCount: to.length,
      subject: subject.substring(0, 100), // Truncate for logging
      ...metadata
    });
  }

  /**
   * Log email sending failure
   */
  logEmailFailed(
    messageId: string,
    userId: string,
    emailAccountId: string,
    error: Error,
    metadata?: any
  ): void {
    this.error('Email sending failed', 'email-sending', error, {
      messageId,
      userId,
      emailAccountId,
      ...metadata
    });
  }

  /**
   * Log domain verification activity
   */
  logDomainVerification(
    domain: string,
    userId: string,
    emailAccountId: string,
    success: boolean,
    metadata?: any
  ): void {
    const message = success ? 'Domain verified successfully' : 'Domain verification failed';
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    
    const entry = this.createLogEntry(level, message, 'domain-verification', {
      domain,
      userId,
      emailAccountId,
      success,
      ...metadata
    });
    
    this.writeLog(entry);
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: SecurityEvent): void {
    const level = this.getSecurityEventLogLevel(event.severity);
    
    this.info(`Security event: ${event.type}`, 'security', {
      eventType: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      details: event.details
    });
    
    // In production, send security alerts for high/critical events
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendSecurityAlert(event);
    }
  }

  /**
   * Log API request with performance metrics
   */
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    ip?: string,
    userAgent?: string,
    metadata?: any
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${path} ${statusCode}`;
    
    const entry = this.createLogEntry(level, message, 'api', metadata);
    entry.userId = userId;
    entry.ip = ip;
    entry.userAgent = userAgent;
    entry.performance = {
      duration,
      operation: `${method} ${path}`
    };
    
    this.writeLog(entry);
  }

  /**
   * Create performance timer
   */
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.debug(`Operation completed: ${operation}`, 'performance', {
        operation,
        duration
      });
    };
  }

  private getSecurityEventLogLevel(severity: string): LogLevel {
    switch (severity) {
      case 'low': return LogLevel.INFO;
      case 'medium': return LogLevel.WARN;
      case 'high': return LogLevel.ERROR;
      case 'critical': return LogLevel.CRITICAL;
      default: return LogLevel.WARN;
    }
  }

  private sendCriticalAlert(entry: LogEntry): void {
    // In production, implement alerting (email, Slack, PagerDuty, etc.)
    console.error('🚨 CRITICAL ALERT:', this.formatLogEntry(entry));
  }

  private sendSecurityAlert(event: SecurityEvent): void {
    // In production, implement security alerting
    console.warn('🔒 SECURITY ALERT:', JSON.stringify(event));
  }

  /**
   * Get log statistics
   */
  async getLogStats(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<{
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    securityEvents: number;
  }> {
    // In production, implement log aggregation and statistics
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      securityEvents: 0
    };
  }
}

export const mailLogger = new MailLogger();
