'use client'

/**
 * Analytics Dashboard Component
 * Displays signature analytics and insights
 */

import { useState, useEffect } from 'react'
import {
  CompletionRateMetrics,
  SignerEngagementMetrics,
  TimeToSignMetrics,
  AnalyticsData,
} from '@/lib/signature/types/signature-types'

type MetricType = 'completion_rate' | 'signer_engagement' | 'time_to_sign' | 'trends'
type GroupBy = 'day' | 'week' | 'month'

export function AnalyticsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('completion_rate')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [completionRate, setCompletionRate] = useState<CompletionRateMetrics | null>(null)
  const [signerEngagement, setSignerEngagement] = useState<SignerEngagementMetrics | null>(null)
  const [timeToSign, setTimeToSign] = useState<TimeToSignMetrics | null>(null)
  const [trends, setTrends] = useState<AnalyticsData[]>([])

  useEffect(() => {
    fetchAnalytics()
  }, [selectedMetric, dateRange, groupBy])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        metric: selectedMetric,
        ...(dateRange.from && { from_date: dateRange.from }),
        ...(dateRange.to && { to_date: dateRange.to }),
        ...(selectedMetric === 'trends' && { group_by: groupBy }),
      })

      const response = await fetch(`/api/v1/signatures/analytics?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()

      switch (selectedMetric) {
        case 'completion_rate':
          setCompletionRate(result.data)
          break
        case 'signer_engagement':
          setSignerEngagement(result.data)
          break
        case 'time_to_sign':
          setTimeToSign(result.data)
          break
        case 'trends':
          setTrends(result.data)
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const MetricCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Signature Analytics</h1>
        <p className="text-gray-600">Track and analyze your signature request performance</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Metric Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="completion_rate">Completion Rate</option>
              <option value="signer_engagement">Signer Engagement</option>
              <option value="time_to_sign">Time to Sign</option>
              <option value="trends">Trends</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {selectedMetric === 'trends' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as GroupBy[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setGroupBy(option)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    groupBy === option
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
          {error}
        </div>
      )}

      {/* Metrics Display */}
      {!loading && !error && (
        <>
          {/* Completion Rate */}
          {selectedMetric === 'completion_rate' && completionRate && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard title="Total Requests" value={completionRate.total} />
              <MetricCard title="Completed" value={completionRate.completed} />
              <MetricCard
                title="Completion Rate"
                value={`${completionRate.completion_rate.toFixed(1)}%`}
              />
              <MetricCard
                title="Avg. Time to Complete"
                value={`${completionRate.average_time_to_complete_hours.toFixed(1)}h`}
              />
            </div>
          )}

          {/* Signer Engagement */}
          {selectedMetric === 'signer_engagement' && signerEngagement && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard title="Total Signers" value={signerEngagement.total_signers} />
              <MetricCard
                title="View Rate"
                value={`${signerEngagement.view_rate.toFixed(1)}%`}
                subtitle={`${signerEngagement.viewed_signers} viewed`}
              />
              <MetricCard
                title="Sign Rate"
                value={`${signerEngagement.sign_rate.toFixed(1)}%`}
                subtitle={`${signerEngagement.signed_signers} signed`}
              />
              <MetricCard
                title="Avg. Time to View"
                value={`${signerEngagement.average_time_to_view_hours.toFixed(1)}h`}
              />
              <MetricCard
                title="Avg. Time to Sign"
                value={`${signerEngagement.average_time_to_sign_hours.toFixed(1)}h`}
              />
            </div>
          )}

          {/* Time to Sign */}
          {selectedMetric === 'time_to_sign' && timeToSign && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard title="Average" value={`${timeToSign.average_hours.toFixed(1)}h`} />
              <MetricCard title="Median" value={`${timeToSign.median_hours.toFixed(1)}h`} />
              <MetricCard title="95th Percentile" value={`${timeToSign.p95_hours.toFixed(1)}h`} />
              <MetricCard title="99th Percentile" value={`${timeToSign.p99_hours.toFixed(1)}h`} />
              <MetricCard title="Minimum" value={`${timeToSign.min_hours.toFixed(1)}h`} />
              <MetricCard title="Maximum" value={`${timeToSign.max_hours.toFixed(1)}h`} />
            </div>
          )}

          {/* Trends */}
          {selectedMetric === 'trends' && trends.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {trends.map((trend, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.period}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.completed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.completion_rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

