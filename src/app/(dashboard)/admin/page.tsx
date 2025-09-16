'use client'

import { useAuth } from '@/components/providers/secure-auth-provider'
import { ComprehensiveAdminDashboard } from '@/components/features/admin/comprehensive-admin-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()

  // Simple admin check - in a real app, you'd check user roles from your database
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('naveenselvam')

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access the admin panel
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              Current user: {user.email}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Admin access is restricted to authorized personnel only
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ComprehensiveAdminDashboard />
}
