'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export function Slider({
  value,
  defaultValue = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value ?? internalValue

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [Number(event.target.value)]
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue[0]}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200',
          'slider-thumb:appearance-none slider-thumb:h-5 slider-thumb:w-5 slider-thumb:rounded-full slider-thumb:bg-blue-600',
          'slider-thumb:cursor-pointer slider-thumb:border-0 slider-thumb:shadow-md',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentValue[0] - min) / (max - min)) * 100}%, #e5e7eb ${((currentValue[0] - min) / (max - min)) * 100}%, #e5e7eb 100%)`
        }}
      />
    </div>
  )
}
