'use client'

import { useState } from 'react'
import { Calendar, ExternalLink, Plus, Settings, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface CalendarIntegration {
  id: string
  name: string
  type: 'google' | 'outlook' | 'apple' | 'other'
  email: string
  connected: boolean
  lastSync: string
  status: 'active' | 'error' | 'syncing'
}

export default function CalendarIntegrationPage() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([
    {
      id: '1',
      name: 'Google Calendar',
      type: 'google',
      email: 'user@gmail.com',
      connected: true,
      lastSync: '2 minutes ago',
      status: 'active'
    },
    {
      id: '2',
      name: 'Outlook Calendar',
      type: 'outlook',
      email: 'user@outlook.com',
      connected: false,
      lastSync: 'Never',
      status: 'error'
    }
  ])

  const [settings, setSettings] = useState({
    autoCreateEvents: true,
    syncBusyTimes: true,
    preventDoubleBooking: true,
    bufferTime: 15,
    defaultCalendar: 'google'
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'syncing': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'error': return <AlertCircle className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar Integration</h1>
        <p className="text-gray-600 mt-1">Connect your calendars to sync availability and prevent double bookings</p>
      </div>

      <Tabs defaultValue="calendars" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendars">Connected Calendars</TabsTrigger>
          <TabsTrigger value="settings">Sync Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendars" className="space-y-6">
          {/* Add New Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Calendar
              </CardTitle>
              <CardDescription>Connect a new calendar service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <span>Google Calendar</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <span>Outlook Calendar</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="w-6 h-6 text-gray-600" />
                  <span>Apple Calendar</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Connected Calendars */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Calendars</CardTitle>
              <CardDescription>Manage your connected calendar accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calendar className="w-8 h-8 text-blue-600" />
                      <div>
                        <div className="font-medium">{integration.name}</div>
                        <div className="text-sm text-gray-600">{integration.email}</div>
                        <div className="text-xs text-gray-500">Last sync: {integration.lastSync}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(integration.status)}>
                        {getStatusIcon(integration.status)}
                        <span className="ml-1 capitalize">{integration.status}</span>
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Settings</CardTitle>
              <CardDescription>Configure how your calendars sync with meetings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Auto-create calendar events</Label>
                  <p className="text-sm text-gray-600">Automatically create events in your calendar when meetings are booked</p>
                </div>
                <CustomSwitch
                  checked={settings.autoCreateEvents}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCreateEvents: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Sync busy times</Label>
                  <p className="text-sm text-gray-600">Check your calendar for conflicts before allowing bookings</p>
                </div>
                <CustomSwitch
                  checked={settings.syncBusyTimes}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, syncBusyTimes: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Prevent double booking</Label>
                  <p className="text-sm text-gray-600">Block time slots that conflict with existing events</p>
                </div>
                <CustomSwitch
                  checked={settings.preventDoubleBooking}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, preventDoubleBooking: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buffer-time">Buffer time between meetings (minutes)</Label>
                <Input
                  id="buffer-time"
                  type="number"
                  value={settings.bufferTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, bufferTime: parseInt(e.target.value) }))}
                  className="w-32"
                />
                <p className="text-sm text-gray-600">Time to add before and after each meeting</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
