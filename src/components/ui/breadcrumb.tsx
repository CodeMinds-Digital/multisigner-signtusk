import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHome?: boolean
}

export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {showHome && (
        <>
          <Link
            href="/send"
            className="flex items-center hover:text-gray-900 transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
          {items.length > 0 && <ChevronRight className="w-4 h-4" />}
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={index} className="flex items-center space-x-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-900 font-medium' : ''}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </div>
        )
      })}
    </nav>
  )
}

