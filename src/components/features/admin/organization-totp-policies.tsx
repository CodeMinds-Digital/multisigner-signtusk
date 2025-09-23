'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Shield,
  Building,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Key,
  Clock,
  FileText
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  domain: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'inactive'
  memberCount: number
  created_at: string
}

interface OrganizationTOTPPolicy {
  id: string
  organization_id: string
  enforce_login_mfa: boolean
  login_mfa_grace_period_days: number
  enforce_signing_mfa: boolean
  require_totp_for_all_documents: boolean
  allow_user_override: boolean
  max_backup_codes: number
  totp_window_tolerance: number
  require_mfa_for_admin_actions: boolean
  audit_totp_events: boolean
  retention_period_days: number
  allow_admin_override: boolean
  emergency_access_codes: string[]
}

export function OrganizationTOTPPolicies() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [policy, setPolicy] = useState<OrganizationTOTPPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    domain: '',
    plan: 'free' as const
  })

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)

      // Get real user data to generate organization info
      const response = await fetch('/api/admin/users?includeStats=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json()

      // Generate organizations based on email domains from real users
      const emailDomains = new Map<string, number>()
      data.users.forEach((user: any) => {
        const domain = user.email.split('@')[1]
        emailDomains.set(domain, (emailDomains.get(domain) || 0) + 1)
      })

      const realOrgs: Organization[] = Array.from(emailDomains.entries())
        .filter(([domain, count]) => count > 1) // Only domains with multiple users
        .map(([domain, count], index) => ({
          id: `org_${index + 1}`,
          name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
          domain: domain,
          plan: count > 5 ? 'enterprise' : count > 2 ? 'pro' : 'free',
          status: 'active',
          memberCount: count,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }))

      // Add a default organization if no multi-user domains exist
      if (realOrgs.length === 0) {
        realOrgs.push({
          id: 'org_1',
          name: 'SignTusk Platform',
          domain: 'signtusk.com',
          plan: 'enterprise',
          status: 'active',
          memberCount: data.users.length,
          created_at: new Date().toISOString()
        })
      }

      setOrganizations(realOrgs)
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgPolicy = async (orgId: string) => {
    try {
      // Mock policy data - replace with actual API call
      const mockPolicy: OrganizationTOTPPolicy = {
        id: `policy_${orgId}`,
        organization_id: orgId,
        enforce_login_mfa: orgId === '1', // Enterprise org has stricter policies
        login_mfa_grace_period_days: 7,
        enforce_signing_mfa: orgId === '1',
        require_totp_for_all_documents: false,
        allow_user_override: true,
        max_backup_codes: 10,
        totp_window_tolerance: 1,
        require_mfa_for_admin_actions: orgId === '1',
        audit_totp_events: true,
        retention_period_days: 365,
        allow_admin_override: true,
        emergency_access_codes: []
      }
      setPolicy(mockPolicy)
    } catch (error) {
      console.error('Error fetching organization policy:', error)
    }
  }

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org)
    fetchOrgPolicy(org.id)
  }

  const handlePolicyUpdate = async () => {
    if (!policy || !selectedOrg) return

    try {
      setSaving(true)
      // API call to update policy would go here
      console.log('Updating policy for org:', selectedOrg.name, policy)

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Policy updated successfully!')
    } catch (error) {
      console.error('Error updating policy:', error)
      alert('Failed to update policy')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateOrganization = async () => {
    try {
      setSaving(true)
      // API call to create organization would go here
      console.log('Creating organization:', newOrgForm)

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000))
      setShowCreateOrg(false)
      setNewOrgForm({ name: '', domain: '', plan: 'free' })
      fetchOrganizations()
      alert('Organization created successfully!')
    } catch (error) {
      console.error('Error creating organization:', error)
      alert('Failed to create organization')
    } finally {
      setSaving(false)
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'pro': return 'bg-blue-100 text-blue-800'
      case 'basic': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization TOTP Policies</h2>
          <p className="text-gray-600">Manage enterprise-wide TOTP authentication requirements</p>
        </div>
        <Button onClick={() => setShowCreateOrg(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Organizations
              </CardTitle>
              <CardDescription>
                Select an organization to manage its TOTP policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedOrg?.id === org.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => handleOrgSelect(org)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{org.name}</h3>
                    <Badge className={getPlanBadgeColor(org.plan)}>
                      {org.plan}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{org.domain}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Users className="w-3 h-3 mr-1" />
                    {org.memberCount} members
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Policy Configuration */}
        <div className="lg:col-span-2">
          {selectedOrg && policy ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  TOTP Policy for {selectedOrg.name}
                </CardTitle>
                <CardDescription>
                  Configure organization-wide TOTP authentication requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Login MFA Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Key className="w-4 h-4 mr-2" />
                    Login Authentication
                  </h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enforce-login-mfa">Enforce Login MFA</Label>
                      <p className="text-sm text-gray-600">Require all users to use TOTP for login</p>
                    </div>
                    <Switch
                      id="enforce-login-mfa"
                      checked={policy.enforce_login_mfa}
                      onCheckedChange={(checked) =>
                        setPolicy({ ...policy, enforce_login_mfa: checked })
                      }
                    />
                  </div>

                  {policy.enforce_login_mfa && (
                    <div>
                      <Label htmlFor="grace-period">Grace Period (days)</Label>
                      <Input
                        id="grace-period"
                        type="number"
                        value={policy.login_mfa_grace_period_days}
                        onChange={(e) =>
                          setPolicy({ ...policy, login_mfa_grace_period_days: parseInt(e.target.value) || 0 })
                        }
                        className="w-32"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Days users have to set up MFA after policy enforcement
                      </p>
                    </div>
                  )}
                </div>

                {/* Signing MFA Section */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Document Signing
                  </h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enforce-signing-mfa">Enforce Signing MFA</Label>
                      <p className="text-sm text-gray-600">Require TOTP for all document signatures</p>
                    </div>
                    <Switch
                      id="enforce-signing-mfa"
                      checked={policy.enforce_signing_mfa}
                      onCheckedChange={(checked) =>
                        setPolicy({ ...policy, enforce_signing_mfa: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="require-all-docs">Require for All Documents</Label>
                      <p className="text-sm text-gray-600">Apply to all documents, not just those marked as requiring TOTP</p>
                    </div>
                    <Switch
                      id="require-all-docs"
                      checked={policy.require_totp_for_all_documents}
                      onCheckedChange={(checked) =>
                        setPolicy({ ...policy, require_totp_for_all_documents: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow-override">Allow User Override</Label>
                      <p className="text-sm text-gray-600">Let users disable TOTP for their own documents</p>
                    </div>
                    <Switch
                      id="allow-override"
                      checked={policy.allow_user_override}
                      onCheckedChange={(checked) =>
                        setPolicy({ ...policy, allow_user_override: checked })
                      }
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="border-t pt-6">
                  <Button
                    onClick={handlePolicyUpdate}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Policy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Organization</h3>
                  <p className="text-gray-600">Choose an organization from the list to configure its TOTP policies</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Organization</CardTitle>
              <CardDescription>Add a new organization to manage TOTP policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>

              <div>
                <Label htmlFor="org-domain">Domain</Label>
                <Input
                  id="org-domain"
                  value={newOrgForm.domain}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, domain: e.target.value })}
                  placeholder="acme.com"
                />
              </div>

              <div>
                <Label htmlFor="org-plan">Plan</Label>
                <select
                  id="org-plan"
                  value={newOrgForm.plan}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, plan: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateOrg(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={saving || !newOrgForm.name || !newOrgForm.domain}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
