'use client'

import { usePathname } from 'next/navigation'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Use pathname as key to force re-mount on route change
  // This prevents showing stale content from previous route
  return <div key={pathname}>{children}</div>
}

