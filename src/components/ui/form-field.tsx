'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Label } from './label'

interface FormFieldProps {
  label: string
  id: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  inputClassName?: string
  labelClassName?: string
  helpText?: string
}

export function FormField({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className,
  inputClassName,
  labelClassName,
  helpText
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={id}
        className={cn(
          'text-sm font-medium text-gray-700',
          required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
          labelClassName
        )}
      >
        {label}
      </Label>
      
      <Input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          inputClassName
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
      />
      
      {helpText && !error && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Enhanced textarea version
interface TextareaFieldProps extends Omit<FormFieldProps, 'type' | 'onChange'> {
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
}

export function TextareaField({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className,
  inputClassName,
  labelClassName,
  helpText,
  rows = 3
}: TextareaFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={id}
        className={cn(
          'text-sm font-medium text-gray-700',
          required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
          labelClassName
        )}
      >
        {label}
      </Label>
      
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          inputClassName
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
      />
      
      {helpText && !error && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
