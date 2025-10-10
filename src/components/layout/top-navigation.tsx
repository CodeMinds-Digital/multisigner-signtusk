'use client'

import { usePathname, useRouter } from 'next/navigation'
import { User, Settings } from 'lucide-react'
import { NotificationBell } from '@/components/ui/notification-bell'

import { useAuth } from '@/components/providers/secure-auth-provider'
import { getAllServices, getServiceByRoute, type Service } from '@/config/services'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export function TopNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const allServices = getAllServices()
  const currentService = getServiceByRoute(pathname)

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

  const handleServiceClick = (service: Service) => {
    router.push(service.route)
  }

  const handleLogout = async () => {
    await signOut()
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }



  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            intotni
          </span>
        </div>

        {/* Service Tabs */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {allServices.map((service) => {
            const Icon = service.icon
            const isActive = currentService?.id === service.id

            return (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-all duration-200 font-medium text-sm
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm border-b-2'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                style={isActive ? { borderBottomColor: service.color } : {}}
                title={service.description}
              >
                <Icon className="w-4 h-4" />
                <span>{service.displayName}</span>
              </button>
            )
          })}
        </nav>



        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              className="flex items-center"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium border-2 border-white shadow-sm hover:shadow-md transition-shadow">
                {getInitials(user?.full_name || user?.first_name)}
              </div>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
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
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    Profile
                  </Link>
                  <Link
                    href="/settings/documents"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
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
        </div>
      </div>
    </header>
  )
}

