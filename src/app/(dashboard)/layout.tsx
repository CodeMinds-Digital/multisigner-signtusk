'use client'

import { useAuth } from '@/components/providers/secure-auth-provider'
import { DashNav } from '@/components/layout/dash-nav'
import { MobileHeader } from '@/components/layout/mobile-header'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadingPage } from '@/components/ui/loading'
import { ClientOnly } from '@/components/ui/client-only'
import { OnboardingTour } from '@/components/features/onboarding/onboarding-tour'

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
          <div className="flex h-screen bg-gray-50">
            {/* Mobile Header - visible only on mobile */}
            <MobileHeader />

            {/* Unified DashNav - hidden on mobile */}
            <DashNav />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden pt-14 md:pt-0">
              <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <OnboardingTour />
      </ErrorBoundary>
    </ClientOnly>
  )
}
