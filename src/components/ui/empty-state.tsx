'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'w-8 h-8',
      title: 'text-base',
      description: 'text-sm',
      spacing: 'space-y-2'
    },
    md: {
      container: 'py-8',
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-sm',
      spacing: 'space-y-3'
    },
    lg: {
      container: 'py-12',
      icon: 'w-16 h-16',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'space-y-4'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={cn(
      'text-center',
      currentSize.container,
      currentSize.spacing,
      className
    )}>
      {Icon && (
        <div className="flex justify-center">
          <Icon className={cn(
            'text-gray-400',
            currentSize.icon
          )} />
        </div>
      )}
      
      <div className="space-y-2">
        <h3 className={cn(
          'font-medium text-gray-900',
          currentSize.title
        )}>
          {title}
        </h3>
        
        {description && (
          <p className={cn(
            'text-gray-500 max-w-sm mx-auto',
            currentSize.description
          )}>
            {description}
          </p>
        )}
      </div>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Specialized empty states for common use cases
interface DocumentEmptyStateProps {
  onCreateDocument?: () => void
  onUploadDocument?: () => void
  className?: string
}

export function DocumentEmptyState({
  onCreateDocument,
  onUploadDocument,
  className
}: DocumentEmptyStateProps) {
  return (
    <EmptyState
      title="No documents yet"
      description="Get started by creating your first document or uploading an existing one."
      action={onCreateDocument ? {
        label: 'Create Document',
        onClick: onCreateDocument
      } : undefined}
      secondaryAction={onUploadDocument ? {
        label: 'Upload Document',
        onClick: onUploadDocument,
        variant: 'outline'
      } : undefined}
      className={className}
    />
  )
}

interface SearchEmptyStateProps {
  searchTerm: string
  onClearSearch?: () => void
  className?: string
}

export function SearchEmptyState({
  searchTerm,
  onClearSearch,
  className
}: SearchEmptyStateProps) {
  return (
    <EmptyState
      title={`No results for "${searchTerm}"`}
      description="Try adjusting your search terms or clearing the search to see all items."
      action={onClearSearch ? {
        label: 'Clear Search',
        onClick: onClearSearch,
        variant: 'outline'
      } : undefined}
      size="sm"
      className={className}
    />
  )
}
