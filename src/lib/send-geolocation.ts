/**
 * Send Geolocation Service
 * Track visitor location using IP geolocation
 */

export interface GeolocationData {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  regionCode?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
}

export class SendGeolocation {
  /**
   * Get geolocation data from IP address
   * Uses ip-api.com free tier (45 requests/minute)
   */
  static async getLocationFromIP(ip: string): Promise<GeolocationData> {
    try {
      // Skip localhost and private IPs
      if (this.isPrivateIP(ip)) {
        return {
          ip,
          country: 'Unknown',
          countryCode: 'XX',
          city: 'Unknown'
        }
      }

      // Use ip-api.com (free tier)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`)
      const data = await response.json()

      if (data.status === 'fail') {
        console.error('Geolocation API error:', data.message)
        return {
          ip,
          country: 'Unknown',
          countryCode: 'XX',
          city: 'Unknown'
        }
      }

      return {
        ip,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        regionCode: data.region,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp
      }
    } catch (error) {
      console.error('Failed to get geolocation:', error)
      return {
        ip,
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown'
      }
    }
  }

  /**
   * Get geolocation from request headers (server-side)
   */
  static async getLocationFromRequest(request: Request): Promise<GeolocationData> {
    const ip = this.getIPFromRequest(request)
    return this.getLocationFromIP(ip)
  }

  /**
   * Extract IP address from request
   */
  static getIPFromRequest(request: Request): string {
    // Try various headers in order of preference
    const headers = request.headers

    // Cloudflare
    const cfIP = headers.get('cf-connecting-ip')
    if (cfIP) return cfIP

    // X-Forwarded-For (most common)
    const xForwardedFor = headers.get('x-forwarded-for')
    if (xForwardedFor) {
      const ips = xForwardedFor.split(',')
      return ips[0].trim()
    }

    // X-Real-IP
    const xRealIP = headers.get('x-real-ip')
    if (xRealIP) return xRealIP

    // Vercel
    const vercelIP = headers.get('x-vercel-forwarded-for')
    if (vercelIP) return vercelIP

    // Fallback
    return '0.0.0.0'
  }

  /**
   * Check if IP is private/localhost
   */
  static isPrivateIP(ip: string): boolean {
    if (!ip || ip === '0.0.0.0') return true

    // Localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true

    // Private ranges
    const parts = ip.split('.')
    if (parts.length !== 4) return false

    const first = parseInt(parts[0])
    const second = parseInt(parts[1])

    // 10.0.0.0 - 10.255.255.255
    if (first === 10) return true

    // 172.16.0.0 - 172.31.255.255
    if (first === 172 && second >= 16 && second <= 31) return true

    // 192.168.0.0 - 192.168.255.255
    if (first === 192 && second === 168) return true

    return false
  }

  /**
   * Get country flag emoji from country code
   */
  static getCountryFlag(countryCode: string): string {
    if (!countryCode || countryCode === 'XX') return '🌍'
    
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    
    return String.fromCodePoint(...codePoints)
  }

  /**
   * Format location string
   */
  static formatLocation(location: GeolocationData): string {
    const parts: string[] = []
    
    if (location.city && location.city !== 'Unknown') {
      parts.push(location.city)
    }
    
    if (location.region && location.region !== location.city) {
      parts.push(location.region)
    }
    
    if (location.country && location.country !== 'Unknown') {
      parts.push(location.country)
    }

    return parts.length > 0 ? parts.join(', ') : 'Unknown Location'
  }

  /**
   * Get distance between two coordinates (in km)
   */
  static getDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Convert degrees to radians
   */
  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Group locations by country
   */
  static groupByCountry(locations: GeolocationData[]): Map<string, number> {
    const countryMap = new Map<string, number>()
    
    locations.forEach(location => {
      const country = location.country || 'Unknown'
      countryMap.set(country, (countryMap.get(country) || 0) + 1)
    })
    
    return countryMap
  }

  /**
   * Group locations by city
   */
  static groupByCity(locations: GeolocationData[]): Map<string, number> {
    const cityMap = new Map<string, number>()
    
    locations.forEach(location => {
      const city = location.city || 'Unknown'
      cityMap.set(city, (cityMap.get(city) || 0) + 1)
    })
    
    return cityMap
  }

  /**
   * Get top countries from locations
   */
  static getTopCountries(locations: GeolocationData[], limit: number = 10): Array<{ country: string; count: number; percentage: number }> {
    const countryMap = this.groupByCountry(locations)
    const total = locations.length
    
    return Array.from(countryMap.entries())
      .map(([country, count]) => ({
        country,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get top cities from locations
   */
  static getTopCities(locations: GeolocationData[], limit: number = 10): Array<{ city: string; country: string; count: number }> {
    const cityData = new Map<string, { city: string; country: string; count: number }>()
    
    locations.forEach(location => {
      const city = location.city || 'Unknown'
      const country = location.country || 'Unknown'
      const key = `${city}, ${country}`
      
      if (cityData.has(key)) {
        cityData.get(key)!.count++
      } else {
        cityData.set(key, { city, country, count: 1 })
      }
    })
    
    return Array.from(cityData.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }
}

