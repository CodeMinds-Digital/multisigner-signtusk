import { Suspense } from 'react'
import { LoginForm } from '@/components/features/auth/login-form'
import { LoadingSpinner } from '@/components/ui/loading'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Loading Login</h2>
            <p className="text-sm text-gray-600 mt-1">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
