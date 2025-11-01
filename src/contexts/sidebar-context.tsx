'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setIsCollapsed: (collapsed: boolean) => void
  selectedModuleId: string | null
  setSelectedModuleId: (moduleId: string) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedModuleId, setSelectedModuleIdState] = useState<string | null>(null)

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true')
    }

    const savedModule = localStorage.getItem('sidebar-selected-module')
    if (savedModule !== null) {
      setSelectedModuleIdState(savedModule)
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

  const handleSetSelectedModuleId = (moduleId: string) => {
    setSelectedModuleIdState(moduleId)
    localStorage.setItem('sidebar-selected-module', moduleId)
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      toggleSidebar,
      setIsCollapsed: handleSetIsCollapsed,
      selectedModuleId,
      setSelectedModuleId: handleSetSelectedModuleId
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

