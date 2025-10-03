'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingPage } from '@/components/ui/loading'

export default function SignInboxRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sign/inbox')
  }, [router])

  return <LoadingPage message="Redirecting to Sign Inbox..." />
}

