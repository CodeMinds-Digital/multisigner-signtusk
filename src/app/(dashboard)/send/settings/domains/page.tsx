'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface CustomDomain {
  id: string
  domain: string
  verified: boolean
  ssl_enabled: boolean
  created_at: string
  verification_token?: string
  dns_records?: {
    type: string
    name: string
    value: string
    ttl: number
  }[]
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')

  useEffect(() => {
    loadDomains()
  }, [])

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/send/domains')
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains || [])
      }
    } catch (error) {
      console.error('Failed to load domains:', error)
    } finally {
      setLoading(false)
    }
  }

  const addDomain = async () => {
    if (!newDomain.trim()) return

    setAdding(true)
    try {
      const response = await fetch('/api/send/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setDomains(prev => [...prev, data.domain])
        setNewDomain('')
        toast.success('Domain added successfully. Please configure DNS records to verify.')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add domain')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add domain')
    } finally {
      setAdding(false)
    }
  }

  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId)
    try {
      const response = await fetch(`/api/send/domains/${domainId}/verify`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setDomains(prev => prev.map(d => 
          d.id === domainId ? { ...d, ...data.domain } : d
        ))
        
        if (data.domain.verified) {
          toast.success('Domain verified successfully!')
        } else {
          toast.error('Domain verification failed. Please check your DNS records.')
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to verify domain')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify domain')
    } finally {
      setVerifying(null)
    }
  }

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return

    try {
      const response = await fetch(`/api/send/domains/${domainId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDomains(prev => prev.filter(d => d.id !== domainId))
        toast.success('Domain deleted successfully')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete domain')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete domain')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getStatusBadge = (domain: CustomDomain) => {
    if (domain.verified && domain.ssl_enabled) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    } else if (domain.verified) {
      return <Badge className="bg-yellow-100 text-yellow-800">Verified</Badge>
    } else {
      return <Badge variant="secondary">Pending</Badge>
    }
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
          { label: 'Custom Domains' }
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Custom Domains</h1>
        <p className="text-gray-600 mt-1">
          Use your own domain for document sharing links
        </p>
      </div>

      {/* Add New Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Custom Domain
          </CardTitle>
          <CardDescription>
            Add a custom domain to use for your document sharing links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="docs.yourcompany.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addDomain} disabled={adding || !newDomain.trim()}>
                {adding ? 'Adding...' : 'Add Domain'}
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>• Domain must be a valid FQDN (e.g., docs.yourcompany.com)</p>
            <p>• You must have access to configure DNS records for this domain</p>
            <p>• SSL certificate will be automatically provisioned after verification</p>
          </div>
        </CardContent>
      </Card>

      {/* Existing Domains */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Domains</h2>
        
        {domains.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No custom domains</h3>
              <p className="text-gray-500">Add a custom domain to get started with branded sharing links.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <Card key={domain.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{domain.domain}</h3>
                          {getStatusBadge(domain)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Added {new Date(domain.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!domain.verified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyDomain(domain.id)}
                          disabled={verifying === domain.id}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${verifying === domain.id ? 'animate-spin' : ''}`} />
                          {verifying === domain.id ? 'Verifying...' : 'Verify'}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteDomain(domain.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* DNS Configuration */}
                  {!domain.verified && domain.dns_records && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-medium text-yellow-800">DNS Configuration Required</h4>
                      </div>
                      
                      <p className="text-sm text-yellow-700 mb-3">
                        Add the following DNS records to verify domain ownership:
                      </p>
                      
                      <div className="space-y-2">
                        {domain.dns_records.map((record, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-gray-500">Type</Label>
                                <p className="font-mono">{record.type}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Name</Label>
                                <p className="font-mono">{record.name}</p>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-gray-500">Value</Label>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-xs break-all">{record.value}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(record.value)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <p className="text-xs text-yellow-600 mt-3">
                        DNS changes may take up to 24 hours to propagate. Click "Verify" once the records are added.
                      </p>
                    </div>
                  )}

                  {/* Verified Domain Info */}
                  {domain.verified && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-green-800">Domain Verified</h4>
                      </div>
                      
                      <p className="text-sm text-green-700 mb-3">
                        Your domain is verified and ready to use. Share links will use this domain.
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-700">Example link:</span>
                        <code className="bg-white px-2 py-1 rounded text-sm">
                          https://{domain.domain}/v/abc123
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`https://${domain.domain}/v/abc123`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
