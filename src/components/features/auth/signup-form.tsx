'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IoPersonSharp } from 'react-icons/io5'
import { MdFactory } from 'react-icons/md'
import { supabase } from '@/lib/supabase'

// Enterprise email validation utility
const validateCorporateEmail = (email: string): { isValid: boolean; error?: string } => {
  const domain = email.toLowerCase().split('@')[1]

  if (!domain) {
    return { isValid: false, error: 'Invalid email format' }
  }

  // List of individual email domains to reject
  const individualDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
    'ymail.com', 'rocketmail.com', 'mail.com', 'gmx.com', 'protonmail.com',
    'tutanota.com', 'zoho.com', 'fastmail.com', 'hey.com', 'pm.me',
    'rediffmail.com', 'indiatimes.com', 'sify.com', 'vsnl.net'
  ]

  if (individualDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Please use a valid enterprise email address. Individual email domains (gmail.com, yahoo.com, etc.) are not allowed for enterprise accounts.'
    }
  }

  // Additional validation: domain should have at least one dot and be longer than 4 characters
  if (domain.length < 4 || !domain.includes('.')) {
    return { isValid: false, error: 'Please enter a valid enterprise email domain' }
  }

  // Domain should not start or end with a dot or hyphen
  if (domain.startsWith('.') || domain.startsWith('-') || domain.endsWith('.') || domain.endsWith('-')) {
    return { isValid: false, error: 'Invalid email domain format' }
  }

  return { isValid: true }
}

