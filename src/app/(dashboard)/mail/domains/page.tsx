'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/providers/secure-auth-provider';

interface Domain {
  id: string;
  domain: string;
  verification_status: string;
  verification_method: string;
  automation_enabled: boolean;
  automation_provider: string | null;
  txt_verification_status: boolean;
  dkim_status: boolean;
  spf_status: boolean;
  dmarc_status: boolean;
  created_at: string;
  last_verification_attempt: string | null;
}

export default function DomainsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchDomains();
    }
  }, [user]);

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/mail/domains');
      const data = await response.json();

      if (response.ok) {
        setDomains(data.domains || []);
      } else {
        setError(data.error || 'Failed to fetch domains');
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
      setError('Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/mail/domains/${domainId}/verify`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchDomains(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to verify domain');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setError('Failed to verify domain');
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }

    try {
      const response = await fetch(`/api/mail/domains/${domainId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDomains(prev => prev.filter(d => d.id !== domainId));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete domain');
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
      setError('Failed to delete domain');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'subdomain':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Subdomain</Badge>;
      case 'cloudflare':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Cloudflare</Badge>;
      case 'route53':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Route53</Badge>;
      case 'manual':
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredDomains = domains.filter(domain =>
    domain.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Email Domains</h1>
          <p className="text-gray-600">Manage domains for sending emails</p>
        </div>
        <Button onClick={() => router.push('/mail/domains/add')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Domains List */}
      {filteredDomains.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No domains found' : 'No domains yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Add your first domain to start sending emails'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => router.push('/mail/domains/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDomains.map((domain) => (
            <Card key={domain.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{domain.domain}</h3>
                      {getStatusBadge(domain.verification_status)}
                      {getMethodBadge(domain.verification_method)}
                      {domain.automation_enabled && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          Automated
                        </Badge>
                      )}
                    </div>

                    {/* DNS Status */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        {domain.txt_verification_status ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={domain.txt_verification_status ? 'text-green-600' : 'text-gray-500'}>
                          TXT
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {domain.dkim_status ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={domain.dkim_status ? 'text-green-600' : 'text-gray-500'}>
                          DKIM
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {domain.spf_status ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={domain.spf_status ? 'text-green-600' : 'text-gray-500'}>
                          SPF
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {domain.dmarc_status ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={domain.dmarc_status ? 'text-green-600' : 'text-gray-500'}>
                          DMARC
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mt-2">
                      Added {new Date(domain.created_at).toLocaleDateString()}
                      {domain.last_verification_attempt && (
                        <> • Last verified {new Date(domain.last_verification_attempt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {domain.verification_status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyDomain(domain.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/mail/domains/${domain.id}/setup`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDomain(domain.id)}
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
    </div>
  );
}
