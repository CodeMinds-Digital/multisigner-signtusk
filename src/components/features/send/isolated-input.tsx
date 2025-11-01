'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface IsolatedInputProps {
  placeholder: string
  onAdd: (value: string) => void
  disabled?: boolean
  className?: string
}

export function IsolatedInput({ placeholder, onAdd, disabled = false, className = '' }: IsolatedInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
      // Keep focus on input after adding
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleAdd()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className="flex-1"
      />
      <Button 
        onClick={handleAdd} 
        size="sm" 
        type="button"
        disabled={disabled || !value.trim()}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}
