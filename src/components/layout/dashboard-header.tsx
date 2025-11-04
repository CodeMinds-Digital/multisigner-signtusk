"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/secure-auth-provider";
import { useSidebar } from "@/contexts/sidebar-context";
import { getAllServices } from "@/config/services";
import { NotificationBell } from "@/components/ui/notification-bell";
import { AppLogo } from "@/components/ui/app-logo";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import Image from "next/image";

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { selectedModuleId, setSelectedModuleId } = useSidebar();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const services = getAllServices().filter(s => s.enabled);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleModuleClick = (moduleId: string, route: string) => {
    setSelectedModuleId(moduleId);
    router.push(route);
  };

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 z-50 px-6 pt-6">
      <div className="panel-header flex items-center justify-between h-16 px-6">
        {/* Left Section - Logo + Module Switchers */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <AppLogo variant="full" />

          {/* Module Switchers */}
          <div className="flex items-center gap-2">
            {services.map((service) => {
              const isActive = selectedModuleId === service.id;
              const Icon = service.icon;

              return (
                <button
                  key={service.id}
                  onClick={() => handleModuleClick(service.id, service.route)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl
                    smooth-highlight
                    ${isActive
                      ? 'bg-teal-50 text-teal-600 shadow-sm font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  aria-label={`Switch to ${service.name} module`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'icon-tilt-hover' : ''}`} />
                  <span className="text-sm font-medium">{service.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section - Notifications & User Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl header-action-hover transition-all duration-200"
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-teal-600"
              >
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  getUserInitials(
                    user?.full_name || user?.first_name || user?.email || "U"
                  )
                )}
              </div>

              {/* User Name - visible on md+ screens */}
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.full_name || `${user?.first_name} ${user?.last_name}` || user?.email || "User"}
              </span>

              {/* Dropdown Icon */}
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* User Menu Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-glass-lg border border-gray-200 py-1 animate-slideInFromTop">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name || `${user?.first_name} ${user?.last_name}` || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push("/dashboard/profile");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push("/dashboard/settings");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

