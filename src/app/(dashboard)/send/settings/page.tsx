'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Settings,
  Bell,
  Shield,
  Globe,
  Users,
  Palette,
  Zap,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

const settingsCategories = [
  {
    title: 'Notifications',
    description: 'Configure email and real-time notification preferences',
    icon: Bell,
    href: '/send/settings/notifications',
    color: 'bg-blue-100 text-blue-600',
    available: true
  },
  {
    title: 'Security',
    description: 'Manage security settings, access controls, and authentication',
    icon: Shield,
    href: '/send/settings/security',
    color: 'bg-red-100 text-red-600',
    available: true
  },
  {
    title: 'Custom Domains',
    description: 'Set up custom domains for your shared links',
    icon: Globe,
    href: '/send/settings/domains',
    color: 'bg-green-100 text-green-600',
    available: true
  },
  {
    title: 'Team Settings',
    description: 'Manage team members and collaboration settings',
    icon: Users,
    href: '/send/settings/team',
    color: 'bg-purple-100 text-purple-600',
    available: false // Will be implemented
  },
  {
    title: 'Branding',
    description: 'Customize your brand appearance and logos',
    icon: Palette,
    href: '/send/settings/branding',
    color: 'bg-pink-100 text-pink-600',
    available: true
  },
  {
    title: 'Integrations',
    description: 'Connect with external services and APIs',
    icon: Zap,
    href: '/send/settings/integrations',
    color: 'bg-yellow-100 text-yellow-600',
    available: true
  }
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Settings' }
          ]}
        />

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your Send module preferences and configurations
          </p>
        </div>

        {/* Settings Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon

            return (
              <Card
                key={category.title}
                className={`hover:shadow-md transition-shadow ${!category.available ? 'opacity-60' : 'hover:border-gray-300'
                  }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    {category.available ? (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-gray-600 mb-4">
                    {category.description}
                  </CardDescription>

                  {category.available ? (
                    <Link href={category.href}>
                      <Button variant="outline" className="w-full">
                        Configure
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common settings and configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Available Now</h4>
                <div className="space-y-2">
                  <Link href="/send/settings/notifications">
                    <Button variant="ghost" className="w-full justify-start">
                      <Bell className="w-4 h-4 mr-2" />
                      Notification Settings
                    </Button>
                  </Link>
                  <Link href="/send/settings/security">
                    <Button variant="ghost" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Security Settings
                    </Button>
                  </Link>
                  <Link href="/send/settings/domains">
                    <Button variant="ghost" className="w-full justify-start">
                      <Globe className="w-4 h-4 mr-2" />
                      Custom Domains
                    </Button>
                  </Link>
                  <Link href="/send/settings/branding">
                    <Button variant="ghost" className="w-full justify-start">
                      <Palette className="w-4 h-4 mr-2" />
                      Customize Branding
                    </Button>
                  </Link>
                  <Link href="/send/settings/integrations">
                    <Button variant="ghost" className="w-full justify-start">
                      <Zap className="w-4 h-4 mr-2" />
                      Manage Integrations
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Coming Soon</h4>
                <div className="space-y-2 opacity-60">
                  <Button variant="ghost" className="w-full justify-start" disabled>
                    <Users className="w-4 h-4 mr-2" />
                    Team Settings
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
