'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard, Calendar, Download, AlertTriangle, CheckCircle,
  TrendingUp, FileText, PenTool, Database, Zap
} from 'lucide-react'

interface UserSubscription {
  plan_name: string
  plan_price: number
  billing_cycle: 'monthly' | 'yearly'
  status: 'active' | 'cancelled' | 'past_due'
  current_period_start: string
  current_period_end: string
  usage: {
    documents_used: number
    documents_limit: number
    signatures_used: number
    signatures_limit: number
    storage_used_gb: number
    storage_limit_gb: number
    api_calls_used: number
    api_calls_limit: number
  }
}

interface BillingHistory {
  id: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  date: string
  invoice_url?: string
  description: string
}

export default function BillingPage() {
  const { } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockSubscription: UserSubscription = {
        plan_name: 'Professional',
        plan_price: 15,
        billing_cycle: 'monthly',
        status: 'active',
        current_period_start: '2024-01-01',
        current_period_end: '2024-02-01',
        usage: {
          documents_used: 23,
          documents_limit: -1, // unlimited
          signatures_used: 156,
          signatures_limit: -1,
          storage_used_gb: 12.5,
          storage_limit_gb: 50,
          api_calls_used: 2340,
          api_calls_limit: 10000
        }
      }

      const mockBillingHistory: BillingHistory[] = [
        {
          id: '1',
          amount: 15,
          status: 'paid',
          date: '2024-01-01',
          invoice_url: '#',
          description: 'Professional Plan - January 2024'
        },
        {
          id: '2',
          amount: 15,
          status: 'paid',
          date: '2023-12-01',
          invoice_url: '#',
          description: 'Professional Plan - December 2023'
        },
        {
          id: '3',
          amount: 15,
          status: 'paid',
          date: '2023-11-01',
          invoice_url: '#',
          description: 'Professional Plan - November 2023'
        }
      ]

      setSubscription(mockSubscription)
      setBillingHistory(mockBillingHistory)
    } catch (error) {
      console.error('Failed to load billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const formatUsage = (used: number, limit: number) => {
    if (limit === -1) return `${used.toLocaleString()} / Unlimited`
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading billing information...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>
        <Button variant="outline">
          <CreditCard className="w-4 h-4 mr-2" />
          Update Payment Method
        </Button>
      </div>

      {/* Current Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Current Plan: {subscription.plan_name}
                </CardTitle>
                <CardDescription>
                  {formatCurrency(subscription.plan_price)} per {subscription.billing_cycle === 'yearly' ? 'year' : 'month'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(subscription.status)}
                <Button size="sm">Manage Plan</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Current period: {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Track your usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Documents</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatUsage(subscription.usage.documents_used, subscription.usage.documents_limit)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription.usage.documents_used, subscription.usage.documents_limit)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Signatures</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatUsage(subscription.usage.signatures_used, subscription.usage.signatures_limit)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription.usage.signatures_used, subscription.usage.signatures_limit)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Storage</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {subscription.usage.storage_used_gb.toFixed(1)} GB / {subscription.usage.storage_limit_gb} GB
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription.usage.storage_used_gb, subscription.usage.storage_limit_gb)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">API Calls</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatUsage(subscription.usage.api_calls_used, subscription.usage.api_calls_limit)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription.usage.api_calls_used, subscription.usage.api_calls_limit)}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingHistory.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{invoice.description}</div>
                    <div className="text-sm text-gray-500">{formatDate(invoice.date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</div>
                    <div className="flex items-center gap-1">
                      {invoice.status === 'paid' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm text-gray-500 capitalize">{invoice.status}</span>
                    </div>
                  </div>
                  {invoice.invoice_url && (
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
