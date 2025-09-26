'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface CustomSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function CustomSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  size = 'md'
}: CustomSwitchProps) {
  const sizeClasses = {
    sm: {
      container: 'h-4 w-8',
      thumb: 'h-3 w-3',
      translate: 'translate-x-4'
    },
    md: {
      container: 'h-6 w-11',
      thumb: 'h-4 w-4',
      translate: 'translate-x-6'
    },
    lg: {
      container: 'h-8 w-14',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7'
    }
  }

  const currentSize = sizeClasses[size]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onCheckedChange(!checked)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        currentSize.container,
        checked ? 'bg-blue-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <span
        className={cn(
          'inline-block transform rounded-full bg-white transition-transform shadow-sm',
          currentSize.thumb,
          checked ? currentSize.translate : 'translate-x-1'
        )}
      />
    </button>
  )
}

// Alternative toggle switch with different styling
export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  label,
  description
}: CustomSwitchProps & { label?: string; description?: string }) {
  return (
    <div className="flex items-center justify-between">
      {(label || description) && (
        <div>
          {label && <h4 className="font-medium">{label}</h4>}
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>
      )}
      <CustomSwitch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={className}
      />
    </div>
  )
}

// iOS-style switch
export function IOSSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  className
}: CustomSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked ? 'bg-green-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

// Material Design style switch
export function MaterialSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  className
}: CustomSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-gray-400',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md border border-gray-200',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}
