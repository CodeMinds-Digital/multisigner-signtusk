'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, MapPin, Users } from 'lucide-react'
import { SendGeolocation } from '@/lib/send-geolocation'

interface GeographicMapProps {
  documentId: string
  linkId?: string
}

interface CountryData {
  country: string
  countryCode: string
  count: number
  percentage: number
}

interface CityData {
  city: string
  country: string
  count: number
}

export default function GeographicMap({ documentId, linkId }: GeographicMapProps) {
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<CountryData[]>([])
  const [cities, setCities] = useState<CityData[]>([])
  const [totalVisitors, setTotalVisitors] = useState(0)

  useEffect(() => {
    loadGeographicData()
  }, [documentId, linkId])

  const loadGeographicData = async () => {
    try {
      setLoading(true)
      
      // Fetch sessions with location data
      const response = await fetch(`/api/send/visitors/session?documentId=${documentId}${linkId ? `&linkId=${linkId}` : ''}`)
      const data = await response.json()

      if (data.success && data.sessions) {
        const sessions = data.sessions

        // Group by country
        const countryMap = new Map<string, { code: string; count: number }>()
        sessions.forEach((session: any) => {
          const country = session.country || 'Unknown'
          const countryCode = session.country_code || 'XX'
          
          if (countryMap.has(country)) {
            countryMap.get(country)!.count++
          } else {
            countryMap.set(country, { code: countryCode, count: 1 })
          }
        })

        const total = sessions.length
        const countryData = Array.from(countryMap.entries())
          .map(([country, data]) => ({
            country,
            countryCode: data.code,
            count: data.count,
            percentage: (data.count / total) * 100
          }))
          .sort((a, b) => b.count - a.count)

        setCountries(countryData)

        // Group by city
        const cityMap = new Map<string, { country: string; count: number }>()
        sessions.forEach((session: any) => {
          const city = session.city || 'Unknown'
          const country = session.country || 'Unknown'
          const key = `${city}, ${country}`
          
          if (cityMap.has(key)) {
            cityMap.get(key)!.count++
          } else {
            cityMap.set(key, { country, count: 1 })
          }
        })

        const cityData = Array.from(cityMap.entries())
          .map(([key, data]) => {
            const [city] = key.split(', ')
            return {
              city,
              country: data.country,
              count: data.count
            }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        setCities(cityData)
        setTotalVisitors(total)
      }
    } catch (error) {
      console.error('Failed to load geographic data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBarWidth = (percentage: number) => {
    return `${Math.max(percentage, 2)}%`
  }

  const getBarColor = (index: number) => {
    const colors = [
      'bg-green-600',
      'bg-green-500',
      'bg-blue-600',
      'bg-blue-500',
      'bg-purple-600',
      'bg-purple-500',
      'bg-orange-600',
      'bg-orange-500',
      'bg-pink-600',
      'bg-pink-500'
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (countries.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Geographic Data</h3>
          <p className="text-gray-600">Location data will appear once you have visitors</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Where your viewers are located</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Total Visitors</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{totalVisitors}</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Countries</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{countries.length}</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Cities</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{cities.length}</div>
            </div>
          </div>

          {/* Countries */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Countries</h3>
            <div className="space-y-3">
              {countries.slice(0, 10).map((country, index) => (
                <div key={country.country} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SendGeolocation.getCountryFlag(country.countryCode)}</span>
                      <span className="font-medium text-gray-900">{country.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{country.count} visitors</span>
                      <Badge variant="outline" className="text-xs">
                        {country.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(index)} transition-all duration-500`}
                      style={{ width: getBarWidth(country.percentage) }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cities */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Cities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cities.map((city, index) => (
                <div
                  key={`${city.city}-${city.country}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">{city.city}</div>
                      <div className="text-xs text-gray-600">{city.country}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{city.count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* World Map Placeholder */}
          <div className="mt-6 p-8 bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-lg text-center">
            <Globe className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Map</h3>
            <p className="text-gray-600 mb-4">
              Interactive world map visualization coming soon!
            </p>
            <p className="text-sm text-gray-500">
              Will display visitor locations on an interactive map with clustering and heatmap overlay.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

