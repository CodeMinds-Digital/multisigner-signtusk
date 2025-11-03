'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingPage } from '@/components/ui/loading'

export default function SignInboxPage() {
  const router = useRouter()

  useEffect(() => {
    // Preserve query parameters during redirect
    const queryString = typeof window !== 'undefined' ? window.location.search : ''
    router.replace(`/sign/inbox${queryString}`)
  }, [router])

  return <LoadingPage message="Redirecting to Sign Inbox..." />
}
