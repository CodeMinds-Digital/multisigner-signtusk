'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Settings, RefreshCw, Users, FileText, PenTool, 
  Mail, Shield, Upload, Database, Bell, Globe,
  CheckCircle, XCircle, AlertTriangle, Eye, Plus
} from 'lucide-react'

export interface FeatureFlag {
  id: string
  name: string
  key: string
  description: string
  category: 'core' | 'premium' | 'experimental' | 'integration'
  is_enabled: boolean
  is_global: boolean
  user_restrictions?: string[]
  plan_restrictions?: string[]
  rollout_percentage: number
  created_at: string
  updated_at: string
  dependencies?: string[]
  impact_level: 'low' | 'medium' | 'high' | 'critical'
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
      // Mock data - in real implementation, fetch from feature_flags table
      const mockFeatures: FeatureFlag[] = [
        {
          id: '1',
          name: 'Multi-Signature Workflows',
          key: 'multi_signature_enabled',
          description: 'Enable multi-signer document workflows with sequential and parallel signing',
          category: 'core',
          is_enabled: true,
          is_global: true,
          rollout_percentage: 100,
          impact_level: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Document Templates',
          key: 'document_templates_enabled',
          description: 'Allow users to create and manage reusable document templates',
          category: 'core',
          is_enabled: true,
          is_global: true,
          rollout_percentage: 100,
          impact_level: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Email Notifications',
          key: 'email_notifications_enabled',
          description: 'Send email notifications for signature requests and reminders',
          category: 'core',
          is_enabled: true,
          is_global: true,
          rollout_percentage: 100,
          impact_level: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'QR Code Signing',
          key: 'qr_code_signing_enabled',
          description: 'Generate QR codes for mobile document signing',
          category: 'core',
          is_enabled: true,
          is_global: true,
          rollout_percentage: 100,
          impact_level: 'low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'Advanced Analytics',
          key: 'advanced_analytics_enabled',
          description: 'Detailed analytics and reporting for document workflows',
          category: 'premium',
          is_enabled: false,
          is_global: false,
          plan_restrictions: ['pro', 'enterprise'],
          rollout_percentage: 0,
          impact_level: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '6',
          name: 'API Access',
          key: 'api_access_enabled',
          description: 'RESTful API access for third-party integrations',
          category: 'premium',
          is_enabled: true,
          is_global: false,
          plan_restrictions: ['pro', 'enterprise'],
          rollout_percentage: 100,
          impact_level: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '7',
          name: 'Bulk Operations',
          key: 'bulk_operations_enabled',
          description: 'Bulk document operations and batch processing',
          category: 'premium',
          is_enabled: false,
          is_global: false,
          plan_restrictions: ['enterprise'],
          rollout_percentage: 0,
          impact_level: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '8',
          name: 'AI Document Analysis',
          key: 'ai_document_analysis_enabled',
          description: 'AI-powered document content analysis and suggestions',
          category: 'experimental',
          is_enabled: false,
          is_global: false,
          rollout_percentage: 10,
          impact_level: 'low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '9',
          name: 'Voice Signatures',
          key: 'voice_signatures_enabled',
          description: 'Voice-based signature authentication (experimental)',
          category: 'experimental',
          is_enabled: false,
          is_global: false,
          rollout_percentage: 5,
          impact_level: 'low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '10',
          name: 'Salesforce Integration',
          key: 'salesforce_integration_enabled',
          description: 'Two-way sync with Salesforce CRM',
          category: 'integration',
          is_enabled: true,
          is_global: false,
          plan_restrictions: ['pro', 'enterprise'],
          rollout_percentage: 100,
          impact_level: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '11',
          name: 'Google Drive Integration',
          key: 'google_drive_integration_enabled',
          description: 'Import and export documents from Google Drive',
          category: 'integration',
          is_enabled: true,
          is_global: true,
          rollout_percentage: 100,
          impact_level: 'low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '12',
          name: 'Slack Notifications',
          key: 'slack_notifications_enabled',
          description: 'Send signature notifications to Slack channels',
          category: 'integration',
          is_enabled: false,
          is_global: false,
          rollout_percentage: 50,
          impact_level: 'low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      setFeatures(mockFeatures)
    } catch (error) {
      console.error('Error loading feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFeature = async (featureId: string, enabled: boolean) => {
    try {
      setFeatures(prev => prev.map(feature => 
        feature.id === featureId 
          ? { ...feature, is_enabled: enabled, updated_at: new Date().toISOString() }
          : feature
      ))

      console.log(`Toggled feature ${featureId}:`, enabled)
    } catch (error) {
      console.error('Error toggling feature:', error)
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
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat?.color || 'gray'
  }

  const filteredFeatures = features.filter(feature => {
    const matchesCategory = feature.category === activeCategory
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Toggle Management</h2>
          <p className="text-gray-600">Control feature availability and rollout across the platform</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadFeatureFlags} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Category Navigation */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {categories.map(category => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feature List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading features...</span>
            </CardContent>
          </Card>
        ) : (
          filteredFeatures.map(feature => (
            <Card key={feature.id} className={`${!feature.is_enabled ? 'opacity-75' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{feature.name}</h3>
                      <Badge variant="outline" className={`text-xs ${getCategoryColor(feature.category)}`}>
                        {feature.category}
                      </Badge>
                      <Badge className={`text-xs ${getImpactColor(feature.impact_level)}`}>
                        {feature.impact_level} impact
                      </Badge>
                      {feature.is_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Scope:</span>
                        <span className="ml-2 text-gray-600">
                          {feature.is_global ? 'Global' : 'Restricted'}
                        </span>
                      </div>
                      
                      {feature.plan_restrictions && (
                        <div>
                          <span className="font-medium text-gray-700">Plans:</span>
                          <span className="ml-2 text-gray-600">
                            {feature.plan_restrictions.join(', ')}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium text-gray-700">Rollout:</span>
                        <span className="ml-2 text-gray-600">{feature.rollout_percentage}%</span>
                      </div>
                    </div>

                    {/* Rollout Percentage Control */}
                    {feature.is_enabled && !feature.is_global && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rollout Percentage: {feature.rollout_percentage}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={feature.rollout_percentage}
                          onChange={(e) => updateRolloutPercentage(feature.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6">
                    <Switch
                      checked={feature.is_enabled}
                      onCheckedChange={(checked) => toggleFeature(feature.id, checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Summary</CardTitle>
          <CardDescription>Overview of feature enablement across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(category => {
              const categoryFeatures = features.filter(f => f.category === category.id)
              const enabledCount = categoryFeatures.filter(f => f.is_enabled).length
              const totalCount = categoryFeatures.length
              const percentage = totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 0

              return (
                <div key={category.id} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{enabledCount}/{totalCount}</div>
                  <div className="text-sm text-gray-600">{category.label}</div>
                  <div className="text-xs text-gray-500">{percentage}% enabled</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
