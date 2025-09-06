'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Pen,
  BarChart2,
  File,
  Clock,
  CheckCircle,
  AlertTriangle,

  SquarePen,
  Send,
  CreditCard,
  PenTool,
  Workflow,
  Settings
} from 'lucide-react'

interface SidebarProps {
  waitingCount?: number
  completedCount?: number
  draftsCount?: number
  pendingCount?: number
}

export function Sidebar({
  waitingCount = 0,
  completedCount = 0,
  draftsCount = 0,
  pendingCount = 0
}: SidebarProps) {
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
              href="/documents"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/documents') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <FileText className="w-5 h-5 mr-3" />
              Documents
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
              href="/pricing"
              className={`flex items-center px-3 py-2 rounded-md ${isActive('/pricing') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <CreditCard className="w-5 h-5 mr-3" />
              Pricing
            </Link>
          </li>
        </ul>

        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/pending"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/pending') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Clock className="w-5 h-5 mr-3 text-yellow-500" />
                Pending
                <span className="ml-auto bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {pendingCount}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/completed"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/completed') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                Completed
                <span className="ml-auto bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {completedCount}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/drafts"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/drafts') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <File className="w-5 h-5 mr-3 text-blue-500" />
                Drafts
                <span className="ml-auto bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {draftsCount}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/expired"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/expired') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <AlertTriangle className="w-5 h-5 mr-3 text-red-500" />
                Expired
                <span className="ml-auto bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {waitingCount}
                </span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Settings */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/settings"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/settings') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Settings className="w-5 h-5 mr-3" />
                Document Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* Development Tools */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Development
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                href="/test-storage"
                className={`flex items-center px-3 py-2 rounded-md ${isActive('/test-storage') ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <BarChart2 className="w-5 h-5 mr-3" />
                Test Storage
              </Link>
            </li>
            <li>
              <a
                href="/admin/login"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                <BarChart2 className="w-5 h-5 mr-3" />
                Admin Portal
              </a>
            </li>
          </ul>
        </div>
      </nav>


    </div>
  )
}
