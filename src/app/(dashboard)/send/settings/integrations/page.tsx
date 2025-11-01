'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Webhook, Key, Slack, Mail, Zap, Copy, Eye, EyeOff, Trash2, Plus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'

interface Webhook {
  id: string
  url: string
  events: string[]
  enabled: boolean
  created_at: string
}

interface APIKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

interface Integration {
  id: string
  type: string
  name: string
  config: any
  enabled: boolean
  created_at: string
}

export default function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  // Webhook dialog
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['document.viewed'])

  // API Key dialog
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [apiKeyName, setApiKeyName] = useState('')
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

  // Slack dialog
  const [slackDialogOpen, setSlackDialogOpen] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [slackChannel, setSlackChannel] = useState('#general')

  const supabase = createClientComponentClient()

  const availableEvents = [
    'document.viewed',
    'document.downloaded',
    'document.printed',
    'nda.accepted',
    'email.verified',
    'feedback.submitted',
    'high_engagement.detected',
    'visitor.returned'
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      await Promise.all([
        loadWebhooks(),
        loadAPIKeys(),
        loadIntegrations()
      ])
    } finally {
      setLoading(false)
    }
  }

  async function loadWebhooks() {
    try {
      const response = await fetch('/api/send/webhooks')
      const data = await response.json()
      if (data.success) {
        setWebhooks(data.webhooks)
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
    }
  }

  async function loadAPIKeys() {
    try {
      const response = await fetch('/api/send/api-keys')
      const data = await response.json()
      if (data.success) {
        setAPIKeys(data.keys)
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
    }
  }

  async function loadIntegrations() {
    try {
      const { data } = await supabase
        .from('send_integrations')
        .select('*')
        .order('created_at', { ascending: false })

      setIntegrations(data || [])
    } catch (error) {
      console.error('Error loading integrations:', error)
    }
  }

  async function createWebhook() {
    try {
      const response = await fetch('/api/send/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          events: webhookEvents
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Webhook created successfully')
        setWebhookDialogOpen(false)
        setWebhookUrl('')
        setWebhookEvents(['document.viewed'])
        loadWebhooks()

        // Show secret once
        if (data.secret) {
          toast.info(`Webhook secret: ${data.secret}`, { duration: 10000 })
        }
      } else {
        toast.error(data.error || 'Failed to create webhook')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create webhook')
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const response = await fetch(`/api/send/webhooks/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Webhook deleted')
        loadWebhooks()
      } else {
        toast.error(data.error || 'Failed to delete webhook')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete webhook')
    }
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    try {
      const response = await fetch(`/api/send/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Webhook ${enabled ? 'enabled' : 'disabled'}`)
        loadWebhooks()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update webhook')
    }
  }

  async function createAPIKey() {
    try {
      const response = await fetch('/api/send/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: apiKeyName,
          scopes: ['read', 'write']
        })
      })

      const data = await response.json()
      if (data.success) {
        setNewApiKey(data.apiKey)
        toast.success('API key created successfully')
        loadAPIKeys()
      } else {
        toast.error(data.error || 'Failed to create API key')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create API key')
    }
  }

  async function deleteAPIKey(id: string) {
    if (!confirm('Are you sure you want to revoke this API key?')) return

    try {
      const response = await fetch(`/api/send/api-keys/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('API key revoked')
        loadAPIKeys()
      } else {
        toast.error(data.error || 'Failed to revoke API key')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke API key')
    }
  }

  async function createSlackIntegration() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('send_integrations')
        .insert({
          user_id: user.id,
          type: 'slack',
          name: `Slack - ${slackChannel}`,
          config: {
            webhook_url: slackWebhookUrl,
            channel: slackChannel,
            events: ['document.viewed', 'nda.accepted', 'high_engagement.detected']
          },
          enabled: true
        })

      if (error) throw error

      toast.success('Slack integration created')
      setSlackDialogOpen(false)
      setSlackWebhookUrl('')
      setSlackChannel('#general')
      loadIntegrations()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create Slack integration')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Settings', href: '/send/settings' },
          { label: 'Integrations' }
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect webhooks, API keys, and third-party apps</p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="apps">
            <Zap className="h-4 w-4 mr-2" />
            Apps
          </TabsTrigger>
        </TabsList>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>
                    Receive real-time notifications when events occur
                  </CardDescription>
                </div>
                <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Webhook
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Webhook</DialogTitle>
                      <DialogDescription>
                        Configure a webhook to receive event notifications
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input
                          id="webhook-url"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://example.com/webhook"
                        />
                      </div>
                      <div>
                        <Label>Events to Subscribe</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {availableEvents.map((event) => (
                            <label
                              key={event}
                              className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted"
                            >
                              <input
                                type="checkbox"
                                checked={webhookEvents.includes(event)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setWebhookEvents([...webhookEvents, event])
                                  } else {
                                    setWebhookEvents(webhookEvents.filter(ev => ev !== event))
                                  }
                                }}
                              />
                              <span className="text-sm">{event}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setWebhookDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createWebhook} disabled={!webhookUrl || webhookEvents.length === 0}>
                        Create Webhook
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No webhooks configured. Create one to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{webhook.url}</p>
                          {webhook.enabled ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CustomSwitch
                          checked={webhook.enabled}
                          onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage API keys for programmatic access
                  </CardDescription>
                </div>
                <Dialog open={apiKeyDialogOpen} onOpenChange={(open) => {
                  setApiKeyDialogOpen(open)
                  if (!open) setNewApiKey(null)
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Generate a new API key for programmatic access
                      </DialogDescription>
                    </DialogHeader>
                    {newApiKey ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800 mb-2">
                            ⚠️ Save this API key now. You won't be able to see it again!
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 p-2 bg-white border rounded text-sm font-mono">
                              {newApiKey}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(newApiKey)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="api-key-name">Key Name</Label>
                          <Input
                            id="api-key-name"
                            value={apiKeyName}
                            onChange={(e) => setApiKeyName(e.target.value)}
                            placeholder="Production API Key"
                          />
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      {newApiKey ? (
                        <Button onClick={() => {
                          setApiKeyDialogOpen(false)
                          setNewApiKey(null)
                          setApiKeyName('')
                        }}>
                          Done
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createAPIKey} disabled={!apiKeyName}>
                            Create Key
                          </Button>
                        </>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No API keys created. Create one to access the API.
                </p>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{key.key_prefix}...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAPIKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apps Tab */}
        <TabsContent value="apps" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slack */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Slack className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Slack</CardTitle>
                    <CardDescription>Get notifications in Slack</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Dialog open={slackDialogOpen} onOpenChange={setSlackDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Slack
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect Slack</DialogTitle>
                      <DialogDescription>
                        Configure Slack notifications for document events
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                        <Input
                          id="slack-webhook"
                          value={slackWebhookUrl}
                          onChange={(e) => setSlackWebhookUrl(e.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="slack-channel">Channel</Label>
                        <Input
                          id="slack-channel"
                          value={slackChannel}
                          onChange={(e) => setSlackChannel(e.target.value)}
                          placeholder="#general"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSlackDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createSlackIntegration} disabled={!slackWebhookUrl}>
                        Connect
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Receive email alerts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Already Configured
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

