import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define route patterns
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api/auth/callback'
]

const authRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email'
]

const protectedRoutes = [
  '/dashboard',
  '/documents',
  '/upload',
  '/activity',
  '/pending',
  '/completed',
  '/drafts',
  '/expired',
  '/sign-1',
  '/request-signature'
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  })
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route => pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return res
  }

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Handle authentication errors
    if (error) {
      console.error('Auth error in middleware:', error)
      // Clear any corrupted session
      await supabase.auth.signOut()
    }

    const isAuthenticated = !!session?.user
    const isPublic = isPublicRoute(pathname)
    const isAuth = isAuthRoute(pathname)
    const isProtected = isProtectedRoute(pathname)

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Redirect unauthenticated users to login for protected routes
    if (!isAuthenticated && isProtected) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Allow root page for everyone, but authenticated users can access dashboard directly
    // No redirect needed for root page - it will show the landing page

    // For authenticated users on protected routes, verify user profile exists
    if (isAuthenticated && isProtected) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('email', session.user.email)
          .maybeSingle()

        if (profileError) {
          console.error('Profile check error:', profileError)
        }

        // If user is authenticated but no profile exists, sign them out and redirect
        if (!profile) {
          console.warn('User authenticated but no profile found, redirecting to signup')
          await supabase.auth.signOut()
          const signupUrl = new URL('/signup', req.url)
          signupUrl.searchParams.set('message', 'Please complete your registration')
          return NextResponse.redirect(signupUrl)
        }
      } catch (err) {
        console.error('Error checking user profile:', err)
        // Continue anyway - table might not exist yet
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to continue
    return res
  }
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
