'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { Button } from './button'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const alertVariants = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: Info,
    iconColor: 'text-blue-400'
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-400'
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: AlertTriangle,
    iconColor: 'text-yellow-400'
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: XCircle,
    iconColor: 'text-red-400'
  }
}

const sizeVariants = {
  sm: {
    container: 'p-3',
    icon: 'w-4 h-4',
    title: 'text-sm font-medium',
    content: 'text-sm'
  },
  md: {
    container: 'p-4',
    icon: 'w-5 h-5',
    title: 'text-sm font-medium',
    content: 'text-sm'
  },
  lg: {
    container: 'p-6',
    icon: 'w-6 h-6',
    title: 'text-base font-medium',
    content: 'text-base'
  }
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  size = 'md'
}: AlertProps) {
  const variantStyles = alertVariants[variant]
  const sizeStyles = sizeVariants[size]
  const Icon = variantStyles.icon

  return (
    <div className={cn(
      'border rounded-lg',
      variantStyles.container,
      sizeStyles.container,
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn(
            variantStyles.iconColor,
            sizeStyles.icon
          )} />
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn(sizeStyles.title, 'mb-1')}>
              {title}
            </h3>
          )}
          
          <div className={cn(sizeStyles.content)}>
            {children}
          </div>
        </div>
        
        {onClose && (
          <div className="ml-auto pl-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={cn(
                'h-6 w-6 p-0',
                variant === 'info' && 'text-blue-400 hover:text-blue-600',
                variant === 'success' && 'text-green-400 hover:text-green-600',
                variant === 'warning' && 'text-yellow-400 hover:text-yellow-600',
                variant === 'error' && 'text-red-400 hover:text-red-600'
              )}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized alert components for common use cases
interface ErrorAlertProps {
  title?: string
  error: string | Error
  onClose?: () => void
  onRetry?: () => void
  className?: string
}

export function ErrorAlert({
  title = 'Error',
  error,
  onClose,
  onRetry,
  className
}: ErrorAlertProps) {
  const errorMessage = error instanceof Error ? error.message : error

  return (
    <Alert
      variant="error"
      title={title}
      onClose={onClose}
      className={className}
    >
      <div className="space-y-2">
        <p>{errorMessage}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="bg-white border-red-300 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        )}
      </div>
    </Alert>
  )
}

interface SuccessAlertProps {
  title?: string
  message: string
  onClose?: () => void
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function SuccessAlert({
  title = 'Success',
  message,
  onClose,
  action,
  className
}: SuccessAlertProps) {
  return (
    <Alert
      variant="success"
      title={title}
      onClose={onClose}
      className={className}
    >
      <div className="space-y-2">
        <p>{message}</p>
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="bg-white border-green-300 text-green-700 hover:bg-green-50"
          >
            {action.label}
          </Button>
        )}
      </div>
    </Alert>
  )
}
