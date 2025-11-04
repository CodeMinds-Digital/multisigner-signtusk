'use client'

import { useAuth } from '@/components/providers/secure-auth-provider'
import { DashNav } from '@/components/layout/dash-nav'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { MobileHeader } from '@/components/layout/mobile-header'
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadingPage } from '@/components/ui/loading'
import { ClientOnly } from '@/components/ui/client-only'
import { OnboardingTour } from '@/components/features/onboarding/onboarding-tour'

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile Header - visible only on mobile */}
      <MobileHeader />

      {/* Desktop Header - visible only on desktop */}
      <DashboardHeader />

      {/* Unified DashNav - hidden on mobile */}
      <DashNav />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden pt-16 md:pt-28">
        <main
          className="flex-1 overflow-y-auto webkit-scroll-touch p-4 md:p-6"
          style={{
            backgroundColor: '#F5F7FA',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </>
  )
}

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
          <div className="flex h-screen" style={{ backgroundColor: '#F5F7FA' }}>
            <DashboardContent>{children}</DashboardContent>
          </div>
        </SidebarProvider>
        <OnboardingTour />
      </ErrorBoundary>
    </ClientOnly>
  )
}
