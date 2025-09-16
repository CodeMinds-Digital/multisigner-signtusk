import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken, shouldRefreshToken } from '@/lib/jwt-utils'
import { isProtectedRoute, isPublicRoute } from '@/lib/auth-config'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'))
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    const { accessToken } = getAuthTokensFromRequest(request)

    // No access token - redirect to login
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Verify access token
      const payload = await verifyAccessToken(accessToken)

      // Check if token should be refreshed
      if (shouldRefreshToken(payload)) {
        // Redirect to refresh endpoint, which will handle the refresh and redirect back
        const refreshUrl = new URL('/api/auth/refresh', request.url)
        const response = NextResponse.redirect(refreshUrl)

        // Add original URL as header for redirect after refresh
        response.headers.set('X-Original-URL', request.url)
        return response
      }

      // Token is valid, continue to protected route
      const response = NextResponse.next()

      // Add user info to headers for use in components
      response.headers.set('X-User-ID', payload.userId)
      response.headers.set('X-User-Email', payload.email)
      if (payload.role) {
        response.headers.set('X-User-Role', payload.role)
      }

      return response
    } catch {
      // Invalid token - redirect to refresh first, then login if refresh fails
      const refreshUrl = new URL('/api/auth/refresh', request.url)
      return NextResponse.redirect(refreshUrl)
    }
  }

  // Default: allow request
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
