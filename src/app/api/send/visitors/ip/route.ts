import { NextRequest, NextResponse } from 'next/server'
import { IPGeolocationService } from '@/lib/ip-geolocation-service'

/**
 * GET /api/send/visitors/ip
 * Get visitor's IP address and geolocation data
 */
export async function GET(request: NextRequest) {
  try {
    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    // Priority: CF-Connecting-IP > X-Real-IP > X-Forwarded-For > fallback
    let ipAddress = cfConnectingIP || realIP || forwarded?.split(',')[0] || '127.0.0.1'
    ipAddress = ipAddress.trim()

    // Get geolocation data
    const location = await IPGeolocationService.getCachedLocation(ipAddress)

    return NextResponse.json({
      success: true,
      ip: ipAddress,
      country: location?.country,
      countryCode: location?.countryCode,
      city: location?.city,
      region: location?.region,
      timezone: location?.timezone,
      cached: location?.cached
    })
  } catch (error) {
    console.error('IP lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get IP information' },
      { status: 500 }
    )
  }
}

