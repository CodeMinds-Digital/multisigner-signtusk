'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  Mail,
  CheckCircle,
  MousePointer,
  AlertTriangle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/components/providers/secure-auth-provider';

interface AnalyticsSummary {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

interface TopDomain {
  domain: string;
  count: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyStats: DailyStats[];
  topDomains: TopDomain[];
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mail/analytics?days=${period}`);
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      } else {
        setError(data.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics');
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

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Analytics</h1>
          <p className="text-gray-600">Track your email performance and engagement</p>
        </div>
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Analytics</h1>
          <p className="text-gray-600">Track your email performance and engagement</p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-600">Send some emails to see analytics here</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, dailyStats, topDomains } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Analytics</h1>
          <p className="text-gray-600">Track your email performance and engagement</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold">{summary.totalSent.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{summary.deliveryRate}%</p>
                <p className="text-xs text-gray-500">{summary.delivered.toLocaleString()} delivered</p>
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
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold">{summary.openRate}%</p>
                <p className="text-xs text-gray-500">{summary.opened.toLocaleString()} opened</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold">{summary.clickRate}%</p>
                <p className="text-xs text-gray-500">{summary.clicked.toLocaleString()} clicked</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MousePointer className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bounce & Complaint Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Bounce Rate</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{summary.bounceRate}%</p>
                <p className="text-sm text-gray-500">{summary.bounced} bounced</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Complaint Rate</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{summary.complaintRate}%</p>
                <p className="text-sm text-gray-500">{summary.complained} complaints</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Recipient Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {topDomains.length > 0 ? (
              <div className="space-y-3">
                {topDomains.slice(0, 5).map((domain, index) => (
                  <div key={domain.domain} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="font-medium">{domain.domain}</span>
                    </div>
                    <span className="text-sm text-gray-600">{domain.count} emails</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Stats Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Email Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 font-medium">
                <div>Date</div>
                <div>Sent</div>
                <div>Delivered</div>
                <div>Opened</div>
                <div>Clicked</div>
                <div>Bounced</div>
                <div>Delivery %</div>
              </div>
              {dailyStats.slice(-7).map((day) => (
                <div key={day.date} className="grid grid-cols-7 gap-2 text-sm">
                  <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                  <div>{day.sent}</div>
                  <div>{day.delivered}</div>
                  <div>{day.opened}</div>
                  <div>{day.clicked}</div>
                  <div>{day.bounced}</div>
                  <div>{day.sent > 0 ? Math.round((day.delivered / day.sent) * 100) : 0}%</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No daily data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
