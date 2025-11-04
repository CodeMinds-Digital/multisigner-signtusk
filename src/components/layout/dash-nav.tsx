'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { useSidebar } from '@/contexts/sidebar-context'
import { getServiceByRoute, getAllServices, getServiceById } from '@/config/services'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function DashNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { isCollapsed, toggleSidebar, selectedModuleId, setSelectedModuleId } = useSidebar()
  const [isCorporateAdmin, setIsCorporateAdmin] = useState(false)

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
      className={`hidden md:flex flex-col transition-all duration-300 h-screen ${isCollapsed ? 'w-16' : 'w-64'
        }`}
      style={{
        marginTop: '104px',
        marginLeft: '24px',
        marginBottom: '24px',
        height: 'calc(100vh - 128px)'
      }}
    >
      <div className="panel-sidebar flex flex-col h-full">
        {/* Feature Navigation Section */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 sidebar-scroll">
          {/* Main Items */}
          <ul className="space-y-1">
            {mainItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.route)

              const linkContent = (
                <Link
                  href={item.route}
                  className={`relative flex items-center rounded-2xl transition-all duration-300 ease-out ${isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
                    } ${active
                      ? 'text-teal-600 nav-item-active font-medium'
                      : 'text-gray-700 nav-item-hover'
                    }`}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
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
                      className={`relative flex items-center rounded-2xl transition-all duration-300 ease-out ${isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
                        } ${active
                          ? 'text-teal-600 nav-item-active font-medium'
                          : 'text-gray-700 nav-item-hover'
                        }`}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
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
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          {/* Collapse Toggle Button */}
          <Button
            variant="ghost"
            onClick={toggleSidebar}
            className={`w-full flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-2xl ${isCollapsed ? 'justify-center px-2 py-2' : 'justify-center px-3 py-2'
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

