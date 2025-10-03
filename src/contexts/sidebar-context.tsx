'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setIsCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Save preference to localStorage
  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem('sidebar-collapsed', String(newValue))
      return newValue
    })
  }

  const handleSetIsCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      toggleSidebar,
      setIsCollapsed: handleSetIsCollapsed
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

