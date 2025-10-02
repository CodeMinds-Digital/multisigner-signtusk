'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Inbox,
  CreditCard,
  PenTool,
  Workflow,
  QrCode,
  FileText,
  Shield,
  Bell
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  // Function to determine if a link is active
  const isActive = (path: string) => pathname === path

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-blue-600 text-xl font-bold">SignTusk</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          <li>
            <Link
              href="/dashboard"
              className={`flex items-center px-3 py-2 rounded-md font-medium ${isActive('/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <BarChart2 className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/sign-inbox"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/sign-inbox') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Inbox className="w-5 h-5 mr-3" />
              Sign Inbox
            </Link>
          </li>
          <li>
            <Link
              href="/drive"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/drive') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Workflow className="w-5 h-5 mr-3" />
              Drive
            </Link>
          </li>

          <li>
            <Link
              href="/signatures"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/signatures') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <PenTool className="w-5 h-5 mr-3" />
              Signatures
            </Link>
          </li>
          <li>
            <Link
              href="/verify"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/verify') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <QrCode className="w-5 h-5 mr-3" />
              Verify
            </Link>
          </li>
          <li>
            <Link
              href="/pricing"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/pricing') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <CreditCard className="w-5 h-5 mr-3" />
              Pricing
            </Link>
          </li>
          <li>
            <Link
              href="/billing"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/billing') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <CreditCard className="w-5 h-5 mr-3" />
              Billing
            </Link>
          </li>
        </ul>



        {/* Settings */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/settings/documents"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/settings/documents') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <FileText className="w-5 h-5 mr-3" />
                Document Settings
              </Link>
            </li>
            <li>
              <Link
                href="/settings/security"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/settings/security') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Shield className="w-5 h-5 mr-3" />
                Security Settings
              </Link>
            </li>
            <li>
              <Link
                href="/settings/notifications"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/settings/notifications') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Bell className="w-5 h-5 mr-3" />
                Email Preferences
              </Link>
            </li>
          </ul>
        </div>


      </nav>


    </div>
  )
}
