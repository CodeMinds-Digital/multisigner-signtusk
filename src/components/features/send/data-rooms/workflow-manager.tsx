'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Rocket, 
  Crown, 
  Clock, 
  CheckCircle,
  Star,
  Zap,
  Users,
  Shield,
  Palette,
  FileText,
  Settings,
  ArrowRight,
  Gift,
  Timer,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface Template {
  id: string
  name: string
  description: string
  category: string
  preview_image_url: string
  is_premium: boolean
  features: string[]
  primary_color: string
  secondary_color: string
}

interface TrialInfo {
  is_trial: boolean
  trial_expires_at: string | null
  trial_days_remaining: number
  features_used: {
    data_rooms_created: number
    collaborators_invited: number
    documents_uploaded: number
    custom_branding_used: boolean
  }
  limits: {
    max_data_rooms: number
    max_collaborators: number
    max_documents: number
    custom_branding: boolean
  }
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  action?: string
}

interface WorkflowManagerProps {
  dataRoomId: string
}

export function WorkflowManager({ dataRoomId }: WorkflowManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  useEffect(() => {
    fetchWorkflowData()
  }, [dataRoomId])

  const fetchWorkflowData = async () => {
    try {
      const [templatesRes, trialRes, onboardingRes] = await Promise.all([
        fetch('/api/send/templates'),
        fetch('/api/send/trial-info'),
        fetch(`/api/send/data-rooms/${dataRoomId}/onboarding`)
      ])

      const [templatesData, trialData, onboardingData] = await Promise.all([
        templatesRes.json(),
        trialRes.json(),
        onboardingRes.json()
      ])

      if (templatesData.success) setTemplates(templatesData.templates || [])
      if (trialData.success) setTrialInfo(trialData.trial_info)
      if (onboardingData.success) setOnboardingSteps(onboardingData.steps || [])
    } catch (error) {
      console.error('Error fetching workflow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = async (templateId: string) => {
    setApplyingTemplate(true)
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Template applied successfully!')
        setShowTemplateDialog(false)
        // Refresh the page to show updated branding
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to apply template')
      }
    } catch (error) {
      console.error('Error applying template:', error)
      toast.error('Failed to apply template')
    } finally {
      setApplyingTemplate(false)
    }
  }

  const completeOnboardingStep = async (stepId: string) => {
    try {
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/onboarding/${stepId}/complete`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setOnboardingSteps(steps => 
          steps.map(step => 
            step.id === stepId ? { ...step, completed: true } : step
          )
        )
        toast.success('Step completed!')
      }
    } catch (error) {
      console.error('Error completing onboarding step:', error)
    }
  }

  const extendTrial = async () => {
    try {
      const response = await fetch('/api/send/trial/extend', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Trial extended by 7 days!')
        fetchWorkflowData()
      } else {
        toast.error(data.error || 'Failed to extend trial')
      }
    } catch (error) {
      console.error('Error extending trial:', error)
      toast.error('Failed to extend trial')
    }
  }

  const getProgressPercentage = () => {
    if (!onboardingSteps.length) return 0
    const completed = onboardingSteps.filter(step => step.completed).length
    return Math.round((completed / onboardingSteps.length) * 100)
  }

  const getTrialStatusColor = () => {
    if (!trialInfo) return 'text-gray-500'
    if (trialInfo.trial_days_remaining <= 3) return 'text-red-600'
    if (trialInfo.trial_days_remaining <= 7) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading workflow...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Workflow & Templates</h2>
          <p className="text-gray-500">Professional templates and onboarding guidance</p>
        </div>
        
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Palette className="w-4 h-4 mr-2" />
              Browse Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Professional Data Room Templates</DialogTitle>
              <DialogDescription>
                Choose from our collection of professionally designed templates
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 relative overflow-hidden">
                      {template.preview_image_url ? (
                        <img 
                          src={template.preview_image_url} 
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: template.primary_color }}
                        >
                          <Palette className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {template.is_premium && (
                        <Badge className="absolute top-2 right-2 bg-yellow-500">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-500">{template.description}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 3).map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {template.features.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full mt-3" 
                        onClick={() => {
                          setSelectedTemplate(template)
                          applyTemplate(template.id)
                        }}
                        disabled={applyingTemplate}
                      >
                        {applyingTemplate && selectedTemplate?.id === template.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Apply Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trial Status */}
      {trialInfo && trialInfo.is_trial && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-yellow-600" />
              Trial Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className={`text-2xl font-bold mb-2 ${getTrialStatusColor()}`}>
                  {trialInfo.trial_days_remaining} days remaining
                </div>
                <p className="text-gray-600 mb-4">
                  Your trial expires on {new Date(trialInfo.trial_expires_at!).toLocaleDateString()}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Data Rooms</span>
                    <span>{trialInfo.features_used.data_rooms_created}/{trialInfo.limits.max_data_rooms}</span>
                  </div>
                  <Progress 
                    value={(trialInfo.features_used.data_rooms_created / trialInfo.limits.max_data_rooms) * 100} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-sm">
                    <span>Collaborators</span>
                    <span>{trialInfo.features_used.collaborators_invited}/{trialInfo.limits.max_collaborators}</span>
                  </div>
                  <Progress 
                    value={(trialInfo.features_used.collaborators_invited / trialInfo.limits.max_collaborators) * 100} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-sm">
                    <span>Documents</span>
                    <span>{trialInfo.features_used.documents_uploaded}/{trialInfo.limits.max_documents}</span>
                  </div>
                  <Progress 
                    value={(trialInfo.features_used.documents_uploaded / trialInfo.limits.max_documents) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
                
                <Button variant="outline" className="w-full" onClick={extendTrial}>
                  <Gift className="w-4 h-4 mr-2" />
                  Extend Trial (7 days)
                </Button>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>✓ Unlimited data rooms</p>
                  <p>✓ Unlimited collaborators</p>
                  <p>✓ Custom branding</p>
                  <p>✓ Advanced analytics</p>
                  <p>✓ Priority support</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Getting Started
          </CardTitle>
          <CardDescription>
            Complete these steps to set up your professional data room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">{getProgressPercentage()}% complete</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            
            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                  
                  {!step.completed && step.action && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => completeOnboardingStep(step.id)}
                    >
                      {step.action}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                  
                  {step.completed && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-medium mb-2">Invite Collaborators</h3>
            <p className="text-sm text-gray-500 mb-4">Add team members and external partners</p>
            <Button variant="outline" size="sm" className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-medium mb-2">Set Permissions</h3>
            <p className="text-sm text-gray-500 mb-4">Control who can access what</p>
            <Button variant="outline" size="sm" className="w-full">
              Configure
            </Button>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Zap className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-medium mb-2">Custom Branding</h3>
            <p className="text-sm text-gray-500 mb-4">Make it yours with logos and colors</p>
            <Button variant="outline" size="sm" className="w-full">
              Customize
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
