'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, FileText, Mail, Settings, Plus, X, Eye } from 'lucide-react'
import { OneClickNDAConfig, OneClickNDAService } from '@/lib/one-click-nda-service'

interface OneClickNDASettingsProps {
  config: OneClickNDAConfig
  onChange: (config: OneClickNDAConfig) => void
  disabled?: boolean
}

export function OneClickNDASettings({ config, onChange, disabled = false }: OneClickNDASettingsProps) {
  const [newDomain, setNewDomain] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState(false)

  const templates = OneClickNDAService.getDefaultTemplates()
  const selectedTemplate = templates.find(t => t.id === config.templateId) || templates[0]

  const updateConfig = (updates: Partial<OneClickNDAConfig>) => {
    onChange({ ...config, ...updates })
  }

  const addAutoAcceptDomain = () => {
    if (newDomain.trim() && !config.autoAcceptDomains.includes(newDomain.trim())) {
      updateConfig({
        autoAcceptDomains: [...config.autoAcceptDomains, newDomain.trim()]
      })
      setNewDomain('')
    }
  }

  const removeAutoAcceptDomain = (domain: string) => {
    updateConfig({
      autoAcceptDomains: config.autoAcceptDomains.filter(d => d !== domain)
    })
  }

  const addCustomVariable = (key: string, value: string) => {
    updateConfig({
      customVariables: { ...config.customVariables, [key]: value }
    })
  }

  const removeCustomVariable = (key: string) => {
    const newVariables = { ...config.customVariables }
    delete newVariables[key]
    updateConfig({ customVariables: newVariables })
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="nda-enabled"
          checked={config.enabled}
          onCheckedChange={(checked) => updateConfig({ enabled: !!checked })}
          disabled={disabled}
        />
        <Label htmlFor="nda-enabled" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Enable One-Click NDA System
        </Label>
      </div>

      {config.enabled && (
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Template Tab */}
          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  NDA Template
                </CardTitle>
                <CardDescription>
                  Choose the NDA template and customize variables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={config.templateId}
                    onValueChange={(value) => updateConfig({ templateId: value })}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            <Badge variant={template.category === 'basic' ? 'default' : 'secondary'}>
                              {template.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Template Preview</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(!previewTemplate)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {previewTemplate ? 'Hide' : 'Show'} Preview
                    </Button>
                  </div>
                  
                  {previewTemplate && (
                    <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {selectedTemplate.content}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Custom Variables */}
                <div className="space-y-2">
                  <Label>Custom Variables</Label>
                  <div className="space-y-2">
                    {Object.entries(config.customVariables).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Input
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value
                            removeCustomVariable(key)
                            if (newKey) addCustomVariable(newKey, value)
                          }}
                          placeholder="Variable name"
                          className="flex-1"
                          disabled={disabled}
                        />
                        <Input
                          value={value}
                          onChange={(e) => addCustomVariable(key, e.target.value)}
                          placeholder="Variable value"
                          className="flex-1"
                          disabled={disabled}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomVariable(key)}
                          disabled={disabled}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCustomVariable('new_variable', '')}
                      disabled={disabled}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Variable
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Variables like {selectedTemplate.variables.map(v => `{{${v}}}`).join(', ')} will be automatically replaced
                  </p>
                </div>

                {/* Acceptance Message */}
                <div className="space-y-2">
                  <Label htmlFor="acceptance-message">Acceptance Message</Label>
                  <Textarea
                    id="acceptance-message"
                    value={config.acceptanceMessage}
                    onChange={(e) => updateConfig({ acceptanceMessage: e.target.value })}
                    placeholder="Message shown after successful NDA acceptance"
                    disabled={disabled}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acceptance Requirements</CardTitle>
                <CardDescription>
                  Configure what information is required for NDA acceptance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="require-signature"
                    checked={config.requireSignature}
                    onCheckedChange={(checked) => updateConfig({ requireSignature: !!checked })}
                    disabled={disabled}
                  />
                  <Label htmlFor="require-signature">Require Digital Signature</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="require-full-name"
                    checked={config.requireFullName}
                    onCheckedChange={(checked) => updateConfig({ requireFullName: !!checked })}
                    disabled={disabled}
                  />
                  <Label htmlFor="require-full-name">Require Full Name</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="require-witness"
                    checked={config.requireWitness}
                    onCheckedChange={(checked) => updateConfig({ requireWitness: !!checked })}
                    disabled={disabled}
                  />
                  <Label htmlFor="require-witness">Require Witness Email</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Approval Settings</CardTitle>
                <CardDescription>
                  Configure domains that can automatically accept NDAs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Auto-Accept Domains</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="company.com"
                      onKeyPress={(e) => e.key === 'Enter' && addAutoAcceptDomain()}
                      disabled={disabled}
                    />
                    <Button onClick={addAutoAcceptDomain} disabled={disabled}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.autoAcceptDomains.map((domain) => (
                      <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                        {domain}
                        <button
                          onClick={() => removeAutoAcceptDomain(domain)}
                          className="ml-1 hover:text-red-500"
                          disabled={disabled}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Users from these domains will have their NDAs automatically approved
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Configure who gets notified when NDAs are accepted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-owner"
                    checked={config.emailNotifications.notifyOwner}
                    onCheckedChange={(checked) => 
                      updateConfig({
                        emailNotifications: {
                          ...config.emailNotifications,
                          notifyOwner: !!checked
                        }
                      })
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor="notify-owner">Notify Document Owner</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-acceptor"
                    checked={config.emailNotifications.notifyAcceptor}
                    onCheckedChange={(checked) => 
                      updateConfig({
                        emailNotifications: {
                          ...config.emailNotifications,
                          notifyAcceptor: !!checked
                        }
                      })
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor="notify-acceptor">Send Confirmation to Acceptor</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-witness"
                    checked={config.emailNotifications.notifyWitness}
                    onCheckedChange={(checked) => 
                      updateConfig({
                        emailNotifications: {
                          ...config.emailNotifications,
                          notifyWitness: !!checked
                        }
                      })
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor="notify-witness">Notify Witness (if required)</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
