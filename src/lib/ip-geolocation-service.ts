/**
 * IP Geolocation Service
 * Provides IP-based geolocation with Redis caching
 * Supports multiple providers with fallback
 */

import { redis, RedisUtils, CACHE_TTL } from '@/lib/upstash-config'

export interface GeolocationData {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
  org?: string
  asn?: string
  cached?: boolean
}

export class IPGeolocationService {
  private static readonly CACHE_PREFIX = 'geo:ip:'
  private static readonly CACHE_DURATION = CACHE_TTL.ANALYTICS // 5 minutes
  
  // Provider configuration
  private static readonly PROVIDER = process.env.GEOLOCATION_PROVIDER || 'ipapi'
  private static readonly API_KEY = process.env.GEOLOCATION_API_KEY || ''

  /**
   * Get geolocation data with caching
   */
  static async getCachedLocation(ipAddress: string): Promise<GeolocationData | null> {
    if (!ipAddress || this.isPrivateIP(ipAddress)) {
      return {
        ip: ipAddress,
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown'
      }
    }

    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${ipAddress}`
      const cached = await RedisUtils.get<GeolocationData>(cacheKey)
      
      if (cached) {
        return { ...cached, cached: true }
      }

      // Fetch from provider
      const location = await this.fetchFromProvider(ipAddress)
      
      if (location) {
        // Cache the result
        await RedisUtils.setWithTTL(cacheKey, location, this.CACHE_DURATION)
        return { ...location, cached: false }
      }

      return null
    } catch (error) {
      console.error('Geolocation lookup error:', error)
      return null
    }
  }

  /**
   * Fetch geolocation from configured provider
   */
  private static async fetchFromProvider(ipAddress: string): Promise<GeolocationData | null> {
    switch (this.PROVIDER) {
      case 'ipapi':
        return this.fetchFromIPAPI(ipAddress)
      case 'ipinfo':
        return this.fetchFromIPInfo(ipAddress)
      case 'ipgeolocation':
        return this.fetchFromIPGeolocation(ipAddress)
      case 'ipstack':
        return this.fetchFromIPStack(ipAddress)
      default:
        return this.fetchFromIPAPI(ipAddress) // Default to free ipapi.co
    }
  }

  /**
   * Fetch from ipapi.co (free tier: 1000 requests/day)
   */
  private static async fetchFromIPAPI(ipAddress: string): Promise<GeolocationData | null> {
    try {
      const url = this.API_KEY
        ? `https://ipapi.co/${ipAddress}/json/?key=${this.API_KEY}`
        : `https://ipapi.co/${ipAddress}/json/`

      const response = await fetch(url, {
        headers: { 'User-Agent': 'SignTusk/1.0' }
      })

      if (!response.ok) {
        throw new Error(`ipapi.co returned ${response.status}`)
      }

      const data = await response.json()

      return {
        ip: ipAddress,
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        asn: data.asn
      }
    } catch (error) {
      console.error('ipapi.co lookup failed:', error)
      return null
    }
  }

  /**
   * Fetch from ipinfo.io (free tier: 50k requests/month)
   */
  private static async fetchFromIPInfo(ipAddress: string): Promise<GeolocationData | null> {
    try {
      const url = this.API_KEY
        ? `https://ipinfo.io/${ipAddress}?token=${this.API_KEY}`
        : `https://ipinfo.io/${ipAddress}/json`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`ipinfo.io returned ${response.status}`)
      }

      const data = await response.json()
      const [lat, lon] = (data.loc || ',').split(',')

      return {
        ip: ipAddress,
        country: data.country,
        countryCode: data.country,
        region: data.region,
        city: data.city,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lon ? parseFloat(lon) : undefined,
        timezone: data.timezone,
        isp: data.org,
        asn: data.org
      }
    } catch (error) {
      console.error('ipinfo.io lookup failed:', error)
      return null
    }
  }

  /**
   * Fetch from ipgeolocation.io (free tier: 1000 requests/day)
   */
  private static async fetchFromIPGeolocation(ipAddress: string): Promise<GeolocationData | null> {
    if (!this.API_KEY) {
      console.warn('ipgeolocation.io requires API key')
      return null
    }

    try {
      const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${this.API_KEY}&ip=${ipAddress}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`ipgeolocation.io returned ${response.status}`)
      }

      const data = await response.json()

      return {
        ip: ipAddress,
        country: data.country_name,
        countryCode: data.country_code2,
        region: data.state_prov,
        city: data.city,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timezone: data.time_zone?.name,
        isp: data.isp,
        org: data.organization,
        asn: data.asn
      }
    } catch (error) {
      console.error('ipgeolocation.io lookup failed:', error)
      return null
    }
  }

  /**
   * Fetch from ipstack.com (free tier: 10k requests/month)
   */
  private static async fetchFromIPStack(ipAddress: string): Promise<GeolocationData | null> {
    if (!this.API_KEY) {
      console.warn('ipstack.com requires API key')
      return null
    }

    try {
      const url = `http://api.ipstack.com/${ipAddress}?access_key=${this.API_KEY}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`ipstack.com returned ${response.status}`)
      }

      const data = await response.json()

      return {
        ip: ipAddress,
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region_name,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.time_zone?.id,
        isp: data.connection?.isp
      }
    } catch (error) {
      console.error('ipstack.com lookup failed:', error)
      return null
    }
  }

  /**
   * Check if IP is private/local
   */
  private static isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
      /^127\./,                    // Loopback
      /^10\./,                     // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^192\.168\./,               // Private Class C
      /^169\.254\./,               // Link-local
      /^::1$/,                     // IPv6 loopback
      /^fe80:/,                    // IPv6 link-local
      /^fc00:/,                    // IPv6 unique local
      /^fd00:/                     // IPv6 unique local
    ]

    return privateRanges.some(range => range.test(ip))
  }

  /**
   * Bulk lookup with caching
   */
  static async bulkLookup(ipAddresses: string[]): Promise<Map<string, GeolocationData | null>> {
    const results = new Map<string, GeolocationData | null>()
    
    // Process in parallel with rate limiting
    const batchSize = 10
    for (let i = 0; i < ipAddresses.length; i += batchSize) {
      const batch = ipAddresses.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(ip => this.getCachedLocation(ip))
      )
      
      batch.forEach((ip, index) => {
        results.set(ip, batchResults[index])
      })
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < ipAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }

  /**
   * Clear cache for specific IP
   */
  static async clearCache(ipAddress: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${ipAddress}`
    await RedisUtils.del(cacheKey)
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ totalCached: number }> {
    try {
      // This is a simple implementation - in production you might want to track this separately
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`)
      return { totalCached: keys.length }
    } catch (error) {
      return { totalCached: 0 }
    }
  }
}

