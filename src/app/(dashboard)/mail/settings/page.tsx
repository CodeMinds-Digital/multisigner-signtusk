'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Key, 
  Shield, 
  Bell, 
  Globe, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface EmailAccount {
  id: string;
  account_name: string;
  plan: string;
  monthly_quota: number;
  emails_sent_this_month: number;
  status: string;
  created_at: string;
}

export default function MailSettingsPage() {
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [accountName, setAccountName] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    fetchEmailAccount();
  }, []);

  const fetchEmailAccount = async () => {
    try {
      const response = await fetch('/api/mail/accounts');
      if (response.ok) {
        const account = await response.json();
        setEmailAccount(account);
        setAccountName(account.account_name);
        setPlan(account.plan);
      }
    } catch (error) {
      console.error('Error fetching email account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/mail/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: accountName,
          plan: plan
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Account settings updated successfully!' });
        fetchEmailAccount();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to update account settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Mail Settings</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!emailAccount) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Mail Settings</h1>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No email account found. Please create an email account first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Mail Settings</h1>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Manage your email account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Enter account name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free (3,000 emails/month)</SelectItem>
                      <SelectItem value="pro">Pro (50,000 emails/month)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (300,000 emails/month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>
                    <Badge variant={emailAccount.status === 'active' ? 'default' : 'secondary'}>
                      {emailAccount.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Usage This Month</Label>
                  <div className="text-sm text-gray-600">
                    {emailAccount.emails_sent_this_month.toLocaleString()} / {emailAccount.monthly_quota.toLocaleString()} emails
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAccount} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys Management
              </CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access to the mail service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Create and manage API keys to integrate with your applications.
                </p>
                <Link href="/mail/settings/api-keys">
                  <Button variant="outline" className="flex items-center gap-2">
                    Manage API Keys
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications about your email activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Delivery Notifications</h4>
                    <p className="text-sm text-gray-600">Get notified when emails are delivered or bounce</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Quota Alerts</h4>
                    <p className="text-sm text-gray-600">Get alerts when approaching your monthly quota</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Usage
              </CardTitle>
              <CardDescription>
                Manage your subscription and view usage statistics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{emailAccount.emails_sent_this_month}</div>
                    <div className="text-sm text-gray-600">Emails Sent</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{emailAccount.monthly_quota}</div>
                    <div className="text-sm text-gray-600">Monthly Quota</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((emailAccount.emails_sent_this_month / emailAccount.monthly_quota) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Usage</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Current Plan: {emailAccount.plan}</h4>
                    <p className="text-sm text-gray-600">Upgrade to send more emails per month</p>
                  </div>
                  <Button variant="outline">Upgrade Plan</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
