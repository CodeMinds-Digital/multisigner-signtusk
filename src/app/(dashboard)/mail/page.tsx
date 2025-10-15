'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Send,
  Globe,
  FileText,
  CheckCircle,
  Plus,
  TrendingUp,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/secure-auth-provider';

interface EmailAccount {
  id: string;
  account_name: string;
  plan: string;
  monthly_quota: number;
  emails_sent_this_month: number;
  verified_domains_count: number;
  delivery_rate: number;
  recent_messages_count: number;
  status: string;
}

interface RecentMessage {
  id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  status: string;
  created_at: string;
}

export default function MailDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEmailAccount();
    }
  }, [user]);

  const fetchEmailAccount = async () => {
    try {
      const response = await fetch('/api/mail/accounts');

      if (response.status === 404) {
        // No email account exists, show create account flow
        setShowCreateAccount(true);
        setEmailAccount(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch email account');
      }

      const account = await response.json();
      setEmailAccount(account);
      setShowCreateAccount(false);

      // Fetch recent messages if account exists
      if (account.id) {
        await fetchRecentMessages(account.id);
      }
    } catch (error) {
      console.error('Error fetching email account:', error);
      setShowCreateAccount(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMessages = async (accountId: string) => {
    try {
      const response = await fetch(`/api/mail/messages?account_id=${accountId}&limit=5`);
      if (response.ok) {
        const messages = await response.json();
        setRecentMessages(messages);
      }
    } catch (error) {
      console.error('Error fetching recent messages:', error);
    }
  };

  const createEmailAccount = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/mail/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: `${user?.email}'s Email Account`,
          plan: 'free'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create email account');
      }

      const account = await response.json();

      // Show success message with API key if provided
      if (account.api_key) {
        alert(`Email account created successfully!\n\nYour API key (save this, it won't be shown again):\n${account.api_key}`);
      }

      // Refresh the account data
      await fetchEmailAccount();
    } catch (error) {
      console.error('Error creating email account:', error);
      alert(error instanceof Error ? error.message : 'Failed to create email account');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showCreateAccount) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to MAIL</CardTitle>
            <p className="text-gray-600">
              Get started with transactional email sending. Create your email account to begin.
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={createEmailAccount} size="lg" className="w-full">
              Create Email Account
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Free plan includes 3,000 emails per month
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!emailAccount) {
    return (
      <div className="text-center mt-20">
        <p>Error loading email account. Please try again.</p>
      </div>
    );
  }

  const quotaPercentage = (emailAccount.emails_sent_this_month / emailAccount.monthly_quota) * 100;
  const quotaColor = quotaPercentage > 90 ? 'text-red-600' : quotaPercentage > 70 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">MAIL Dashboard</h1>
          <p className="text-gray-600">Manage your transactional email sending</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => router.push('/mail/send')} className="flex items-center space-x-2">
            <Send className="h-4 w-4" />
            <span>Send Email</span>
          </Button>
          <Button variant="outline" onClick={() => router.push('/mail/domains/add')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Domain
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-2xl font-bold">{emailAccount.emails_sent_this_month.toLocaleString()}</p>
                <p className={`text-xs ${quotaColor}`}>
                  of {emailAccount.monthly_quota.toLocaleString()} this month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                <p className="text-2xl font-bold">{emailAccount.delivery_rate}%</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Domains</p>
                <p className="text-2xl font-bold">{emailAccount.verified_domains_count}</p>
                <p className="text-xs text-gray-500">Ready to send</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Plan</p>
                <p className="text-2xl font-bold capitalize">{emailAccount.plan}</p>
                <p className="text-xs text-gray-500">Current plan</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/mail/send')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Send Email</h3>
                <p className="text-sm text-gray-600">Send a single email or use a template</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/mail/domains')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Domains</h3>
                <p className="text-sm text-gray-600">Add and verify sending domains</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/mail/templates')}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Email Templates</h3>
                <p className="text-sm text-gray-600">Create and manage email templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Email Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentMessages.length > 0 ? (
            <div className="space-y-4">
              {recentMessages.map((message) => (
                <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{message.subject}</p>
                      <Badge variant={
                        message.status === 'delivered' ? 'default' :
                          message.status === 'sent' ? 'secondary' :
                            message.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {message.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      From: {message.from_email} → To: {message.to_emails.join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/mail/messages/${message.id}`)}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No emails sent yet</p>
              <p className="text-sm text-gray-500">Send your first email to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quota Warning */}
      {quotaPercentage > 80 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Quota Warning</p>
                <p className="text-sm text-yellow-700">
                  You've used {quotaPercentage.toFixed(1)}% of your monthly email quota.
                  {quotaPercentage > 90 && ' Consider upgrading your plan.'}
                </p>
              </div>
              {quotaPercentage > 90 && (
                <Button size="sm" onClick={() => router.push('/mail/settings/billing')}>
                  Upgrade Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
