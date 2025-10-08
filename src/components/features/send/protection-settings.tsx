'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Eye,
  Printer,
  MousePointer,
  Droplets,
  AlertTriangle,
  Info
} from 'lucide-react'

interface ProtectionSettings {
  screenshot_protection: boolean
  watermark_enabled: boolean
  watermark_text: string
  watermark_opacity: number
  watermark_color: string
  watermark_position: string
  print_protection: boolean
  right_click_protection: boolean
}

interface ProtectionSettingsProps {
  settings: ProtectionSettings
  onChange: (settings: ProtectionSettings) => void
  disabled?: boolean
}

export function ProtectionSettings({
  settings,
  onChange,
  disabled = false
}: ProtectionSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ProtectionSettings>(settings)

  const updateSetting = (key: keyof ProtectionSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    onChange(newSettings)
  }

  const watermarkPositions = [
    { value: 'center', label: 'Center' },
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'diagonal', label: 'Diagonal Pattern' }
  ]

  return (
    <div className="space-y-6">
      {/* Screenshot Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Screenshot Protection
            <Badge variant={localSettings.screenshot_protection ? 'default' : 'secondary'}>
              {localSettings.screenshot_protection ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Prevent viewers from taking screenshots of your document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Screenshot Protection</Label>
              <p className="text-sm text-gray-500">
                Blocks common screenshot methods and keyboard shortcuts
              </p>
            </div>
            <CustomSwitch
              checked={localSettings.screenshot_protection}
              onCheckedChange={(checked) => updateSetting('screenshot_protection', checked)}
              disabled={disabled}
            />
          </div>

          {localSettings.screenshot_protection && (
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Protection Limitations
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                    Screenshot protection provides basic deterrence but cannot prevent all capture methods.
                    Consider using watermarks for additional security.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watermark Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Watermark Protection
            <Badge variant={localSettings.watermark_enabled ? 'default' : 'secondary'}>
              {localSettings.watermark_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Add a watermark overlay to identify document viewers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Watermark</Label>
              <p className="text-sm text-gray-500">
                Display a watermark overlay on the document
              </p>
            </div>
            <CustomSwitch
              checked={localSettings.watermark_enabled}
              onCheckedChange={(checked) => updateSetting('watermark_enabled', checked)}
              disabled={disabled}
            />
          </div>

          {localSettings.watermark_enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                <Label htmlFor="watermark-text">Watermark Text</Label>
                <Input
                  id="watermark-text"
                  value={localSettings.watermark_text}
                  onChange={(e) => updateSetting('watermark_text', e.target.value)}
                  placeholder="CONFIDENTIAL"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Opacity: {Math.round(localSettings.watermark_opacity * 100)}%</Label>
                <Slider
                  value={[localSettings.watermark_opacity]}
                  onValueChange={([value]) => updateSetting('watermark_opacity', value)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="watermark-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="watermark-color"
                      type="color"
                      value={localSettings.watermark_color}
                      onChange={(e) => updateSetting('watermark_color', e.target.value)}
                      disabled={disabled}
                      className="w-16 h-10"
                    />
                    <Input
                      value={localSettings.watermark_color}
                      onChange={(e) => updateSetting('watermark_color', e.target.value)}
                      disabled={disabled}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={localSettings.watermark_position}
                    onValueChange={(value) => updateSetting('watermark_position', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {watermarkPositions.map((position) => (
                        <SelectItem key={position.value} value={position.value}>
                          {position.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Watermark Preview */}
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg relative overflow-hidden">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</div>
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    color: localSettings.watermark_color,
                    opacity: localSettings.watermark_opacity,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transform: 'rotate(-45deg)',
                    userSelect: 'none'
                  }}
                >
                  {localSettings.watermark_text || 'WATERMARK'}
                </div>
                <div className="h-20 bg-white dark:bg-gray-900 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <span className="text-gray-400">Document Content</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Protection Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Additional Protection
          </CardTitle>
          <CardDescription>
            Extra security measures for sensitive documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Protection
              </Label>
              <p className="text-sm text-gray-500">
                Prevent viewers from printing the document
              </p>
            </div>
            <CustomSwitch
              checked={localSettings.print_protection}
              onCheckedChange={(checked) => updateSetting('print_protection', checked)}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Right-Click Protection
              </Label>
              <p className="text-sm text-gray-500">
                Disable right-click context menu
              </p>
            </div>
            <CustomSwitch
              checked={localSettings.right_click_protection}
              onCheckedChange={(checked) => updateSetting('right_click_protection', checked)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Security Notice
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              These protection measures provide deterrence against casual attempts to capture content.
              For highly sensitive documents, consider additional security measures such as access controls,
              time limits, and viewer authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
