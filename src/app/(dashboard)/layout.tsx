'use client'

import { useAuth } from '@/components/providers/secure-auth-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { TopNavigation } from '@/components/layout/top-navigation'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadingPage } from '@/components/ui/loading'
import { ClientOnly } from '@/components/ui/client-only'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <LoadingPage message="Loading dashboard..." />
  }

  if (!user) {
    return null
  }

  return (
    <ClientOnly fallback={<LoadingPage message="Initializing dashboard..." />}>
      <ErrorBoundary>
        <SidebarProvider>
          <div className="flex h-screen flex-col bg-gray-50">
            {/* Top Navigation Bar */}
            <TopNavigation />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Collapsible Sidebar */}
              <Sidebar />

              {/* Page Content */}
              <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </ErrorBoundary>
    </ClientOnly>
  )
}
