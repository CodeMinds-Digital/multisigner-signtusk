'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Settings, Shield, AlertTriangle, Globe, RefreshCw,
  Search, Filter, TrendingUp, Users, Zap
} from 'lucide-react'

interface FeatureFlag {
  id: string
  name: string
  key: string
  description: string
  category: string
  is_enabled: boolean
  is_global: boolean
  user_restrictions?: string[]
  plan_restrictions?: string[]
  rollout_percentage: number
  dependencies?: string[]
  impact_level: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
}

export function FeatureToggleManagement() {
  const [features, setFeatures] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('core')
  const [searchTerm, setSearchTerm] = useState('')

  const categories = [
    { id: 'core', label: 'Core Features', icon: Settings, color: 'blue' },
    { id: 'premium', label: 'Premium Features', icon: Shield, color: 'purple' },
    { id: 'experimental', label: 'Experimental', icon: AlertTriangle, color: 'orange' },
    { id: 'integration', label: 'Integrations', icon: Globe, color: 'green' }
  ]

  useEffect(() => {
    loadFeatureFlags()
  }, [])

  const loadFeatureFlags = async () => {
    setLoading(true)
    try {
      // Get real feature flags from admin API
      const response = await fetch('/api/admin/features', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }

      const data = await response.json()

      // Transform API response to match component interface
      const realFeatures: FeatureFlag[] = data.features.map((feature: any) => ({
        id: feature.id,
        name: feature.name,
        key: feature.key,
        description: feature.description,
        category: feature.category,
        is_enabled: feature.is_enabled,
        is_global: feature.is_global,
        user_restrictions: feature.user_restrictions || [],
        plan_restrictions: feature.plan_restrictions || [],
        rollout_percentage: feature.rollout_percentage,
        dependencies: feature.dependencies || [],
        impact_level: feature.impact_level,
        created_at: feature.created_at,
        updated_at: feature.updated_at
      }))

      setFeatures(realFeatures)
    } catch (error) {
      console.error('Error loading feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFeature = async (featureId: string, enabled: boolean) => {
    try {
      // Call API to toggle feature
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'toggle',
          featureId,
          enabled
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle feature')
      }

      const result = await response.json()

      if (result.success) {
        // Update local state
        setFeatures(prev => prev.map(feature =>
          feature.id === featureId
            ? { ...feature, is_enabled: enabled, updated_at: new Date().toISOString() }
            : feature
        ))

        console.log(`✅ Toggled feature ${featureId}:`, enabled)
      } else {
        throw new Error(result.error || 'Failed to toggle feature')
      }
    } catch (error) {
      console.error('❌ Error toggling feature:', error)
      // Revert the toggle on error
      setFeatures(prev => prev.map(feature =>
        feature.id === featureId
          ? { ...feature, is_enabled: !enabled }
          : feature
      ))
    }
  }

  const updateRolloutPercentage = async (featureId: string, percentage: number) => {
    try {
      setFeatures(prev => prev.map(feature =>
        feature.id === featureId
          ? { ...feature, rollout_percentage: percentage, updated_at: new Date().toISOString() }
          : feature
      ))

      console.log(`Updated rollout for feature ${featureId}:`, percentage)
    } catch (error) {
      console.error('Error updating rollout percentage:', error)
    }
  }

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.color || 'gray'
  }

  const filteredFeatures = features.filter(feature => {
    const matchesCategory = activeCategory === 'all' || feature.category === activeCategory
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getFeatureStats = () => {
    const total = features.length
    const enabled = features.filter(f => f.is_enabled).length
    const experimental = features.filter(f => f.category === 'experimental').length
    const premium = features.filter(f => f.category === 'premium').length

    return { total, enabled, experimental, premium }
  }

  const stats = getFeatureStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Toggle Management</h2>
          <p className="text-gray-600">Control feature availability and rollout across the platform</p>
        </div>
        <Button onClick={loadFeatureFlags} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Features</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enabled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.enabled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Premium</p>
                <p className="text-2xl font-bold text-gray-900">{stats.premium}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Experimental</p>
                <p className="text-2xl font-bold text-gray-900">{stats.experimental}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="flex items-center"
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Feature List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFeatures.map((feature) => (
          <Card key={feature.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{feature.name}</h3>
                    <Badge className={`text-xs ${getImpactColor(feature.impact_level)}`}>
                      {feature.impact_level}
                    </Badge>
                    <Badge variant="outline" className={`text-xs border-${getCategoryColor(feature.category)}-200 text-${getCategoryColor(feature.category)}-700`}>
                      {feature.category}
                    </Badge>
                  </div>

                  <p className="text-gray-600 mb-3">{feature.description}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Key: <code className="bg-gray-100 px-1 rounded">{feature.key}</code></span>
                    <span>Rollout: {feature.rollout_percentage}%</span>
                    {feature.plan_restrictions && feature.plan_restrictions.length > 0 && (
                      <span>Plans: {feature.plan_restrictions.join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Status</p>
                    <Switch
                      checked={feature.is_enabled}
                      onCheckedChange={(checked) => toggleFeature(feature.id, checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No features found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
