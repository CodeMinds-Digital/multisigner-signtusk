/**
 * Analytics Service
 * Provides signature analytics and insights
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import {
  Result,
  SignatureStatus,
  SignerStatus,
  AnalyticsData,
  CompletionRateMetrics,
  SignerEngagementMetrics,
  TimeToSignMetrics,
} from '../types/signature-types'
import { createInternalError, serializeError } from '../errors/signature-errors'

/**
 * Analytics Service
 */
export class AnalyticsService {
  private client: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.client = client || supabase
  }

  /**
   * Get completion rate metrics
   */
  async getCompletionRate(
    userId: string,
    options: {
      fromDate?: string
      toDate?: string
    } = {}
  ): Promise<Result<CompletionRateMetrics>> {
    try {
      let query = this.client
        .from('signing_requests')
        .select('status, created_at, completed_at')
        .eq('initiated_by', userId)

      if (options.fromDate) {
        query = query.gte('created_at', options.fromDate)
      }

      if (options.toDate) {
        query = query.lte('created_at', options.toDate)
      }

      const { data, error } = await query

      if (error) {
        throw createInternalError('Failed to fetch completion metrics', error)
      }

      const total = data?.length || 0
      const completed = data?.filter((r) => r.status === SignatureStatus.COMPLETED).length || 0
      const pending =
        data?.filter(
          (r) =>
            r.status === SignatureStatus.IN_PROGRESS || r.status === SignatureStatus.INITIATED
        ).length || 0
      const expired = data?.filter((r) => r.status === SignatureStatus.EXPIRED).length || 0
      const cancelled = data?.filter((r) => r.status === SignatureStatus.CANCELLED).length || 0

      // Calculate average time to complete
      const completedRequests = data?.filter(
        (r) => r.status === SignatureStatus.COMPLETED && r.completed_at
      )
      let avgTimeToComplete = 0

      if (completedRequests && completedRequests.length > 0) {
        const totalTime = completedRequests.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime()
          const completed = new Date(r.completed_at!).getTime()
          return sum + (completed - created)
        }, 0)
        avgTimeToComplete = totalTime / completedRequests.length / (1000 * 60 * 60) // Convert to hours
      }

      const metrics: CompletionRateMetrics = {
        total,
        completed,
        pending,
        expired,
        cancelled,
        completion_rate: total > 0 ? (completed / total) * 100 : 0,
        average_time_to_complete_hours: avgTimeToComplete,
      }

      return {
        success: true,
        data: metrics,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get signer engagement metrics
   */
  async getSignerEngagement(
    userId: string,
    options: {
      fromDate?: string
      toDate?: string
    } = {}
  ): Promise<Result<SignerEngagementMetrics>> {
    try {
      // Get all signers for user's requests
      let query = this.client
        .from('signing_request_signers')
        .select('*, signing_request:signing_requests!inner(initiated_by, created_at)')
        .eq('signing_request.initiated_by', userId)

      if (options.fromDate) {
        query = query.gte('signing_request.created_at', options.fromDate)
      }

      if (options.toDate) {
        query = query.lte('signing_request.created_at', options.toDate)
      }

      const { data, error } = await query

      if (error) {
        throw createInternalError('Failed to fetch signer engagement', error)
      }

      const totalSigners = data?.length || 0
      const viewedSigners = data?.filter((s) => s.viewed_at).length || 0
      const signedSigners = data?.filter((s) => s.status === SignerStatus.SIGNED).length || 0

      // Calculate average time from send to view
      const viewedData = data?.filter((s) => s.sent_at && s.viewed_at)
      let avgTimeToView = 0

      if (viewedData && viewedData.length > 0) {
        const totalTime = viewedData.reduce((sum, s) => {
          const sent = new Date(s.sent_at!).getTime()
          const viewed = new Date(s.viewed_at!).getTime()
          return sum + (viewed - sent)
        }, 0)
        avgTimeToView = totalTime / viewedData.length / (1000 * 60 * 60) // Hours
      }

      // Calculate average time from view to sign
      const signedData = data?.filter((s) => s.viewed_at && s.signed_at)
      let avgTimeToSign = 0

      if (signedData && signedData.length > 0) {
        const totalTime = signedData.reduce((sum, s) => {
          const viewed = new Date(s.viewed_at!).getTime()
          const signed = new Date(s.signed_at!).getTime()
          return sum + (signed - viewed)
        }, 0)
        avgTimeToSign = totalTime / signedData.length / (1000 * 60 * 60) // Hours
      }

      const metrics: SignerEngagementMetrics = {
        total_signers: totalSigners,
        viewed_signers: viewedSigners,
        signed_signers: signedSigners,
        view_rate: totalSigners > 0 ? (viewedSigners / totalSigners) * 100 : 0,
        sign_rate: viewedSigners > 0 ? (signedSigners / viewedSigners) * 100 : 0,
        average_time_to_view_hours: avgTimeToView,
        average_time_to_sign_hours: avgTimeToSign,
      }

      return {
        success: true,
        data: metrics,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get time-to-sign metrics with percentiles
   */
  async getTimeToSignMetrics(
    userId: string,
    options: {
      fromDate?: string
      toDate?: string
    } = {}
  ): Promise<Result<TimeToSignMetrics>> {
    try {
      let query = this.client
        .from('signing_request_signers')
        .select('sent_at, signed_at, signing_request:signing_requests!inner(initiated_by)')
        .eq('signing_request.initiated_by', userId)
        .eq('status', SignerStatus.SIGNED)
        .not('sent_at', 'is', null)
        .not('signed_at', 'is', null)

      if (options.fromDate) {
        query = query.gte('sent_at', options.fromDate)
      }

      if (options.toDate) {
        query = query.lte('sent_at', options.toDate)
      }

      const { data, error } = await query

      if (error) {
        throw createInternalError('Failed to fetch time-to-sign metrics', error)
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: {
            average_hours: 0,
            median_hours: 0,
            p95_hours: 0,
            p99_hours: 0,
            min_hours: 0,
            max_hours: 0,
            sample_size: 0,
          },
        }
      }

      // Calculate time differences in hours
      const times = data
        .map((s) => {
          const sent = new Date(s.sent_at!).getTime()
          const signed = new Date(s.signed_at!).getTime()
          return (signed - sent) / (1000 * 60 * 60) // Hours
        })
        .sort((a, b) => a - b)

      const average = times.reduce((sum, t) => sum + t, 0) / times.length
      const median = times[Math.floor(times.length / 2)]
      const p95 = times[Math.floor(times.length * 0.95)]
      const p99 = times[Math.floor(times.length * 0.99)]
      const min = times[0]
      const max = times[times.length - 1]

      const metrics: TimeToSignMetrics = {
        average_hours: average,
        median_hours: median,
        p95_hours: p95,
        p99_hours: p99,
        min_hours: min,
        max_hours: max,
        sample_size: times.length,
      }

      return {
        success: true,
        data: metrics,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get trend analytics (time series data)
   */
  async getTrendAnalytics(
    userId: string,
    options: {
      fromDate?: string
      toDate?: string
      groupBy?: 'day' | 'week' | 'month'
    } = {}
  ): Promise<Result<AnalyticsData[]>> {
    try {
      const groupBy = options.groupBy || 'day'

      let query = this.client
        .from('signing_requests')
        .select('created_at, status')
        .eq('initiated_by', userId)

      if (options.fromDate) {
        query = query.gte('created_at', options.fromDate)
      }

      if (options.toDate) {
        query = query.lte('created_at', options.toDate)
      }

      const { data, error } = await query

      if (error) {
        throw createInternalError('Failed to fetch trend analytics', error)
      }

      // Group data by time period
      const grouped = new Map<string, { total: number; completed: number }>()

      data?.forEach((r) => {
        const date = new Date(r.created_at)
        let key: string

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0]
        } else if (groupBy === 'week') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }

        const existing = grouped.get(key) || { total: 0, completed: 0 }
        existing.total++
        if (r.status === SignatureStatus.COMPLETED) {
          existing.completed++
        }
        grouped.set(key, existing)
      })

      const trends: AnalyticsData[] = Array.from(grouped.entries()).map(([period, stats]) => ({
        period,
        total: stats.total,
        completed: stats.completed,
        completion_rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      }))

      return {
        success: true,
        data: trends,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()

