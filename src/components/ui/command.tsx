'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface CommandProps {
  children: React.ReactNode
  className?: string
}

interface CommandInputProps {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

interface CommandListProps {
  children: React.ReactNode
  className?: string
}

interface CommandEmptyProps {
  children: React.ReactNode
  className?: string
}

interface CommandGroupProps {
  children: React.ReactNode
  heading?: string
  className?: string
}

interface CommandItemProps {
  children: React.ReactNode
  onSelect?: () => void
  className?: string
  value?: string
}

const CommandContext = React.createContext<{
  search: string
  setSearch: (search: string) => void
}>({
  search: '',
  setSearch: () => {}
})

export function Command({ children, className }: CommandProps) {
  const [search, setSearch] = React.useState('')

  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <div className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground', 'bg-white', className)}>
        {children}
      </div>
    </CommandContext.Provider>
  )
}

export function CommandInput({ placeholder, value, onValueChange, className }: CommandInputProps) {
  const { search, setSearch } = React.useContext(CommandContext)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearch(newValue)
    onValueChange?.(newValue)
  }

  return (
    <div className="flex items-center border-b px-3">
      <input
        type="text"
        placeholder={placeholder}
        value={value ?? search}
        onChange={handleChange}
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
    </div>
  )
}

export function CommandList({ children, className }: CommandListProps) {
  return (
    <div className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}>
      {children}
    </div>
  )
}

export function CommandEmpty({ children, className }: CommandEmptyProps) {
  const { search } = React.useContext(CommandContext)
  
  if (!search) return null

  return (
    <div className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
      {children}
    </div>
  )
}

export function CommandGroup({ children, heading, className }: CommandGroupProps) {
  return (
    <div className={cn('overflow-hidden p-1 text-foreground', className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

export function CommandItem({ children, onSelect, className, value }: CommandItemProps) {
  const { search } = React.useContext(CommandContext)
  
  // Simple search filtering
  const shouldShow = !search || 
    (value && value.toLowerCase().includes(search.toLowerCase())) ||
    (typeof children === 'string' && children.toLowerCase().includes(search.toLowerCase()))

  if (!shouldShow) return null

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'hover:bg-gray-100',
        className
      )}
    >
      {children}
    </div>
  )
}
