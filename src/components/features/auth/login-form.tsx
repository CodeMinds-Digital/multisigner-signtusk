'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import { SiZoho } from 'react-icons/si'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TOTPVerificationPopup } from './totp-verification-popup'

export function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = searchParams.get('redirectTo')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [localError, setLocalError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showTOTPPopup, setShowTOTPPopup] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const { user, error, clearError } = useAuth()

  // Handle already authenticated users
  useEffect(() => {
    if (user && !error) {
      console.log('🔍 useEffect: User is already authenticated, redirecting...')
      const destination = redirectTo || '/dashboard'
      console.log('🔄 useEffect: Redirecting to:', destination)

      // Clear loading state since login was successful
      setIsLoading(false)

      // Small delay to ensure auth state is stable
      setTimeout(() => {
        try {
          router.push(destination)
          console.log('🔄 useEffect: router.push called successfully')
        } catch (error) {
          console.error('❌ useEffect: router.push error:', error)
          window.location.href = destination
        }
      }, 100)
    }
  }, [user, error, redirectTo, router])

  // Clear loading state when user changes (additional safety net)
  useEffect(() => {
    if (user) {
      console.log('🔄 Login form: User detected, clearing loading state')
      setIsLoading(false)
    }
  }, [user])

  const handleGoogleLogin = async () => {
    // Google OAuth not implemented in secure auth system yet
    setLocalError('Google login not available. Please use email/password.')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error || localError) {
      clearError()
      setLocalError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 Login form submitted')
    e.preventDefault()

    // Validate form data
    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all required fields')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError('Please enter a valid email address')
      return
    }

    await attemptLogin()
  }

  const attemptLogin = async (totpCode?: string) => {
    setIsLoading(true)
    setLocalError('')
    clearError()

    try {
      console.log('🔄 Login attempt started:', { email: formData.email, redirectTo, hasTOTP: !!totpCode })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          totpCode
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requiresTOTP && !totpCode) {
          // Show TOTP popup
          setPendingUserId(data.userId)
          setShowTOTPPopup(true)
          setIsLoading(false)
          return
        }
        throw new Error(data.error || 'Login failed')
      }

      console.log('✅ Login successful!')

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberMe')
      }

      // Redirect to dashboard or intended page
      const destination = redirectTo || '/dashboard'
      router.push(destination)

    } catch (error) {
      console.error('❌ Login error details:', error)
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.'

      // Provide helpful guidance for common issues
      if (errorMessage.includes('Account not found')) {
        setLocalError('Account not found. Please sign up first or check your email address.')
      } else if (errorMessage.includes('Invalid login credentials')) {
        setLocalError('Invalid email or password. Please check your credentials and try again.')
      } else if (errorMessage.includes('Database connection error')) {
        setLocalError('Database connection error. Please try again in a moment.')
      } else {
        setLocalError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleTOTPVerified = async () => {
    // Re-attempt login with TOTP verification already completed
    setShowTOTPPopup(false)
    setPendingUserId(null)

    // Since TOTP was verified via the popup, we need to complete the login
    // The TOTP verification popup should have handled the login completion
    const destination = redirectTo || '/dashboard'
    router.push(destination)
  }

  const handleTOTPCancel = () => {
    setShowTOTPPopup(false)
    setPendingUserId(null)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen p-6 rounded shadow-md bg-gray-100">
      <div className="flex flex-col lg:flex-row min-h-screen max-w-7xl mx-auto">
        <div className="w-full lg:w-2/5 flex flex-col p-4 sm:p-6 md:p-8 bg-white">
          <div className="max-w-md w-full mx-auto flex flex-col flex-grow">
            <div className="flex justify-between items-center mb-6">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">ST</span>
              </div>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>

            <div className="mb-8">
              <p className="text-gray-700 text-base sm:text-lg mb-2">Welcome Back 👋</p>
              <h3 className="text-xl sm:text-2xl font-bold">Login to your account</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 items-center ml-7">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors duration-200 w-96 h-10"
              >
                <FcGoogle className="mr-2 text-xl" />
                Google
              </button>
            </div>

            <div className="flex items-center mb-8">
              <hr className="flex-grow border-gray-300" />
              <p className="px-4 text-gray-500 text-sm">Or Login Using</p>
              <hr className="flex-grow border-gray-300" />
            </div>

            {(error || localError) && (
              <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm">
                {error || localError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                  Email/Phone Number
                </label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your Email/Phone Number"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                  Password
                </label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your Password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                onClick={() => console.log('🔘 Submit button clicked!')}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 text-gray-700 text-sm">
                    Remember me
                  </label>
                </div>
                <Link
                  href="/reset-password"
                  className="text-blue-600 hover:text-blue-700 text-sm transition-colors duration-200"
                >
                  Forgot Password?
                </Link>
              </div>
            </form>

            {/* OAuth Login Options */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/api/auth/zoho?action=login'
                  }}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors duration-200"
                >
                  <SiZoho className="h-5 w-5 text-red-600" />
                  <span className="ml-2">Sign in with Zoho</span>
                </button>
              </div>
            </div>

            {/* Development Test Credentials */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">Development Test Credentials:</p>
                <p className="text-xs text-yellow-700">Email: test@example.com</p>
                <p className="text-xs text-yellow-700">Password: password123</p>
                <div className="mt-2 space-x-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ email: 'test@example.com', password: 'password123' })
                    }}
                    className="text-xs text-yellow-800 underline hover:text-yellow-900"
                  >
                    Fill Test Credentials
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/create-test-user', {
                          method: 'POST',
                          credentials: 'include' // Include cookies for authentication
                        })
                        const result = await response.json()
                        if (response.ok) {
                          alert('Test user created/verified successfully!')
                        } else {
                          alert(`Error: ${result.error}`)
                        }
                      } catch {
                        alert('Failed to create test user')
                      }
                    }}
                    className="text-xs text-yellow-800 underline hover:text-yellow-900"
                  >
                    Create Test User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Clear any remaining localStorage data
                      localStorage.clear()
                      // Reload the page
                      window.location.reload()
                    }}
                    className="text-xs text-red-800 underline hover:text-red-900"
                  >
                    Clear Session
                  </button>
                </div>
              </div>
            )}

            <p className="mt-8 text-center text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
              >
                SignUp
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden lg:block w-3/5 bg-gray-100">
          <div className="h-full w-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h2 className="text-4xl font-bold mb-4">Welcome to SignTusk</h2>
              <p className="text-xl opacity-90">Your trusted digital signature platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* TOTP Verification Popup */}
      <TOTPVerificationPopup
        isOpen={showTOTPPopup}
        onClose={handleTOTPCancel}
        onVerified={handleTOTPVerified}
        context="login"
        title="Login Verification Required"
        description="Enter your TOTP code to complete login"
        email={formData.email}
        password={formData.password}
      />
    </div>
  )
}
