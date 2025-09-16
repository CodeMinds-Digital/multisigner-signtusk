import Link from 'next/link'

export default function Custom500() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Server Error</h2>
          <p className="text-gray-600">
            An internal server error occurred. Please try again later or contact support if the problem persists.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
