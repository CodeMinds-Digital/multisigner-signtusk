'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Database, ArrowRight, AlertTriangle } from 'lucide-react'
import { switchSupabaseProject } from '@/lib/admin-env-service'
import { getAdminSession } from '@/lib/admin-auth'

export function SupabaseProjectSwitcher() {
  const [newUrl, setNewUrl] = useState('')
  const [newAnonKey, setNewAnonKey] = useState('')
  const [switching, setSwitching] = useState(false)

  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const currentProjectId = currentUrl ? new URL(currentUrl).hostname.split('.')[0] : 'unknown'

  const adminUrl = typeof window !== 'undefined'
    ? localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL')
    : null
  const activeProjectId = adminUrl
    ? new URL(adminUrl).hostname.split('.')[0]
    : currentProjectId

  const handleSwitch = async () => {
    const adminSession = getAdminSession()
    if (!adminSession) return

    if (!newUrl || !newAnonKey) {
      alert('Please provide both URL and anonymous key')
      return
    }

    try {
      const newProjectId = new URL(newUrl).hostname.split('.')[0]

      const confirmed = confirm(
        `Switch to Supabase project "${newProjectId}"?\n\n` +
        `This will:\n` +
        `• Change the active database\n` +
        `• Update both URL and anonymous key\n` +
        `• Refresh the Supabase client\n\n` +
        `Make sure the new credentials are correct!`
      )

      if (!confirmed) return

      setSwitching(true)

      const result = await switchSupabaseProject(newUrl, newAnonKey)

      if (result.success) {
        alert(result.message)
        setNewUrl('')
        setNewAnonKey('')
        window.location.reload() // Refresh to update all components
      } else {
        alert(result.error)
      }
    } catch (error: any) {
      alert(`Invalid URL format: ${error.message}`)
    } finally {
      setSwitching(false)
    }
  }

  const extractProjectId = (url: string) => {
    try {
      return url ? new URL(url).hostname.split('.')[0] : ''
    } catch {
      return ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span>Supabase Project Switcher</span>
        </CardTitle>
        <CardDescription>
          Switch between different Supabase projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Project Status */}
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Current Configuration:</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Process.env Project:</strong> <Badge variant="outline">{currentProjectId}</Badge></div>
            <div><strong>Active Project:</strong> <Badge className={activeProjectId === currentProjectId ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>{activeProjectId}</Badge></div>
            {activeProjectId !== currentProjectId && (
              <div className="flex items-center space-x-1 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Using admin override (different from process.env)</span>
              </div>
            )}
          </div>
        </div>

        {/* Project Switcher Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-url">New Supabase URL</Label>
            <Input
              id="new-url"
              placeholder="https://your-project.supabase.co"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            {newUrl && (
              <div className="text-sm text-gray-600 mt-1">
                Project ID: <Badge variant="outline">{extractProjectId(newUrl) || 'Invalid URL'}</Badge>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="new-key">New Anonymous Key</Label>
            <Input
              id="new-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={newAnonKey}
              onChange={(e) => setNewAnonKey(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSwitch}
              disabled={switching || !newUrl || !newAnonKey}
              className="flex items-center space-x-2"
            >
              {switching ? (
                <>
                  <Database className="w-4 h-4 animate-spin" />
                  <span>Switching...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Switch Project</span>
                </>
              )}
            </Button>

            {newUrl && extractProjectId(newUrl) && (
              <div className="text-sm text-gray-600">
                → Switching to: <Badge variant="outline">{extractProjectId(newUrl)}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Quick Actions:</h4>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewUrl(currentUrl)
                setNewAnonKey('')
              }}
            >
              Reset to Process.env
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewUrl('')
                setNewAnonKey('')
              }}
            >
              Clear Form
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
