'use client'

import { useEffect } from 'react'

interface ClientBodyProps {
  children: React.ReactNode
  className?: string
}

export function ClientBody({ children, className }: ClientBodyProps) {
  useEffect(() => {
    // Handle any client-side body modifications here if needed
    // This runs only on the client side after hydration
  }, [])

  return (
    <body className={className} suppressHydrationWarning={true}>
      {children}
    </body>
  )
}
