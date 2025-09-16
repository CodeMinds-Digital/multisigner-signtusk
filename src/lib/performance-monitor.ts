export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: any
}

export interface PerformanceReport {
  averageLoadTime: number
  slowestOperations: PerformanceMetric[]
  totalOperations: number
  errorRate: number
  cacheHitRate: number
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = []
  private static readonly MAX_METRICS = 1000
  private static readonly SLOW_OPERATION_THRESHOLD = 2000 // 2 seconds

  /**
   * Start timing an operation
   */
  static startTiming(operationName: string): (metadata?: any) => void {
    const startTime = performance.now()

    return (metadata?: any) => {
      const endTime = performance.now()
      const duration = endTime - startTime

      this.recordMetric({
        name: operationName,
        duration,
        timestamp: Date.now(),
        metadata
      })
    }
  }

  /**
   * Record a performance metric
   */
  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Log slow operations
    if (metric.duration > this.SLOW_OPERATION_THRESHOLD) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`, metric.metadata)
    }
  }

  /**
   * Measure async operation
   */
  static async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const endTiming = this.startTiming(operationName)

    try {
      const result = await operation()
      endTiming({ ...metadata, success: true })
      return result
    } catch (error) {
      endTiming({ ...metadata, success: false, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * Measure sync operation
   */
  static measure<T>(
    operationName: string,
    operation: () => T,
    metadata?: any
  ): T {
    const endTiming = this.startTiming(operationName)

    try {
      const result = operation()
      endTiming({ ...metadata, success: true })
      return result
    } catch (error) {
      endTiming({ ...metadata, success: false, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * Get performance report
   */
  static getReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        averageLoadTime: 0,
        slowestOperations: [],
        totalOperations: 0,
        errorRate: 0,
        cacheHitRate: 0
      }
    }

    const totalDuration = this.metrics.reduce((sum, metric) => sum + metric.duration, 0)
    const averageLoadTime = totalDuration / this.metrics.length

    const slowestOperations = this.metrics
      .filter(metric => metric.duration > this.SLOW_OPERATION_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)

    const errorCount = this.metrics.filter(metric =>
      metric.metadata?.success === false
    ).length
    const errorRate = (errorCount / this.metrics.length) * 100

    const cacheOperations = this.metrics.filter(metric =>
      metric.name.includes('cache') || metric.metadata?.cached
    )
    const cacheHits = cacheOperations.filter(metric =>
      metric.metadata?.cached === true
    ).length
    const cacheHitRate = cacheOperations.length > 0 ?
      (cacheHits / cacheOperations.length) * 100 : 0

    return {
      averageLoadTime,
      slowestOperations,
      totalOperations: this.metrics.length,
      errorRate,
      cacheHitRate
    }
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Get metrics for specific operation
   */
  static getMetricsForOperation(operationName: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === operationName)
  }

  /**
   * Monitor Core Web Vitals
   */
  static monitorCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric({
          name: 'LCP',
          duration: entry.startTime,
          timestamp: Date.now(),
          metadata: { type: 'core-web-vital' }
        })
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const eventEntry = entry as any // Cast to access processingStart property
        this.recordMetric({
          name: 'FID',
          duration: eventEntry.processingStart ? eventEntry.processingStart - entry.startTime : entry.duration || 0,
          timestamp: Date.now(),
          metadata: { type: 'core-web-vital' }
        })
      }
    }).observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutEntry = entry as any // Cast to access layout shift properties
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value || 0
        }
      }

      this.recordMetric({
        name: 'CLS',
        duration: clsValue,
        timestamp: Date.now(),
        metadata: { type: 'core-web-vital' }
      })
    }).observe({ entryTypes: ['layout-shift'] })
  }

  /**
   * Monitor resource loading
   */
  static monitorResourceLoading(): void {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const resourceEntry = entry as any // Cast to access resource timing properties
        this.recordMetric({
          name: 'Resource Load',
          duration: entry.duration,
          timestamp: Date.now(),
          metadata: {
            type: 'resource',
            name: entry.name,
            size: resourceEntry.transferSize || 0,
            cached: (resourceEntry.transferSize || 0) === 0
          }
        })
      }
    }).observe({ entryTypes: ['resource'] })
  }

  /**
   * Monitor navigation timing
   */
  static monitorNavigation(): void {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const navEntry = entry as any // Cast to access navigation timing properties
        this.recordMetric({
          name: 'Navigation',
          duration: entry.duration,
          timestamp: Date.now(),
          metadata: {
            type: 'navigation',
            domContentLoaded: (navEntry.domContentLoadedEventEnd || 0) - (navEntry.domContentLoadedEventStart || 0),
            loadComplete: (navEntry.loadEventEnd || 0) - (navEntry.loadEventStart || 0)
          }
        })
      }
    }).observe({ entryTypes: ['navigation'] })
  }

  /**
   * Initialize all monitoring
   */
  static initialize(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.monitorCoreWebVitals()
      this.monitorResourceLoading()
      this.monitorNavigation()

      console.log('Performance monitoring initialized')
    }
  }

  /**
   * Log performance summary
   */
  static logSummary(): void {
    const report = this.getReport()

    console.group('Performance Summary')
    console.log(`Average Load Time: ${report.averageLoadTime.toFixed(2)}ms`)
    console.log(`Total Operations: ${report.totalOperations}`)
    console.log(`Error Rate: ${report.errorRate.toFixed(2)}%`)
    console.log(`Cache Hit Rate: ${report.cacheHitRate.toFixed(2)}%`)

    if (report.slowestOperations.length > 0) {
      console.log('Slowest Operations:')
      report.slowestOperations.forEach((op, index) => {
        console.log(`  ${index + 1}. ${op.name}: ${op.duration.toFixed(2)}ms`)
      })
    }

    console.groupEnd()
  }

  /**
   * Export metrics for analysis
   */
  static exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      report: this.getReport(),
      metrics: this.metrics.slice(-100) // Last 100 metrics
    }, null, 2)
  }
}
