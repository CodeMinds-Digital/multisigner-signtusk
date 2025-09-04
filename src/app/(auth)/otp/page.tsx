'use client'

import { useRouter } from 'next/navigation'
import { OtpVerification } from '@/components/features/auth/otp-verification'

export default function OtpPage() {
  const router = useRouter()

  const handleVerify = (otp: string) => {
    // Handle OTP verification logic here
    console.log('Verifying OTP:', otp)
    // On success, redirect to dashboard
    router.push('/dashboard')
  }

  const handleClose = () => {
    router.push('/login')
  }

  return (
    <OtpVerification 
      onVerify={handleVerify}
      onClose={handleClose}
    />
  )
}
