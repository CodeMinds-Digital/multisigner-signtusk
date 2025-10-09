'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Droplets, Eye, Shield, Palette, Zap, Copy } from 'lucide-react'
import { EnhancedWatermarkConfig } from '@/lib/enhanced-watermark-service'
import { EnhancedWatermarkService } from '@/lib/enhanced-watermark-service'
import { WatermarkPresets } from './enhanced-watermark'

interface EnhancedWatermarkSettingsProps {
  config: EnhancedWatermarkConfig
  onChange: (config: EnhancedWatermarkConfig) => void
  disabled?: boolean
}

export function EnhancedWatermarkSettings({ config, onChange, disabled = false }: EnhancedWatermarkSettingsProps) {
  const [previewText, setPreviewText] = useState('')

  const updateConfig = (updates: Partial<EnhancedWatermarkConfig>) => {
    const newConfig = { ...config, ...updates }
    onChange(newConfig)
  }

  const updateNestedConfig = (key: keyof EnhancedWatermarkConfig, nestedKey: string, value: any) => {
    const newConfig = {
      ...config,
      [key]: {
        ...config[key],
        [nestedKey]: value
      }
    }
    onChange(newConfig)
  }

  const applyPreset = (presetName: keyof typeof WatermarkPresets) => {
    const preset = WatermarkPresets[presetName]
    onChange({ ...config, ...preset })
  }

  const copyTemplate = (template: string) => {
    navigator.clipboard.writeText(template)
  }

  // Generate preview text
  const generatePreview = () => {
    const sampleContext = {
      userEmail: 'user@example.com',
      userName: 'John Doe',
      userIP: '192.168.1.100',
      timestamp: new Date().toISOString(),
      documentTitle: 'Sample Document',
      linkId: 'ABC123',
      sessionId: 'sess_456',
      viewerFingerprint: 'fp_789abc'
    }
    
    return EnhancedWatermarkService.generateWatermarkText(config.template, sampleContext)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Enhanced Watermark Protection
          <Badge variant={config.enabled ? 'default' : 'secondary'}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Advanced watermarking with dynamic user information and security features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Enable Enhanced Watermark</Label>
            <p className="text-sm text-gray-500">
              Display dynamic watermarks with user information
            </p>
          </div>
          <CustomSwitch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
            disabled={disabled}
          />
        </div>

        {config.enabled && (
          <Tabs defaultValue="template" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="pattern">Pattern</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Template Tab */}
            <TabsContent value="template" className="space-y-4">
              {/* Quick Presets */}
              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('basic')}
                    disabled={disabled}
                  >
                    Basic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('confidential')}
                    disabled={disabled}
                  >
                    Confidential
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset('security')}
                    disabled={disabled}
                  >
                    Security
                  </Button>
                </div>
              </div>

              {/* Template Input */}
              <div className="space-y-2">
                <Label htmlFor="watermark-template">Watermark Template</Label>
                <Textarea
                  id="watermark-template"
                  value={config.template}
                  onChange={(e) => updateConfig({ template: e.target.value })}
                  placeholder="{{user_email}} - {{date}} {{time}}"
                  disabled={disabled}
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Use placeholders: {{user_email}}, {{user_name}}, {{timestamp}}, {{date}}, {{time}}, {{document_title}}, {{ip_address}}, {{fingerprint}}
                </p>
              </div>

              {/* Template Examples */}
              <div className="space-y-2">
                <Label>Template Examples</Label>
                <div className="space-y-2">
                  {EnhancedWatermarkService.getDefaultTemplates().map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-gray-500">{template.description}</p>
                        <code className="text-xs bg-gray-100 px-1 rounded">{template.template}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyTemplate(template.template)}
                        disabled={disabled}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-3 bg-gray-50 rounded border">
                  <p className="text-sm font-mono">{generatePreview()}</p>
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={config.position}
                  onValueChange={(value) => updateConfig({ position: value as any })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="diagonal">Diagonal</SelectItem>
                    <SelectItem value="pattern">Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <Label>Opacity: {Math.round(config.opacity * 100)}%</Label>
                <Slider
                  value={[config.opacity]}
                  onValueChange={([value]) => updateConfig({ opacity: value })}
                  min={0.1}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                />
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label>Font Size: {config.fontSize}px</Label>
                <Slider
                  value={[config.fontSize]}
                  onValueChange={([value]) => updateConfig({ fontSize: value })}
                  min={8}
                  max={72}
                  step={1}
                  disabled={disabled}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label htmlFor="watermark-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="watermark-color"
                    type="color"
                    value={config.color}
                    onChange={(e) => updateConfig({ color: e.target.value })}
                    disabled={disabled}
                    className="w-16 h-10"
                  />
                  <Input
                    value={config.color}
                    onChange={(e) => updateConfig({ color: e.target.value })}
                    disabled={disabled}
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <Label>Rotation: {config.rotation}°</Label>
                <Slider
                  value={[config.rotation]}
                  onValueChange={([value]) => updateConfig({ rotation: value })}
                  min={-180}
                  max={180}
                  step={15}
                  disabled={disabled}
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={config.fontFamily}
                  onValueChange={(value) => updateConfig({ fontFamily: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                    <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Pattern Tab */}
            <TabsContent value="pattern" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Pattern Mode</Label>
                  <p className="text-sm text-gray-500">
                    Display multiple watermarks across the document
                  </p>
                </div>
                <CustomSwitch
                  checked={config.pattern?.enabled || false}
                  onCheckedChange={(enabled) => updateNestedConfig('pattern', 'enabled', enabled)}
                  disabled={disabled}
                />
              </div>

              {config.pattern?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                  <div className="space-y-2">
                    <Label>Spacing: {config.pattern.spacing || 200}px</Label>
                    <Slider
                      value={[config.pattern.spacing || 200]}
                      onValueChange={([value]) => updateNestedConfig('pattern', 'spacing', value)}
                      min={100}
                      max={500}
                      step={25}
                      disabled={disabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Stagger Pattern</Label>
                      <p className="text-sm text-gray-500">
                        Offset alternating rows for better coverage
                      </p>
                    </div>
                    <CustomSwitch
                      checked={config.pattern.stagger || false}
                      onCheckedChange={(stagger) => updateNestedConfig('pattern', 'stagger', stagger)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Hide on Screenshot</Label>
                  <p className="text-sm text-gray-500">
                    Temporarily hide watermark during screenshot attempts
                  </p>
                </div>
                <CustomSwitch
                  checked={config.security?.hideOnScreenshot || false}
                  onCheckedChange={(hide) => updateNestedConfig('security', 'hideOnScreenshot', hide)}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Randomize Position</Label>
                  <p className="text-sm text-gray-500">
                    Slightly randomize watermark position over time
                  </p>
                </div>
                <CustomSwitch
                  checked={config.security?.randomizePosition || false}
                  onCheckedChange={(randomize) => updateNestedConfig('security', 'randomizePosition', randomize)}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dynamic Opacity</Label>
                  <p className="text-sm text-gray-500">
                    Vary opacity slightly to prevent easy removal
                  </p>
                </div>
                <CustomSwitch
                  checked={config.security?.dynamicOpacity || false}
                  onCheckedChange={(dynamic) => updateNestedConfig('security', 'dynamicOpacity', dynamic)}
                  disabled={disabled}
                />
              </div>

              {/* Animation Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Animation</Label>
                    <p className="text-sm text-gray-500">
                      Add subtle animations to watermark
                    </p>
                  </div>
                  <CustomSwitch
                    checked={config.animation?.enabled || false}
                    onCheckedChange={(enabled) => updateNestedConfig('animation', 'enabled', enabled)}
                    disabled={disabled}
                  />
                </div>

                {config.animation?.enabled && (
                  <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                    <div className="space-y-2">
                      <Label>Animation Type</Label>
                      <Select
                        value={config.animation.type || 'fade'}
                        onValueChange={(value) => updateNestedConfig('animation', 'type', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="pulse">Pulse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration: {config.animation.duration || 3000}ms</Label>
                      <Slider
                        value={[config.animation.duration || 3000]}
                        onValueChange={([value]) => updateNestedConfig('animation', 'duration', value)}
                        min={1000}
                        max={10000}
                        step={500}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
