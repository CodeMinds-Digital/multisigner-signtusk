'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Mail, Smartphone, Slack, Webhook, Save, TestTube } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationSettings {
  // Email Notifications
  email_document_viewed: boolean
  email_document_downloaded: boolean
  email_high_engagement: boolean
  email_link_expiring: boolean
  email_weekly_summary: boolean
  email_frequency: 'immediate' | 'hourly' | 'daily'
  
  // Real-time Notifications
  realtime_enabled: boolean
  realtime_document_viewed: boolean
  realtime_high_engagement: boolean
  
  // Slack Integration
  slack_enabled: boolean
  slack_webhook_url?: string
  slack_document_viewed: boolean
  slack_high_engagement: boolean
  
  // Webhook Notifications
  webhook_enabled: boolean
  webhook_url?: string
  webhook_events: string[]
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_document_viewed: true,
    email_document_downloaded: true,
    email_high_engagement: true,
    email_link_expiring: true,
    email_weekly_summary: true,
    email_frequency: 'immediate',
    realtime_enabled: true,
    realtime_document_viewed: true,
    realtime_high_engagement: true,
    slack_enabled: false,
    slack_document_viewed: false,
    slack_high_engagement: false,
    webhook_enabled: false,
    webhook_events: []
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/send/settings/notifications')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data.settings }))
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/send/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Notification settings saved successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const testNotification = async (type: string) => {
    setTesting(true)
    try {
      const response = await fetch('/api/send/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        toast.success(`Test ${type} notification sent successfully`)
      } else {
        throw new Error('Failed to send test notification')
      }
    } catch (error) {
      toast.error(`Failed to send test ${type} notification`)
    } finally {
      setTesting(false)
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/send/settings' },
          { label: 'Notifications' }
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure how and when you receive notifications about document activity
        </p>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="slack" className="flex items-center gap-2">
            <Slack className="w-4 h-4" />
            Slack
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* Email Notifications */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email notifications for document activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Document Viewed</Label>
                    <p className="text-sm text-gray-500">Get notified when someone views your documents</p>
                  </div>
                  <CustomSwitch
                    checked={settings.email_document_viewed}
                    onCheckedChange={(checked) => updateSetting('email_document_viewed', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Document Downloaded</Label>
                    <p className="text-sm text-gray-500">Get notified when documents are downloaded</p>
                  </div>
                  <CustomSwitch
                    checked={settings.email_document_downloaded}
                    onCheckedChange={(checked) => updateSetting('email_document_downloaded', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">High Engagement</Label>
                    <p className="text-sm text-gray-500">Get notified about highly engaged viewers</p>
                  </div>
                  <CustomSwitch
                    checked={settings.email_high_engagement}
                    onCheckedChange={(checked) => updateSetting('email_high_engagement', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Link Expiring</Label>
                    <p className="text-sm text-gray-500">Get notified when share links are about to expire</p>
                  </div>
                  <CustomSwitch
                    checked={settings.email_link_expiring}
                    onCheckedChange={(checked) => updateSetting('email_link_expiring', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Weekly Summary</Label>
                    <p className="text-sm text-gray-500">Receive weekly analytics summaries</p>
                  </div>
                  <CustomSwitch
                    checked={settings.email_weekly_summary}
                    onCheckedChange={(checked) => updateSetting('email_weekly_summary', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Frequency</Label>
                <Select
                  value={settings.email_frequency}
                  onValueChange={(value) => updateSetting('email_frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => testNotification('email')} variant="outline" disabled={testing}>
                  <TestTube className="w-4 h-4 mr-2" />
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Notifications */}
        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Real-time Notifications
              </CardTitle>
              <CardDescription>
                Configure in-app real-time notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Real-time Notifications</Label>
                  <p className="text-sm text-gray-500">Show notifications in the app when events occur</p>
                </div>
                <CustomSwitch
                  checked={settings.realtime_enabled}
                  onCheckedChange={(checked) => updateSetting('realtime_enabled', checked)}
                />
              </div>

              {settings.realtime_enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Document Viewed</Label>
                      <p className="text-sm text-gray-500">Real-time alerts for document views</p>
                    </div>
                    <CustomSwitch
                      checked={settings.realtime_document_viewed}
                      onCheckedChange={(checked) => updateSetting('realtime_document_viewed', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">High Engagement</Label>
                      <p className="text-sm text-gray-500">Real-time alerts for high engagement</p>
                    </div>
                    <CustomSwitch
                      checked={settings.realtime_high_engagement}
                      onCheckedChange={(checked) => updateSetting('realtime_high_engagement', checked)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </Tabs>
    </div>
  )
}
