'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { useSidebar } from '@/contexts/sidebar-context'
import { getServiceByRoute, getAllServices, getServiceById } from '@/config/services'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function DashNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { isCollapsed, toggleSidebar, selectedModuleId, setSelectedModuleId } = useSidebar()
  const [isCorporateAdmin, setIsCorporateAdmin] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isRTL, setIsRTL] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null)

  // Memoize allServices to prevent unnecessary re-renders
  const allServices = useMemo(() => getAllServices().filter(s => s.enabled), [])

  // Determine current module - prefer route detection over selectedModuleId
  const serviceFromRoute = getServiceByRoute(pathname)
  let currentService = serviceFromRoute || (selectedModuleId ? getServiceById(selectedModuleId) : null)

  // If no service found, use the first enabled service (SignTusk)
  if (!currentService) {
    currentService = allServices[0]
  }

  // Sync selectedModuleId with pathname changes to prevent desync
  useEffect(() => {
    const detectedService = getServiceByRoute(pathname)
    if (detectedService && detectedService.id !== selectedModuleId) {
      setSelectedModuleId(detectedService.id)
    } else if (!detectedService && !selectedModuleId && allServices.length > 0) {
      setSelectedModuleId(allServices[0].id)
    }
  }, [pathname, selectedModuleId, setSelectedModuleId, allServices])

  // Function to determine if a link is active - supports both exact and nested routes
  const isActive = (path: string) => {
    // Exact match first
    if (pathname === path) return true

    // Special case: if path equals the service root route (e.g., /sign for Dashboard),
    // only return true on exact match to avoid highlighting Dashboard when on /sign/inbox
    if (path === currentService?.route) {
      return false // Already checked exact match above
    }

    // Prefix match for nested routes (e.g., /sign/settings/documents matches /sign/settings/*)
    return pathname.startsWith(path + '/')
  }

  // Check if user is enterprise admin/owner
  useEffect(() => {
    const checkCorporateRole = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/corporate/settings')
        if (response.ok) {
          const data = await response.json()
          setIsCorporateAdmin(
            data.userProfile?.account_type === 'enterprise' &&
            ['owner', 'admin'].includes(data.userProfile?.corporate_role)
          )
        }
      } catch (error) {
        console.error('Error checking enterprise role:', error)
      }
    }

    checkCorporateRole()
  }, [user])

  // Detect RTL
  useEffect(() => {
    setIsRTL(document.documentElement.dir === 'rtl')
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard events for user menu
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isUserMenuOpen) {
        setIsUserMenuOpen(false)
        userMenuTriggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isUserMenuOpen])

  // Focus first menu item when menu opens
  useEffect(() => {
    if (isUserMenuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus()
    }
  }, [isUserMenuOpen])

  const handleLogout = async () => {
    await signOut()
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  const handleModuleClick = (serviceId: string, route: string) => {
    setSelectedModuleId(serviceId)
    router.push(route)
  }

  // Filter sidebar items based on admin status
  const visibleItems = currentService?.sidebarItems.filter(item => {
    if (item.adminOnly) {
      return isCorporateAdmin
    }
    return true
  }) || []

  // Separate main items from settings items
  const mainItems = visibleItems.filter(item => !item.route.includes('/settings'))
  const settingsItems = visibleItems.filter(item => item.route.includes('/settings'))

  return (
    <div
      data-tour="unified-sidebar"
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 h-screen hidden md:flex ${isCollapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* Header Section with Logo */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-center">
        <AppLogo variant={isCollapsed ? 'compact' : 'full'} />
      </div>

      {/* Module Selector Section */}
      <div className="border-b border-gray-200 py-3">
        {allServices.map((service) => {
          const isActiveModule = currentService?.id === service.id
          const Icon = service.icon

          const moduleButton = (
            <button
              onClick={() => handleModuleClick(service.id, service.route)}
              aria-label={service.displayName}
              className={`w-full flex items-center px-4 py-2.5 transition-all duration-200 relative ${isActiveModule
                ? 'bg-opacity-10 border-l-4'
                : 'hover:bg-gray-50 border-l-4 border-transparent'
                } ${isCollapsed ? 'justify-center' : ''}`}
              style={{
                backgroundColor: isActiveModule ? `${service.color}15` : undefined,
                borderLeftColor: isActiveModule ? service.color : undefined,
              }}
            >
              <div
                className={`flex-shrink-0 transition-colors ${isActiveModule ? '' : 'text-gray-600 hover:text-gray-900'
                  }`}
                style={{
                  color: isActiveModule ? service.color : undefined,
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <span
                  className={`ml-3 font-medium ${isActiveModule ? '' : 'text-gray-700'
                    }`}
                  style={{
                    color: isActiveModule ? service.color : undefined,
                  }}
                >
                  {service.displayName}
                </span>
              )}
            </button>
          )

          return (
            <div key={service.id}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {moduleButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{service.displayName}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                moduleButton
              )}
            </div>
          )
        })}
      </div>

      {/* Feature Navigation Section */}
      <nav className="flex-1 overflow-y-auto p-2 pt-4">
        {/* Main Items */}
        <ul className="space-y-1">
          {mainItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.route)

            const linkContent = (
              <Link
                href={item.route}
                className={`relative flex items-center px-3 py-2 rounded-md transition-colors ${active
                  ? 'text-blue-600 bg-blue-50 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
                title={isCollapsed ? item.label : undefined}
                aria-label={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="ml-3 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute right-1 top-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            )

            return (
              <li key={item.id}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            )
          })}
        </ul>

        {/* Settings Section */}
        {settingsItems.length > 0 && (
          <div className="mt-8">
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Settings
              </h3>
            )}
            {isCollapsed && (
              <div className="border-t border-gray-200 my-2" />
            )}
            <ul className="space-y-1">
              {settingsItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.route)

                const linkContent = (
                  <Link
                    href={item.route}
                    prefetch={false}
                    className={`relative flex items-center px-3 py-2 rounded-md transition-colors ${active
                      ? 'text-blue-600 bg-blue-50 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="ml-3 truncate">{item.label}</span>
                    )}
                  </Link>
                )

                return (
                  <li key={item.id}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer Section */}
      <div data-tour="user-actions" className="border-t border-gray-200 p-2 flex flex-col gap-2">
        {/* Notification Bell */}
        <div className="flex items-center justify-center">
          <NotificationBell anchorPosition="bottom" className="flex items-center justify-center" />
        </div>

        {/* User Profile */}
        <div className="relative flex items-center justify-center" ref={userMenuRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={userMenuTriggerRef}
                className="flex items-center justify-center"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="Account"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium border-2 border-white shadow-sm hover:shadow-md transition-shadow text-sm">
                  {getInitials(user?.full_name || user?.first_name)}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>User Menu</p>
            </TooltipContent>
          </Tooltip>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              className={`absolute bottom-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 transition-all duration-200 ease-in-out ${isRTL ? 'right-full mr-2' : 'left-full ml-2'
                }`}
              role="menu"
              aria-orientation="vertical"
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.full_name || `${user?.first_name} ${user?.last_name}` || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  ref={firstMenuItemRef}
                  href={currentService ? `/${currentService.id}/settings/documents` : '/sign/settings/documents'}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsUserMenuOpen(false)}
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 mr-2 text-gray-500" />
                  Settings
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <div className="border-t border-gray-200 pt-2">
          <Button
            variant="ghost"
            onClick={toggleSidebar}
            className={`w-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 ${isCollapsed ? 'px-2' : 'px-3'
              }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

