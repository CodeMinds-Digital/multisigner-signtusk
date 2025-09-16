'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, LogOut, Pen } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { NotificationBell } from '@/components/ui/notification-bell'

interface HeaderProps {
  userName?: string
  userSignature?: string
}

export function Header({ userName, userSignature }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()





  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Get initials for avatar placeholder
  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome back, {userName ||
              user?.full_name ||
              (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` :
                user?.first_name || 'User')}
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Menu Button and Popup */}
          <div className="relative" ref={userMenuRef}>
            <button
              className="flex items-center"
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen)
              }}
            >
              {userSignature ? (
                <Image
                  src={userSignature}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium border-2 border-white shadow-sm">
                  {getInitials(userName || user?.full_name || user?.first_name)}
                </div>
              )}
            </button>

            {/* User popup menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-50 overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    {userSignature ? (
                      <Image
                        src={userSignature}
                        alt="Profile"
                        width={48}
                        height={48}
                        className="rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-medium border-2 border-white shadow">
                        {getInitials(userName || user?.full_name || user?.first_name)}
                      </div>
                    )}
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{userName || user?.full_name || user?.first_name || "User"}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                    </div>
                  </div>

                  {userSignature && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">Your Signature</p>
                      <div className="relative bg-white p-2 rounded-md border border-gray-200 h-12">
                        <Image
                          fill
                          src={userSignature}
                          alt="Signature"
                          className="object-contain"
                          sizes="100vw"
                        />
                      </div>
                    </div>
                  )}
                </div>

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
                    href="/signatures"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Pen className="w-4 h-4 mr-2 text-gray-500" />
                    Signatures
                  </Link>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
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
