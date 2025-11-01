'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings } from 'lucide-react';
import { getEnabledServices, getServiceByRoute } from '@/config/services';
import { NotificationBell } from '@/components/ui/notification-bell';
import { useAuth } from '@/components/providers/secure-auth-provider';
import { AppLogo } from '@/components/ui/app-logo';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ModuleSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRTL, setIsRTL] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const allServices = getEnabledServices();
  const currentService = getServiceByRoute(pathname);

  // Detect RTL
  useEffect(() => {
    setIsRTL(document.documentElement.dir === 'rtl');
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard events for user menu
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isUserMenuOpen) {
        setIsUserMenuOpen(false);
        userMenuTriggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isUserMenuOpen]);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (isUserMenuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    await signOut();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div data-tour="primary-sidebar" className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 z-40 flex flex-col md:flex hidden">
      {/* Header Section */}
      <div className="flex flex-col items-center py-4 border-b border-gray-200">
        {/* Logo */}
        <div className="px-2">
          <AppLogo variant="compact" />
        </div>
      </div>

      {/* Module Icons Section */}
      <div className="flex flex-col flex-1 py-4">
        {allServices.map((service) => {
          const isActive = currentService?.id === service.id;
          const Icon = service.icon;

          return (
            <Tooltip key={service.id}>
              <TooltipTrigger asChild>
                <Link
                  href={service.route}
                  prefetch={true}
                  aria-label={service.displayName}
                  className={`flex items-center justify-center px-4 py-3 transition-all duration-200 relative group ${isActive
                    ? 'bg-opacity-10 border-l-4'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  style={{
                    backgroundColor: isActive ? `${service.color}15` : undefined,
                    borderLeftColor: isActive ? service.color : undefined,
                  }}
                >
                  <div
                    className={`flex-shrink-0 transition-colors ${isActive ? '' : 'text-gray-600 group-hover:text-gray-900'
                      }`}
                    style={{
                      color: isActive ? service.color : undefined,
                    }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{service.displayName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom Section - User Actions */}
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
                    setIsUserMenuOpen(false);
                    handleLogout();
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
  );
}

