'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 
      className={cn(
        'animate-spin text-blue-600',
        sizeClasses[size],
        className
      )} 
    />
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  message?: string
  className?: string
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  message = 'Loading...', 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 font-medium">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface LoadingPageProps {
  message?: string
  className?: string
}

export function LoadingPage({ 
  message = 'Loading...', 
  className 
}: LoadingPageProps) {
  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center bg-gray-50',
      className
    )}>
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">{message}</h2>
          <p className="text-sm text-gray-600 mt-1">Please wait while we load your content</p>
        </div>
      </div>
    </div>
  )
}

interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText = 'Loading...', 
  className,
  disabled,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md',
        'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" className="text-white" />}
      {isLoading ? loadingText : children}
    </button>
  )
}

// Progress bar component for file uploads and long operations
interface ProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
  message?: string
}

export function ProgressBar({ 
  progress, 
  className, 
  showPercentage = true, 
  message 
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {message && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">{message}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-gray-900">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

// Skeleton loader for content placeholders
interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-gray-200 rounded h-4 mb-2 last:mb-0',
            className
          )}
        />
      ))}
    </div>
  )
}

// Card skeleton for loading states
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border rounded-lg p-6 space-y-4', className)}>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}
