'use client'

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export function ResetPasswordForm() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async () => {
    setMessage(null)
    if (!email) {
      setMessage({ type: "error", text: "Please enter your email." })
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({
          type: "success",
          text: "Check your email for the password reset link.",
        })
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-blue-600">Reset Password</h2>
        <p className="text-sm text-gray-600 text-center mt-2">
          Enter your email to receive a password reset link.
        </p>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-md mt-4"
          disabled={loading}
        />

        <button
          onClick={handleResetPassword}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        {message && (
          <p
            className={`mt-3 text-center ${message.type === "success" ? "text-green-500" : "text-red-500"
              }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
