'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Globe, Clock, Target } from 'lucide-react'
import { SendGeolocation } from '@/lib/send-geolocation'

interface GeolocationInsightsProps {
  documentId: string
  linkId?: string
}

interface TimezoneData {
  timezone: string
  count: number
  percentage: number
}

interface RegionData {
  region: string
  country: string
  count: number
}

export default function GeolocationInsights({ documentId, linkId }: GeolocationInsightsProps) {
  const [loading, setLoading] = useState(true)
  const [timezones, setTimezones] = useState<TimezoneData[]>([])
  const [regions, setRegions] = useState<RegionData[]>([])
  const [topCountry, setTopCountry] = useState<string>('')
  const [internationalPercentage, setInternationalPercentage] = useState(0)

  useEffect(() => {
    loadInsights()
  }, [documentId, linkId])

  const loadInsights = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/send/visitors/session?documentId=${documentId}${linkId ? `&linkId=${linkId}` : ''}`)
      const data = await response.json()

      if (data.success && data.sessions) {
        const sessions = data.sessions

        // Analyze timezones
        const timezoneMap = new Map<string, number>()
        sessions.forEach((session: any) => {
          const tz = session.timezone || 'Unknown'
          timezoneMap.set(tz, (timezoneMap.get(tz) || 0) + 1)
        })

        const total = sessions.length
        const timezoneData = Array.from(timezoneMap.entries())
          .map(([timezone, count]) => ({
            timezone,
            count,
            percentage: (count / total) * 100
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setTimezones(timezoneData)

        // Analyze regions
        const regionMap = new Map<string, { country: string; count: number }>()
        sessions.forEach((session: any) => {
          const region = session.region || 'Unknown'
          const country = session.country || 'Unknown'
          const key = `${region}, ${country}`
          
          if (regionMap.has(key)) {
            regionMap.get(key)!.count++
          } else {
            regionMap.set(key, { country, count: 1 })
          }
        })

        const regionData = Array.from(regionMap.entries())
          .map(([key, data]) => {
            const [region] = key.split(', ')
            return {
              region,
              country: data.country,
              count: data.count
            }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setRegions(regionData)

        // Find top country
        const countryMap = new Map<string, number>()
        sessions.forEach((session: any) => {
          const country = session.country || 'Unknown'
          countryMap.set(country, (countryMap.get(country) || 0) + 1)
        })

        const sortedCountries = Array.from(countryMap.entries())
          .sort((a, b) => b[1] - a[1])

        if (sortedCountries.length > 0) {
          setTopCountry(sortedCountries[0][0])
          
          // Calculate international percentage
          const topCountryCount = sortedCountries[0][1]
          const internationalCount = total - topCountryCount
          setInternationalPercentage((internationalCount / total) * 100)
        }
      }
    } catch (error) {
      console.error('Failed to load geolocation insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (timezones.length === 0 && regions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
          <p className="text-gray-600">Geographic insights will appear once you have visitors</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Geographic Insights
          </CardTitle>
          <CardDescription>Key findings from visitor locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Top Country */}
            {topCountry && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-green-900 mb-1">Primary Market</div>
                    <div className="text-sm text-green-700 mb-2">
                      Most of your viewers are from <strong>{topCountry}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={100 - internationalPercentage} className="flex-1 h-2" />
                      <span className="text-xs text-green-600 font-medium">
                        {(100 - internationalPercentage).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* International Reach */}
            {internationalPercentage > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900 mb-1">International Reach</div>
                    <div className="text-sm text-blue-700 mb-2">
                      {internationalPercentage.toFixed(0)}% of viewers are from other countries
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={internationalPercentage} className="flex-1 h-2" />
                      <span className="text-xs text-blue-600 font-medium">
                        {internationalPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timezones */}
            {timezones.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Top Timezones</h3>
                </div>
                <div className="space-y-2">
                  {timezones.map((tz) => (
                    <div key={tz.timezone} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-900">{tz.timezone}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{tz.count} visitors</span>
                        <Badge variant="outline" className="text-xs">
                          {tz.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regions */}
            {regions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Top Regions</h3>
                </div>
                <div className="space-y-2">
                  {regions.map((region) => (
                    <div key={`${region.region}-${region.country}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{region.region}</div>
                        <div className="text-xs text-gray-600">{region.country}</div>
                      </div>
                      <Badge variant="secondary">{region.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm text-purple-900">
                <div className="font-semibold mb-2">💡 Recommendations</div>
                <ul className="space-y-1 text-purple-700">
                  {topCountry && topCountry !== 'Unknown' && (
                    <li>• Consider creating localized content for {topCountry}</li>
                  )}
                  {internationalPercentage > 30 && (
                    <li>• Your document has strong international appeal - consider translations</li>
                  )}
                  {timezones.length > 3 && (
                    <li>• Viewers span multiple timezones - schedule follow-ups accordingly</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

