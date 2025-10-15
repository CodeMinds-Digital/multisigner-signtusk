'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Key,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/components/providers/secure-auth-provider';

interface APIKey {
  id: string;
  key_name: string;
  key_prefix: string;
  permissions: Record<string, boolean>;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

export default function APIKeysPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    permissions: {
      send: true,
      templates: true,
      domains: false,
      analytics: false
    },
    expiresAt: ''
  });

  useEffect(() => {
    if (user) {
      fetchAPIKeys();
    }
  }, [user]);

  const fetchAPIKeys = async () => {
    try {
      // First get email account
      const accountResponse = await fetch('/api/mail/accounts');
      const accountData = await accountResponse.json();

      if (!accountData.account) {
        setError('No email account found');
        setLoading(false);
        return;
      }

      // Then fetch API keys (this would need to be implemented)
      // For now, we'll show mock data
      setApiKeys([
        {
          id: '1',
          key_name: 'Production API Key',
          key_prefix: 'sk_live_',
          permissions: { send: true, templates: true, domains: false, analytics: false },
          last_used_at: new Date().toISOString(),
          expires_at: null,
          created_at: new Date().toISOString(),
          is_active: true
        }
      ]);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAPIKey = async () => {
    try {
      setError('');
      setSuccess('');

      if (!createForm.name.trim()) {
        setError('Please enter a name for the API key');
        return;
      }

      // Get email account first
      const accountResponse = await fetch('/api/mail/accounts');
      const accountData = await accountResponse.json();

      if (!accountData.account) {
        setError('No email account found');
        return;
      }

      // Create API key (this would call the API key service)
      const mockApiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      setNewApiKey(mockApiKey);
      setSuccess('API key created successfully! Make sure to copy it now - you won\'t be able to see it again.');

      // Reset form
      setCreateForm({
        name: '',
        permissions: {
          send: true,
          templates: true,
          domains: false,
          analytics: false
        },
        expiresAt: ''
      });

      // Refresh list
      fetchAPIKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      setError('Failed to create API key');
    }
  };

  const handleDeleteAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete API key (mock implementation)
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      setSuccess('API key deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-600">Manage API keys for programmatic access</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={createForm.permissions.send}
                      onCheckedChange={(checked) =>
                        setCreateForm(prev => ({
                          ...prev,
                          permissions: { ...prev.permissions, send: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="send" className="text-sm">Send emails</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={createForm.permissions.templates}
                      onCheckedChange={(checked) =>
                        setCreateForm(prev => ({
                          ...prev,
                          permissions: { ...prev.permissions, templates: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="templates" className="text-sm">Manage templates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={createForm.permissions.domains}
                      onCheckedChange={(checked) =>
                        setCreateForm(prev => ({
                          ...prev,
                          permissions: { ...prev.permissions, domains: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="domains" className="text-sm">Manage domains</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={createForm.permissions.analytics}
                      onCheckedChange={(checked) =>
                        setCreateForm(prev => ({
                          ...prev,
                          permissions: { ...prev.permissions, analytics: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="analytics" className="text-sm">View analytics</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires (Optional)</Label>
                <Input
                  id="expires"
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAPIKey}>
                  Create API Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* New API Key Display */}
      {newApiKey && (
        <Alert className="border-blue-200 bg-blue-50">
          <Key className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p className="font-medium">Your new API key:</p>
              <div className="flex items-center space-x-2 bg-white p-2 rounded border">
                <code className="flex-1 text-sm font-mono">{newApiKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newApiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm">Make sure to copy this key now. You won't be able to see it again!</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No API keys yet</h3>
            <p className="text-gray-600 mb-4">Create your first API key to start using the API</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{apiKey.key_name}</h3>
                      <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                        {apiKey.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {apiKey.expires_at && (
                        <Badge variant="outline">
                          Expires {new Date(apiKey.expires_at).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span><strong>Key:</strong> {apiKey.key_prefix}••••••••••••••••</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.key_prefix + '••••••••••••••••')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span><strong>Created:</strong> {new Date(apiKey.created_at).toLocaleDateString()}</span>
                        {apiKey.last_used_at && (
                          <span><strong>Last used:</strong> {new Date(apiKey.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div>
                        <strong>Permissions:</strong>{' '}
                        {Object.entries(apiKey.permissions)
                          .filter(([, enabled]) => enabled)
                          .map(([permission]) => permission)
                          .join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAPIKey(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Authentication</h4>
            <p className="text-sm text-gray-600 mb-2">
              Include your API key in the Authorization header:
            </p>
            <code className="block bg-gray-100 p-2 rounded text-sm">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Send Email Endpoint</h4>
            <code className="block bg-gray-100 p-2 rounded text-sm">
              POST /api/mail/send
            </code>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Example Request</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {`curl -X POST https://yourdomain.com/api/mail/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from_email": "noreply@yourdomain.com",
    "to_emails": ["user@example.com"],
    "subject": "Hello from API",
    "html_content": "<h1>Hello!</h1><p>This email was sent via API.</p>"
  }'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
