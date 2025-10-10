'use client'

import { useState } from 'react'
import { Calendar, CalendarDays, FileSignature, Clock, Users, TrendingUp, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MeetingAppointmentDropdown } from '@/components/ui/meeting-appointment-dropdown'
import Link from 'next/link'

export default function ScheduleDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d')

  // Mock data - replace with real data from your backend
  const stats = {
    totalBookings: 24,
    upcomingMeetings: 8,
    completedMeetings: 16,
    conversionRate: 85
  }

  const recentBookings = [
    {
      id: 1,
      type: 'Quick Meeting',
      guest: 'John Smith',
      email: 'john@example.com',
      date: '2025-01-12',
      time: '2:00 PM',
      status: 'confirmed'
    },
    {
      id: 2,
      type: 'Business Meeting',
      guest: 'Sarah Johnson',
      email: 'sarah@company.com',
      date: '2025-01-13',
      time: '10:00 AM',
      status: 'pending'
    },
    {
      id: 3,
      type: 'Business Meeting',
      guest: 'Mike Wilson',
      email: 'mike@startup.io',
      date: '2025-01-14',
      time: '3:30 PM',
      status: 'confirmed'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your meetings and appointments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <MeetingAppointmentDropdown />
          <Button asChild>
            <Link href="/schedule/availability">
              <Calendar className="w-4 h-4 mr-2" />
              Set Availability
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/schedule/quick-meeting">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quick Meeting</CardTitle>
                  <CardDescription>Simple scheduling for casual meetings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Perfect for consultations</span>
                <span className="text-sm font-medium text-green-600">Free - $25/month</span>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200">
          <Link href="/schedule/business-meeting">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileSignature className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Business Meeting</CardTitle>
                  <CardDescription>Advanced scheduling with document workflows</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Includes document signing</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                    Recommended
                  </span>
                  <span className="text-sm font-medium text-purple-600">$50 - $150/month</span>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedMeetings}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              +5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest meeting appointments</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/schedule/bookings">
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    booking.type === 'Quick Meeting' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {booking.type === 'Quick Meeting' ? (
                      <CalendarDays className="w-5 h-5" />
                    ) : (
                      <FileSignature className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{booking.guest}</div>
                    <div className="text-sm text-gray-600">{booking.email}</div>
                    <div className="text-xs text-gray-500">{booking.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{booking.date}</div>
                  <div className="text-sm text-gray-600">{booking.time}</div>
                  <div className={`text-xs font-medium ${
                    booking.status === 'confirmed' 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }`}>
                    {booking.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Availability
            </CardTitle>
            <CardDescription>Set your working hours and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/schedule/availability">Configure</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Analytics
            </CardTitle>
            <CardDescription>View booking insights and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/analytics">View Reports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Meeting Types
            </CardTitle>
            <CardDescription>Customize your meeting configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/schedule/meeting-types">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
