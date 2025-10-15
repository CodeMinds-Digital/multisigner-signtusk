'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Globe, Cloud, Zap } from 'lucide-react';

type AutomationMethod = 'subdomain' | 'cloudflare' | 'route53' | 'manual';

interface DomainSetupWizardProps {
  onComplete?: () => void;
}

export function DomainSetupWizard({ onComplete }: DomainSetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [automationMethod, setAutomationMethod] = useState<AutomationMethod>('subdomain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  };

  const handleDomainSubmit = () => {
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    if (!validateDomain(domain)) {
      setError('Please enter a valid domain name (e.g., example.com)');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleSetupSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/mail/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.toLowerCase(),
          verification_method: automationMethod
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create domain');
      }

      const data = await response.json();

      // Redirect to domain setup page
      router.push(`/mail/domains/${data.domain.id}/setup`);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error creating domain:', error);
      setError(error instanceof Error ? error.message : 'Failed to create domain');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Add Email Domain</CardTitle>
          <p className="text-center text-gray-600">
            Enter the domain you want to use for sending emails
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            <Input
              id="domain"
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="text-lg"
            />
            <p className="text-sm text-gray-500">
              Enter your domain without "www" or "http://"
            </p>
          </div>

          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleDomainSubmit}>
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Choose Setup Method</CardTitle>
          <p className="text-center text-gray-600">
            Select how you'd like to set up email for <strong>{domain}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {/* Subdomain Option (Recommended) */}
            <div
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${automationMethod === 'subdomain'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setAutomationMethod('subdomain')}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-green-600">✨ Subdomain (Recommended)</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Easiest
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Use <code className="bg-gray-100 px-2 py-1 rounded">mail.{domain}</code> for sending emails.
                      Only requires adding 1 DNS record.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Automatic setup
                      </span>
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        2-5 minutes
                      </span>
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        99% success rate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloudflare Option */}
            <div
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${automationMethod === 'cloudflare'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setAutomationMethod('cloudflare')}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Cloud className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-blue-600">☁️ Cloudflare Integration</h3>
                      <Badge variant="outline">Advanced</Badge>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Automatic DNS record creation via Cloudflare API.
                      Use your main domain for sending.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center text-blue-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Requires API token
                      </span>
                      <span className="flex items-center text-blue-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        5-10 minutes
                      </span>
                      <span className="flex items-center text-blue-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        95% success rate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route53 Option */}
            <div
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${automationMethod === 'route53'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setAutomationMethod('route53')}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Globe className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-orange-600">🚀 AWS Route53</h3>
                      <Badge variant="outline">AWS Users</Badge>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Automatic setup for AWS-hosted domains.
                      Requires AWS credentials.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center text-orange-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        AWS credentials required
                      </span>
                      <span className="flex items-center text-orange-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        5-10 minutes
                      </span>
                      <span className="flex items-center text-orange-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        90% success rate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Option */}
            <div
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${automationMethod === 'manual'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => setAutomationMethod('manual')}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Globe className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-600">📝 Manual Setup</h3>
                      <Badge variant="outline">Traditional</Badge>
                    </div>
                    <p className="text-gray-600 mb-3">
                      Add DNS records manually to your domain registrar.
                      Works with any DNS provider.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Manual work required
                      </span>
                      <span className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        15-30 minutes
                      </span>
                      <span className="flex items-center text-gray-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Variable success
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleSetupSubmit} disabled={loading}>
              {loading ? 'Creating Domain...' : 'Continue Setup'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
