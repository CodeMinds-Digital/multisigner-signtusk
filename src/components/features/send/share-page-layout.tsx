'use client'

import { ReactNode } from 'react'
import { FileText, Shield, Clock } from 'lucide-react'

interface SharePageLayoutProps {
  children: ReactNode
  documentTitle?: string
  linkName?: string
  expiresAt?: string | null
  isSecure?: boolean
  showBranding?: boolean
}

export function SharePageLayout({
  children,
  documentTitle,
  linkName,
  expiresAt,
  isSecure = false,
  showBranding = true
}: SharePageLayoutProps) {
  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    if (diffDays <= 7) return `Expires in ${diffDays} days`
    
    return `Expires ${date.toLocaleDateString()}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      {showBranding && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo/Brand */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">SignTusk</h1>
                  <p className="text-xs text-gray-500">Secure Document Sharing</p>
                </div>
              </div>

              {/* Document Info */}
              {(documentTitle || linkName) && (
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  {isSecure && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Shield className="w-4 h-4" />
                      <span>Secure</span>
                    </div>
                  )}
                  {expiresAt && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatExpiryDate(expiresAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Document Title Bar */}
      {(documentTitle || linkName) && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {linkName || documentTitle}
                </h2>
                {linkName && documentTitle && linkName !== documentTitle && (
                  <p className="text-sm text-gray-600 mt-1">{documentTitle}</p>
                )}
              </div>
              
              {/* Mobile Security/Expiry Info */}
              <div className="sm:hidden flex flex-col items-end gap-1 text-xs">
                {isSecure && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Shield className="w-3 h-3" />
                    <span>Secure</span>
                  </div>
                )}
                {expiresAt && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{formatExpiryDate(expiresAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      {showBranding && (
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Powered by SignTusk</span>
                <span>•</span>
                <span>Secure Document Sharing</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <a href="#" className="hover:text-gray-700 transition-colors">
                  Privacy
                </a>
                <a href="#" className="hover:text-gray-700 transition-colors">
                  Terms
                </a>
                <a href="#" className="hover:text-gray-700 transition-colors">
                  Support
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

// Simplified layout for access gates (password, email verification, etc.)
interface AccessGateLayoutProps {
  children: ReactNode
  title: string
  description?: string
  showBranding?: boolean
}

export function AccessGateLayout({
  children,
  title,
  description,
  showBranding = true
}: AccessGateLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative w-full max-w-md">
        {/* Branding */}
        {showBranding && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SignTusk</h1>
            <p className="text-gray-600 text-sm">Secure Document Sharing</p>
          </div>
        )}

        {/* Access Gate Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {title}
              </h2>
              {description && (
                <p className="text-gray-600 text-sm">
                  {description}
                </p>
              )}
            </div>
            
            {children}
          </div>
        </div>

        {/* Footer */}
        {showBranding && (
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>Protected by SignTusk • Secure Document Sharing</p>
          </div>
        )}
      </div>
    </div>
  )
}

// CSS for background pattern (add to global styles)
const backgroundPatternCSS = `
.bg-grid-pattern {
  background-image: 
    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}
`
