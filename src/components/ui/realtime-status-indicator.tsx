'use client'

/**
 * Realtime Status Indicator
 * Shows connection status and provides debugging info
 * Can be placed in the top navigation or footer
 */

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { realtimeService } from '@/lib/realtime-service'

interface RealtimeStatusIndicatorProps {
  className?: string
  showLabel?: boolean
  showDetails?: boolean
}

export function RealtimeStatusIndicator({
  className = '',
  showLabel = false,
  showDetails = true
}: RealtimeStatusIndicatorProps) {
  const [status, setStatus] = useState(realtimeService.getStatus())
  const [isHealthy, setIsHealthy] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  // Update status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeService.getStatus())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Check health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await realtimeService.healthCheck()
      setIsHealthy(healthy)
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30s

    return () => clearInterval(interval)
  }, [])

  const isConnected = status.enabled && status.activeChannels > 0
  const statusColor = isConnected && isHealthy ? 'text-green-600' : 'text-gray-400'
  const statusBg = isConnected && isHealthy ? 'bg-green-50' : 'bg-gray-50'

  if (!showDetails) {
    // Simple indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isConnected && isHealthy ? (
          <Wifi className={`h-4 w-4 ${statusColor}`} />
        ) : (
          <WifiOff className="h-4 w-4 text-gray-400" />
        )}
        {showLabel && (
          <span className="text-xs text-gray-600">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${className}`}
      >
        {isConnected && isHealthy ? (
          <Activity className={`h-4 w-4 ${statusColor} animate-pulse`} />
        ) : (
          <WifiOff className="h-4 w-4 text-gray-400" />
        )}
        {showLabel && (
          <span className="text-xs">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Realtime Status</h3>
              <Badge
                variant={isConnected && isHealthy ? 'default' : 'secondary'}
                className={isConnected && isHealthy ? 'bg-green-600' : ''}
              >
                {isConnected && isHealthy ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {/* Status Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Service Status</span>
                <span className={`font-medium ${statusColor}`}>
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active Channels</span>
                <span className="font-medium">{status.activeChannels}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Health Check</span>
                <span className={`font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
            </div>

            {/* Active Channels List */}
            {status.channels.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700">Active Subscriptions</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {status.channels.map((channel, index) => (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded ${statusBg} ${statusColor}`}
                    >
                      {channel}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="text-xs text-gray-500 border-t pt-2">
              {isConnected && isHealthy ? (
                <p>✅ Real-time updates are active. Changes appear instantly.</p>
              ) : (
                <p>⚠️ Using fallback polling. Updates may be delayed.</p>
              )}
            </div>

            {/* Debug Actions */}
            <div className="flex space-x-2 border-t pt-2">
              <button
                className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={async () => {
                  const healthy = await realtimeService.healthCheck()
                  setIsHealthy(healthy)
                  alert(healthy ? '✅ Connection healthy' : '❌ Connection unhealthy')
                }}
              >
                Test Connection
              </button>
              <button
                className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  console.log('Realtime Status:', realtimeService.getStatus())
                  alert('Check browser console for details')
                }}
              >
                Debug Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple status badge for footer or header
 */
export function RealtimeStatusBadge({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState(realtimeService.getStatus())

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeService.getStatus())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const isConnected = status.enabled && status.activeChannels > 0

  return (
    <Badge
      variant={isConnected ? 'default' : 'secondary'}
      className={`${isConnected ? 'bg-green-600' : 'bg-gray-400'} ${className}`}
    >
      <Activity className={`h-3 w-3 mr-1 ${isConnected ? 'animate-pulse' : ''}`} />
      {isConnected ? 'Live' : 'Offline'}
    </Badge>
  )
}

/**
 * Minimal dot indicator
 */
export function RealtimeStatusDot({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState(realtimeService.getStatus())

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeService.getStatus())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const isConnected = status.enabled && status.activeChannels > 0

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
      />
      <span className="text-xs text-gray-600">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}

