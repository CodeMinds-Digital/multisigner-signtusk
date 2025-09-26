'use client'

import React, { useState } from 'react'
import { CustomSwitch, ToggleSwitch, IOSSwitch, MaterialSwitch } from '@/components/ui/custom-switch'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Code } from 'lucide-react'

export default function TestSwitchesPage() {
  const [switches, setSwitches] = useState({
    custom: false,
    customSm: false,
    customLg: false,
    toggle: false,
    ios: false,
    material: false,
    radix: false,
    disabled: true
  })

  const updateSwitch = (key: string, value: boolean) => {
    setSwitches(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Switch Component Showcase</h1>
        <p className="text-gray-600">Demonstrating reusable switch component patterns</p>
      </div>

      {/* Component Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium">CustomSwitch</div>
                <div className="text-sm text-gray-600">Working ✅</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium">Radix Switch</div>
                <div className="text-sm text-gray-600">Issues ❌</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium">Reusable Pattern</div>
                <div className="text-sm text-gray-600">Implemented ✅</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CustomSwitch Variants */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>CustomSwitch - Different Sizes</CardTitle>
          <CardDescription>
            Our main reusable switch component with size variants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Small Switch</h4>
              <p className="text-sm text-gray-600">Compact size for dense layouts</p>
              <Badge variant="outline" className="mt-1">size="sm"</Badge>
            </div>
            <CustomSwitch
              size="sm"
              checked={switches.customSm}
              onCheckedChange={(checked) => updateSwitch('customSm', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Medium Switch (Default)</h4>
              <p className="text-sm text-gray-600">Standard size for most use cases</p>
              <Badge variant="outline" className="mt-1">size="md"</Badge>
            </div>
            <CustomSwitch
              checked={switches.custom}
              onCheckedChange={(checked) => updateSwitch('custom', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Large Switch</h4>
              <p className="text-sm text-gray-600">Larger size for emphasis</p>
              <Badge variant="outline" className="mt-1">size="lg"</Badge>
            </div>
            <CustomSwitch
              size="lg"
              checked={switches.customLg}
              onCheckedChange={(checked) => updateSwitch('customLg', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Disabled Switch</h4>
              <p className="text-sm text-gray-600">Non-interactive state</p>
              <Badge variant="outline" className="mt-1">disabled={true}</Badge>
            </div>
            <CustomSwitch
              checked={switches.disabled}
              onCheckedChange={(checked) => updateSwitch('disabled', checked)}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Style Variants */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Style Variants</CardTitle>
          <CardDescription>
            Different visual styles for various design systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">ToggleSwitch</h4>
              <p className="text-sm text-gray-600">Includes label and description built-in</p>
              <Badge variant="outline" className="mt-1">Composite Component</Badge>
            </div>
            <ToggleSwitch
              checked={switches.toggle}
              onCheckedChange={(checked) => updateSwitch('toggle', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">iOS Style Switch</h4>
              <p className="text-sm text-gray-600">Green color scheme like iOS</p>
              <Badge variant="outline" className="mt-1">iOS Design</Badge>
            </div>
            <IOSSwitch
              checked={switches.ios}
              onCheckedChange={(checked) => updateSwitch('ios', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Material Design Switch</h4>
              <p className="text-sm text-gray-600">Material Design specifications</p>
              <Badge variant="outline" className="mt-1">Material Design</Badge>
            </div>
            <MaterialSwitch
              checked={switches.material}
              onCheckedChange={(checked) => updateSwitch('material', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Comparison with Radix */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Comparison: CustomSwitch vs Radix Switch</CardTitle>
          <CardDescription>
            Testing both implementations side by side
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">CustomSwitch (Working)</h4>
              <p className="text-sm text-gray-600">Our reliable implementation</p>
              <Badge className="mt-1 bg-green-100 text-green-800">✅ Working</Badge>
            </div>
            <CustomSwitch
              checked={switches.custom}
              onCheckedChange={(checked) => updateSwitch('custom', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Radix UI Switch</h4>
              <p className="text-sm text-gray-600">Original Radix implementation</p>
              <Badge className="mt-1 bg-red-100 text-red-800">❌ Issues</Badge>
            </div>
            <Switch
              checked={switches.radix}
              onCheckedChange={(checked) => updateSwitch('radix', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
          <CardDescription>
            How to use the CustomSwitch in your components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Basic Usage:</h4>
            <pre className="text-sm text-gray-800 overflow-x-auto">
{`import { CustomSwitch } from '@/components/ui/custom-switch'

// Basic switch
<CustomSwitch
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
/>

// With size
<CustomSwitch
  size="lg"
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
/>

// Disabled
<CustomSwitch
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
  disabled={true}
/>`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <h4 className="font-medium mb-2">With Label (ToggleSwitch):</h4>
            <pre className="text-sm text-gray-800 overflow-x-auto">
{`import { ToggleSwitch } from '@/components/ui/custom-switch'

<ToggleSwitch
  label="Enable Notifications"
  description="Get notified when something happens"
  checked={notifications}
  onCheckedChange={setNotifications}
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Reusable Component Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Reusable Component Pattern Benefits</CardTitle>
          <CardDescription>
            Why this approach works well
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">✅ Advantages</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Consistent API across all variants</li>
                <li>• TypeScript support with proper types</li>
                <li>• Keyboard accessibility (Space/Enter)</li>
                <li>• Multiple size options</li>
                <li>• Different style variants</li>
                <li>• Proper ARIA attributes</li>
                <li>• Focus management</li>
                <li>• Easy to customize and extend</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">🔧 Features</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Size variants: sm, md, lg</li>
                <li>• Style variants: Default, iOS, Material</li>
                <li>• Composite components (ToggleSwitch)</li>
                <li>• Disabled state handling</li>
                <li>• Custom className support</li>
                <li>• Smooth animations</li>
                <li>• Consistent color scheme</li>
                <li>• Easy to replace existing switches</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
