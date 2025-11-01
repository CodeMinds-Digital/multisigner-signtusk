'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/sidebar-context'
import { getServiceByRoute, getAllServices } from '@/config/services'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [isCorporateAdmin, setIsCorporateAdmin] = useState(false)

  // Get current service based on route - fallback to first enabled service
  let currentService = getServiceByRoute(pathname)

  // If no service found, use the first enabled service (SignTusk)
  if (!currentService) {
    const allServices = getAllServices()
    currentService = allServices.find(s => s.enabled) || allServices[0]
  }

  // Function to determine if a link is active
  const isActive = (path: string) => pathname === path

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

  const ServiceIcon = currentService.icon

  // Filter sidebar items based on admin status
  const visibleItems = currentService.sidebarItems.filter(item => {
    if (item.adminOnly) {
      return isCorporateAdmin
    }
    return true
  })

  // Separate main items from settings items
  const mainItems = visibleItems.filter(item => !item.route.includes('/settings'))
  const settingsItems = visibleItems.filter(item => item.route.includes('/settings'))

  return (
    <div
      data-tour="module-sidebar"
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* Header Section with Logo */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-center">
        <AppLogo variant={isCollapsed ? 'compact' : 'full'} />
      </div>

      {/* Navigation */}
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

      {/* Collapse Toggle Button at Bottom */}
      <div className="border-t border-gray-200 p-2">
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
  )
}