export function SignUpForm() {
  const navigate = useRouter()
  const [step, setStep] = useState(1)
  const [accountType, setAccountType] = useState('Individual')
  const [termsPopup, setTermsPopup] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    companyName: '',
    industryField: '',
    employeeCount: '',
    jobTitle: '',
    department: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [domainCheckInfo, setDomainCheckInfo] = useState<{
    exists: boolean
    isFirstUser: boolean
    companyName?: string
    accessMode?: string
    message?: string
    canSignup?: boolean
  } | null>(null)
  const [checkingDomain, setCheckingDomain] = useState(false)
  const [emailExistsError, setEmailExistsError] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Debounced email existence check for individual accounts
  const checkEmailExists = useCallback(async (email: string) => {
    if (!email || accountType === 'Enterprise') return

    setCheckingEmail(true)
    setEmailExistsError('')

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (result.exists) {
        if (result.emailConfirmed) {
          setEmailExistsError('An account with this email already exists. Please try logging in instead.')
        } else {
          setEmailExistsError('An account with this email exists but is not verified. Please check your email for verification instructions.')
        }
      } else {
        setEmailExistsError('')
      }
    } catch (error) {
      console.error('Error checking email:', error)
      // Don't show error to user for this check
    } finally {
      setCheckingEmail(false)
    }
  }, [accountType])

  // Debounce email check
  useEffect(() => {
    if (!formData.email || accountType === 'Enterprise') {
      setEmailExistsError('')
      return
    }

    const timer = setTimeout(() => {
      checkEmailExists(formData.email)
    }, 1000) // 1 second delay

    return () => clearTimeout(timer)
  }, [formData.email, checkEmailExists, accountType])

  // Check domain when email changes (for enterprise accounts)
  const checkDomain = async (email: string) => {
    if (!email || !email.includes('@')) return

    setCheckingDomain(true)
    try {
      const response = await fetch('/api/corporate/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        const data = await response.json()
        setDomainCheckInfo(data)

        // Auto-fill company name if it's an existing enterprise account
        if (data.exists && data.companyName && !formData.companyName) {
          setFormData(prev => ({ ...prev, companyName: data.companyName }))
        }
      }
    } catch (error) {
      console.error('Domain check error:', error)
    } finally {
      setCheckingDomain(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Real-time email validation for enterprise accounts
    if (name === 'email' && accountType === 'Enterprise' && value) {
      const validation = validateCorporateEmail(value)
      setEmailError(validation.error || '')

      // Check domain if email is valid
      if (validation.isValid) {
        checkDomain(value)
      } else {
        setDomainCheckInfo(null)
      }
    } else if (name === 'email') {
      setEmailError('')
      setDomainCheckInfo(null)
    }
  }

  // Validate required fields based on account type
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Common validations
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Enterprise-specific validations
    if (accountType === 'Enterprise') {
      if (!formData.companyName.trim()) {
        errors.companyName = 'Company name is required'
      } else if (formData.companyName.trim().length < 2) {
        errors.companyName = 'Company name must be at least 2 characters long'
      }

      // Validate enterprise email
      if (formData.email) {
        const emailValidation = validateCorporateEmail(formData.email)
        if (!emailValidation.isValid) {
          errors.email = emailValidation.error || 'Invalid enterprise email'
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleTermsAgree = () => {
    setAgreedToTerms(true)
    setTermsPopup(false)
  }

  const handleStep1Continue = () => {
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!agreedToTerms) {
      setError('Please agree to the Terms and Conditions')
      setLoading(false)
      return
    }

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors above')
      setLoading(false)
      return
    }

    try {
      // ENTERPRISE SIGNUP: Use dedicated enterprise signup endpoint
      if (accountType === 'Enterprise') {
        const response = await fetch('/api/corporate/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: `${formData.firstName} ${formData.lastName}`.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            companyName: formData.companyName,
            industryField: formData.industryField || null,
            employeeCount: formData.employeeCount || null,
            jobTitle: formData.jobTitle || null,
            department: formData.department || null,
            phoneNumber: formData.phoneNumber || null
          })
        })

        const result = await response.json()

        if (!response.ok) {
          if (result.requiresInvitation) {
            setError(result.error || 'This enterprise account is invite-only')
          } else if (result.requiresApproval) {
            // Show success message for approval mode
            navigate.push('/verify-email?status=pending_approval')
          } else {
            setError(result.error || 'Enterprise signup failed')
          }
          setLoading(false)
          return
        }

        // Success - redirect based on status
        if (result.requiresApproval) {
          navigate.push('/verify-email?status=pending_approval')
        } else {
          navigate.push('/verify-email')
        }
        return
      }

      // INDIVIDUAL SIGNUP: Use standard Supabase signup
      const userMetadata = {
        account_type: 'individual',
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`.trim()
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: userMetadata,
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/verify-email`,
        },
      })

      if (signUpError) {
        // Handle specific error cases with better user messaging
        if (signUpError.message.includes('User already registered') ||
          signUpError.message.includes('already been registered')) {
          setError('An account with this email already exists. Please try logging in instead or use a different email address.')
        } else if (signUpError.message.includes('Database error') ||
          signUpError.message.includes('saving new user')) {
          setError('There was an issue creating your account. Please try again in a moment.')
        } else if (signUpError.message.includes('Invalid email')) {
          setError('Please enter a valid email address.')
        } else if (signUpError.message.includes('Password')) {
          setError('Password must be at least 6 characters long.')
        } else {
          setError(signUpError.message)
        }
        console.error('Sign-up error:', signUpError)
        setLoading(false)
        return
      }

      if (data.user) {
        // Send custom verification email
        try {
          const response = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email })
          })

          if (response.ok) {
            console.log('Verification email sent successfully')
          } else {
            console.warn('Failed to send verification email, but signup was successful')
          }
        } catch (error) {
          console.warn('Error sending verification email:', error)
        }

        navigate.push('/verify-email')
      }
    } catch (error) {
      console.error('General error:', error)
      if (error instanceof Error) {
        if (error.message.includes('User already registered') ||
          error.message.includes('already been registered')) {
          setError('An account with this email already exists. Please try logging in instead or use a different email address.')
        } else if (error.message.includes('Database error') ||
          error.message.includes('saving new user')) {
          setError('There was an issue creating your account. Please try again in a moment.')
        } else {
          setError(error.message)
        }
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen p-6 bg-gray-100">
        <div className="flex flex-col lg:flex-row min-h-screen max-w-7xl mx-auto">
          {/* Left side */}
          <div className="w-full lg:w-1/2 flex flex-col p-4 sm:p-6 md:p-8 bg-white">
            {/* Logo Section  */}
            <div className="w-full flex justify-between items-center">
              <div className="w-32 sm:w-40 h-16 sm:h-24 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">ST</span>
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

            {/* Main Content Container */}
            <div className="flex flex-col flex-grow items-center lg:items-start mt-8 lg:mt-12 max-w-xl mx-auto w-full">
              {/* Heading */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center lg:text-left px-4">
                How are you planning to use SignTusk?
              </h2>

              {/* Description */}
              <p className="text-gray-600 text-sm sm:text-base mt-4 text-center lg:text-left px-4">
                We&apos;ll fit the experience to your needs. Don&apos;t worry, you can change it later.
              </p>

              {/* Buttons Container */}
              <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full justify-center px-4">
                {/* Individual Button */}
                <button
                  onClick={() => setAccountType('Individual')}
                  className={`w-full sm:w-64 ${accountType === 'Individual' ? 'bg-blue-50 border-blue-500' : 'bg-gray-100'} hover:bg-blue-50 transition-colors duration-200 rounded-xl p-6 flex flex-col items-center group border-2`}
                >
                  <IoPersonSharp className={`${accountType === 'Individual' ? 'text-blue-600' : 'text-gray-700'} text-2xl sm:text-3xl mb-3 group-hover:text-blue-600`} />
                  <h3 className="text-gray-900 font-semibold mb-1">Individual</h3>
                  <p className="text-gray-500 text-xs">Person</p>
                </button>

                {/* Enterprise Button */}
                <button
                  onClick={() => setAccountType('Enterprise')}
                  className={`w-full sm:w-64 ${accountType === 'Enterprise' ? 'bg-blue-50 border-blue-500' : 'bg-gray-100'} hover:bg-blue-50 transition-colors duration-200 rounded-xl p-6 flex flex-col items-center group border-2`}
                >
                  <MdFactory className={`${accountType === 'Enterprise' ? 'text-blue-600' : 'text-gray-700'} text-2xl sm:text-3xl mb-3 group-hover:text-blue-600`} />
                  <h3 className="text-gray-900 font-semibold mb-1">Enterprise</h3>
                  <p className="text-gray-500 text-xs">Enterprise</p>
                </button>
              </div>

              {/* Let's Create Button */}
              <div className="w-full px-4 mt-12">
                <button
                  onClick={handleStep1Continue}
                  className="w-full sm:w-96 mx-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl flex items-center justify-center space-x-2 transition-colors duration-200"
                >
                  <span>Let&apos;s Create</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden lg:block w-1/2 bg-gradient-to-br from-blue-600 to-purple-700">
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center text-white p-8">
                <h2 className="text-4xl font-bold mb-4">Join SignTusk</h2>
                <p className="text-xl opacity-90">Start your digital signature journey</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="flex flex-col lg:flex-row h-full max-w-7xl mx-auto rounded-xl shadow bg-white">
        <div className="flex flex-col w-full lg:w-3/6 p-4 sm:p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-base sm:text-lg text-gray-500">
              Welcome to <br />
              <p className="font-bold text-xl sm:text-2xl md:text-3xl text-black">
                SignTusk, Your Trusted Digital Signature Partner!
              </p>
            </h2>
          </div>

          <p className="text-gray-600 text-xs sm:text-sm mb-6">
            Let&apos;s get you started. Create your account below to secure and sign
            your documents with ease.
          </p>

          <div className="mb-6">
            <h3 className="text-xs sm:text-sm font-semibold mb-3">Type of Account</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                className={`rounded-xl py-3 px-4 w-full sm:w-48 ${accountType === 'Individual'
                  ? 'bg-blue-200 text-blue-600'
                  : 'bg-gray-200 text-black'
                  } hover:bg-blue-200 hover:text-blue-600 flex items-center justify-center`}
                onClick={() => setAccountType('Individual')}
              >
                <IoPersonSharp className="mr-2" /> Individual
              </button>
              <button
                type="button"
                className={`rounded-xl py-3 px-4 w-full sm:w-48 ${accountType === 'Enterprise'
                  ? 'bg-blue-200 text-blue-600'
                  : 'bg-gray-200 text-black'
                  } hover:bg-blue-200 hover:text-blue-600 flex items-center justify-center`}
                onClick={() => setAccountType('Enterprise')}
              >
                <MdFactory className="mr-2" /> Enterprise
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm">
                {error}
                {error.includes('account with this email already exists') && (
                  <div className="mt-2">
                    <a
                      href="/login"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Go to Login Page
                    </a>
                  </div>
                )}
              </div>
            )}

            {emailError && (
              <div className="mb-4 p-2 bg-yellow-100 text-yellow-700 rounded text-sm">
                {emailError}
              </div>
            )}

            {emailExistsError && (
              <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm">
                {emailExistsError}
                {emailExistsError.includes('try logging in instead') && (
                  <div className="mt-2">
                    <a
                      href="/login"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Go to Login Page
                    </a>
                  </div>
                )}
              </div>
            )}

            {accountType === 'Individual' ? (
              <>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="w-full">
                    <label className="block text-xs font-bold mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter your First Name"
                      className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.firstName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {validationErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter your Last Name"
                      className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.lastName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {validationErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">
                    Email Address *
                    {checkingEmail && (
                      <span className="ml-2 text-blue-500 text-xs">Checking...</span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.email || emailExistsError ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="w-full">
                    <label className="block text-xs font-bold mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter your First Name"
                      className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.firstName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {validationErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter your Last Name"
                      className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.lastName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {validationErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">Company Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter your Company Name"
                    className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.companyName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                  {validationErrors.companyName && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.companyName}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">Enterprise Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your enterprise email address"
                    className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.email || emailError ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                  )}

                  {/* Domain Check Status */}
                  {checkingDomain && (
                    <div className="mt-2 p-2 bg-blue-50 text-blue-600 rounded text-xs flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking domain...
                    </div>
                  )}

                  {domainCheckInfo && !checkingDomain && (
                    <div className={`mt-2 p-2 rounded text-xs ${domainCheckInfo.isFirstUser
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : domainCheckInfo.canSignup
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                      <p className="font-semibold mb-1">
                        {domainCheckInfo.isFirstUser ? '🎉 You\'ll be the first!' : '📋 Enterprise Account Info'}
                      </p>
                      <p>{domainCheckInfo.message}</p>
                      {!domainCheckInfo.canSignup && (
                        <p className="mt-1 font-semibold">⚠️ Signup is not available. Please contact your administrator.</p>
                      )}
                    </div>
                  )}

                  {!domainCheckInfo && !checkingDomain && (
                    <p className="text-gray-500 text-xs mt-1">
                      Please use your enterprise email address. Individual email domains (gmail.com, yahoo.com, etc.) are not allowed.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="w-full">
                    <label className="block text-xs font-semibold mb-1">Industry Field</label>
                    <select
                      name="industryField"
                      value={formData.industryField}
                      onChange={handleChange}
                      className="w-full p-2.5 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Industry</option>
                      <option value="Technology">Technology</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance</option>
                      <option value="Education">Education</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Retail">Retail</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Legal">Legal</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold mb-1">Employee Count</label>
                    <select
                      name="employeeCount"
                      value={formData.employeeCount}
                      onChange={handleChange}
                      className="w-full p-2.5 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="w-full">
                    <label className="block text-xs font-semibold mb-1">Job Title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      placeholder="e.g., Marketing Manager"
                      className="w-full p-2.5 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-semibold mb-1">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g., Marketing"
                      className="w-full p-2.5 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="w-full p-2.5 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password (min. 6 characters)"
                className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.password ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
              {validationErrors.password && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`w-full p-2.5 text-sm rounded-md border ${validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-xs">
                I agree to the{' '}
                <button
                  type="button"
                  className="text-blue-500 hover:underline"
                  onClick={() => setTermsPopup(true)}
                >
                  Terms and Conditions
                </button>
              </label>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center bg-blue-600 text-white w-full py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (accountType === 'Enterprise' && !!emailError) || !!emailExistsError}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center w-3/6 bg-gray-100">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h2 className="text-4xl font-bold mb-4">Welcome to SignTusk</h2>
              <p className="text-xl opacity-90">Your digital signature platform</p>
            </div>
          </div>
        </div>
      </div>

      {termsPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Terms and Conditions</h3>
            <div className="text-sm text-gray-600 mb-4">
              <p className="mb-2">Welcome to SignTusk. By using our service, you agree to the following terms:</p>

              <h4 className="font-semibold mt-3 mb-1">1. Account Registration</h4>
              <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials.</p>

              <h4 className="font-semibold mt-3 mb-1">2. Service Usage</h4>
              <p>Our digital signature service is to be used for legal and legitimate purposes only. You agree not to use the service for any fraudulent or unauthorized activities.</p>

              <h4 className="font-semibold mt-3 mb-1">3. Privacy</h4>
              <p>We collect and process your data as described in our Privacy Policy. By using our service, you consent to such processing.</p>

              <h4 className="font-semibold mt-3 mb-1">4. Security</h4>
              <p>We implement security measures to protect your data, but you are responsible for maintaining the confidentiality of your account.</p>
            </div>
            <button
              onClick={handleTermsAgree}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 w-full"
            >
              I Agree
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
