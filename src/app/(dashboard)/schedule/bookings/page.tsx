'use client'

import { useState } from 'react'
import { Calendar, CalendarDays, FileSignature, Clock, Users, Filter, Search, MoreHorizontal, Video, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Booking {
  id: string
  type: 'quick-meeting' | 'business-meeting'
  guest: {
    name: string
    email: string
    company?: string
  }
  date: string
  time: string
  duration: number
  meetingType: 'video' | 'phone' | 'in-person'
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  workflow?: string
  documentsShared?: number
  signaturesPending?: number
}

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Mock bookings data
  const bookings: Booking[] = [
    {
      id: '1',
      type: 'business-meeting',
      guest: {
        name: 'Sarah Johnson',
        email: 'sarah@company.com',
        company: 'Tech Corp'
      },
      date: '2025-01-15',
      time: '10:00 AM',
      duration: 60,
      meetingType: 'video',
      status: 'confirmed',
      workflow: 'Sales Meeting',
      documentsShared: 3,
      signaturesPending: 1
    },
    {
      id: '2',
      type: 'quick-meeting',
      guest: {
        name: 'John Smith',
        email: 'john@example.com'
      },
      date: '2025-01-16',
      time: '2:00 PM',
      duration: 30,
      meetingType: 'phone',
      status: 'pending'
    },
    {
      id: '3',
      type: 'business-meeting',
      guest: {
        name: 'Mike Wilson',
        email: 'mike@startup.io',
        company: 'StartupXYZ'
      },
      date: '2025-01-14',
      time: '3:30 PM',
      duration: 90,
      meetingType: 'in-person',
      status: 'completed',
      workflow: 'Legal Consultation',
      documentsShared: 5,
      signaturesPending: 0
    },
    {
      id: '4',
      type: 'quick-meeting',
      guest: {
        name: 'Emma Davis',
        email: 'emma@freelance.com'
      },
      date: '2025-01-17',
      time: '11:00 AM',
      duration: 45,
      meetingType: 'video',
      status: 'confirmed'
    }
  ]

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (booking.guest.company && booking.guest.company.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    const matchesType = typeFilter === 'all' || booking.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'in-person': return <MapPin className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-1">Manage all your scheduled meetings</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <a href="/schedule/quick-meeting">
              <CalendarDays className="w-4 h-4 mr-2" />
              Quick Meeting
            </a>
          </Button>
          <Button asChild>
            <a href="/schedule/business-meeting">
              <FileSignature className="w-4 h-4 mr-2" />
              Business Meeting
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="quick-meeting">Quick Meeting</SelectItem>
                <SelectItem value="business-meeting">Business Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'You don\'t have any bookings yet'}
                </p>
                <Button asChild>
                  <a href="/schedule">Schedule a Meeting</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Meeting Type Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      booking.type === 'quick-meeting' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {booking.type === 'quick-meeting' ? (
                        <CalendarDays className="w-6 h-6" />
                      ) : (
                        <FileSignature className="w-6 h-6" />
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{booking.guest.name}</h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>{booking.guest.email}</span>
                          {booking.guest.company && (
                            <span className="text-gray-500">• {booking.guest.company}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(booking.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{booking.time} ({booking.duration}min)</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {getMeetingTypeIcon(booking.meetingType)}
                            <span className="capitalize">{booking.meetingType}</span>
                          </div>
                        </div>

                        {booking.workflow && (
                          <div className="flex items-center gap-4">
                            <span className="text-purple-600 font-medium">{booking.workflow}</span>
                            {booking.documentsShared && (
                              <span className="text-gray-500">
                                {booking.documentsShared} docs shared
                              </span>
                            )}
                            {booking.signaturesPending && booking.signaturesPending > 0 && (
                              <span className="text-orange-600">
                                {booking.signaturesPending} signatures pending
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Reschedule</DropdownMenuItem>
                      <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                      {booking.type === 'business-meeting' && (
                        <>
                          <DropdownMenuItem>View Documents</DropdownMenuItem>
                          <DropdownMenuItem>Send Signature Request</DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem className="text-red-600">Cancel</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {bookings.filter(b => b.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {bookings.filter(b => b.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {bookings.filter(b => b.type === 'business-meeting').length}
              </div>
              <div className="text-sm text-gray-600">Business Meetings</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
