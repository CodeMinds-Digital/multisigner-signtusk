'use client'

import { useState } from 'react'
import { Activity, Bell, PieChart, Calendar, Settings, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const settingsCategories = [
  {
    title: 'Calendar Integration',
    description: 'Connect with Google Calendar, Outlook, and other calendar services',
    icon: Activity,
    href: '/schedule/settings/integrations',
    color: 'bg-blue-100 text-blue-600',
    available: true
  },
  {
    title: 'Notifications',
    description: 'Configure email notifications and reminder preferences',
    icon: Bell,
    href: '/schedule/settings/notifications',
    color: 'bg-green-100 text-green-600',
    available: true
  },
  {
    title: 'Branding',
    description: 'Customize your meeting booking pages and email templates',
    icon: PieChart,
    href: '/schedule/settings/branding',
    color: 'bg-purple-100 text-purple-600',
    available: true
  }
]

export default function ScheduleSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your meeting scheduling preferences and configurations
          </p>
        </div>

        {/* Settings Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category) => {
            const IconComponent = category.icon
            
            return (
              <Card 
                key={category.title}
                className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                  category.available 
                    ? 'hover:scale-105 cursor-pointer border-l-blue-500' 
                    : 'opacity-60 border-l-gray-300'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${category.color}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    {category.available && (
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {category.available ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={category.href}>
                        Configure
                      </Link>
                    </Button>
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
              <Button variant="outline" asChild>
                <Link href="/schedule/availability">
                  <Calendar className="w-4 h-4 mr-2" />
                  Set Availability
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/schedule/meeting-types">
                  <Calendar className="w-4 h-4 mr-2" />
                  Manage Meeting Types
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
