'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function VerifyEmail() {
    const [message, setMessage] = useState('')
    const [isResending, setIsResending] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Listen for auth state changes to handle verification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
                    // Only redirect when user actually gets verified (SIGNED_IN event)
                    router.push('/dashboard')
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [router])

    const handleResendEmail = async () => {
        setIsResending(true)
        setMessage('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: user.email,
                })

                if (error) {
                    setMessage(`Error: ${error.message}`)
                } else {
                    setMessage('Verification email sent! Please check your inbox.')
                }
            }
        } catch {
            setMessage('Failed to resend verification email.')
        } finally {
            setIsResending(false)
        }
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

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('Error')
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                            }`}>
                            {message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            onClick={handleResendEmail}
                            disabled={isResending}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResending ? 'Sending...' : 'Resend verification email'}
                        </button>

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