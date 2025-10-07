'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function VerifyEmail() {
    const [message, setMessage] = useState('')
    const [isResending, setIsResending] = useState(false)
    const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'instructions'>('instructions')
    const [email, setEmail] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    // Check if this is a token verification or just instructions
    const token = searchParams.get('token')
    const emailParam = searchParams.get('email')
    const status = searchParams.get('status')
    const isVerified = searchParams.get('verified') === 'true'
    const isPendingApproval = status === 'pending_approval'

    useEffect(() => {
        // If we have a token and email, this is a verification attempt
        if (token && emailParam) {
            verifyEmailToken(emailParam, token)
        } else {
            // Listen for auth state changes to handle verification
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event: AuthChangeEvent, session: Session | null) => {
                    if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
                        // Check if user needs approval before redirecting
                        if (!isPendingApproval) {
                            router.push('/dashboard')
                        }
                    }
                }
            )

            return () => subscription.unsubscribe()
        }
    }, [router, isPendingApproval, token, emailParam])

    const verifyEmailToken = async (email: string, token: string) => {
        setVerificationStatus('loading')
        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token })
            })

            const data = await response.json()

            if (response.ok) {
                setVerificationStatus('success')
                setMessage(data.message)
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login?verified=true')
                }, 3000)
            } else {
                setVerificationStatus('error')
                setMessage(data.error || 'Verification failed')
            }
        } catch (error) {
            console.error('Verification error:', error)
            setVerificationStatus('error')
            setMessage('An error occurred during verification. Please try again.')
        }
    }

    const handleResendEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setIsResending(true)
        setMessage('')

        try {
            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const data = await response.json()

            if (response.ok) {
                setMessage(data.message)
            } else {
                setMessage(data.error || 'Failed to send verification email')
            }
        } catch (error) {
            console.error('Error:', error)
            setMessage('An error occurred. Please try again.')
        } finally {
            setIsResending(false)
        }
    }

    // Show token verification UI if we have a token
    if (token && emailParam) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                    <div className="text-center">
                        {verificationStatus === 'loading' && (
                            <>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h1>
                                <p className="text-gray-600">Please wait while we verify your email address...</p>
                            </>
                        )}

                        {verificationStatus === 'success' && (
                            <>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
                                <p className="text-gray-600 mb-4">{message}</p>
                                <p className="text-sm text-gray-500">Redirecting to login page in 3 seconds...</p>
                            </>
                        )}

                        {verificationStatus === 'error' && (
                            <>
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
                                <p className="text-gray-600 mb-6">{message}</p>

                                <div className="space-y-3">
                                    <Link
                                        href="/resend-verification"
                                        className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Request New Verification Email
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Show different UI for pending approval
    if (isPendingApproval) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {isVerified ? 'Email Verified!' : 'Pending Approval'}
                        </h2>

                        {isVerified ? (
                            <div className="mb-6">
                                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
                                    ✅ Your email has been verified successfully!
                                </div>
                                <p className="text-gray-600">
                                    Your corporate account access is pending admin approval. You&apos;ll receive an email notification once your access has been approved.
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-600 mb-6">
                                Your corporate account access requires admin approval. Please verify your email first, then wait for an administrator to approve your access request.
                            </p>
                        )}

                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
                                <p className="font-semibold text-blue-900 mb-2">What happens next?</p>
                                <ul className="text-blue-700 space-y-1 list-disc list-inside">
                                    <li>Admin will review your access request</li>
                                    <li>You&apos;ll receive an email notification</li>
                                    <li>Once approved, you can log in</li>
                                </ul>
                            </div>

                            <Link
                                href="/login"
                                className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Check your email
                    </h2>

                    <p className="text-gray-600 mb-6">
                        We&apos;ve sent a verification link to your email address. Please click the link to verify your account and complete the registration process.
                    </p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                        <h3 className="text-sm font-medium text-yellow-800 mb-2">For Gmail users:</h3>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Check your <strong>spam/junk folder</strong></li>
                            <li>• Look for emails from <strong>"SignTusk"</strong></li>
                            <li>• Add <strong>noreply@notifications.signtusk.com</strong> to your contacts</li>
                            <li>• Wait a few minutes as emails may take time to arrive</li>
                        </ul>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('Error') || message.includes('Failed')
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                            }`}>
                            {message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-4">
                                Didn&apos;t receive the email? Enter your email address to resend:
                            </p>

                            <form onSubmit={handleResendEmail} className="space-y-3">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />

                                <button
                                    type="submit"
                                    disabled={isResending || !email}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                                </button>
                            </form>
                        </div>

                        <p className="text-sm text-gray-600">
                            Already verified?{' '}
                            <Link href="/login" className="text-blue-600 hover:underline font-medium">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}