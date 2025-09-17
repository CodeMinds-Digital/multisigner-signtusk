import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    await verifyAccessToken(accessToken)

    // Get request body
    const { pdfPath } = await request.json()

    if (!pdfPath) {
      return NextResponse.json(
        { error: 'PDF path is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Getting PDF data for path:', pdfPath)

    // If it's an absolute URL or app-relative path, fetch directly
    if (pdfPath.startsWith('http') || pdfPath.startsWith('/')) {
      let url = pdfPath

      // If it's a relative path, build full URL
      if (pdfPath.startsWith('/')) {
        const host = request.headers.get('host')
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        url = `${protocol}://${host}${pdfPath}`
      }

      const noCacheUrl = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`
      const response = await fetch(noCacheUrl, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      return NextResponse.json({
        success: true,
        data: { base64 }
      })
    }

    // Otherwise, treat as a storage object path and use Supabase SDK download
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .download(pdfPath)

    if (error || !data) {
      throw new Error(error?.message || 'Failed to download PDF from storage')
    }

    const arrayBuffer = await data.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      data: { base64 }
    })

  } catch (error) {
    console.error('Error getting PDF data:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get PDF data' },
      { status: 500 }
    )
  }
}
