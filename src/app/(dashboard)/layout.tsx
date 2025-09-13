'use client'

import { useAuth } from '@/components/providers/secure-auth-provider'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
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
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </ClientOnly>
  )
}
