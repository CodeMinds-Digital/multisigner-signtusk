'use client'

import { useState } from 'react'
import { Video, Phone, MapPin, Plus, Edit, Trash2, Copy, MoreHorizontal, CalendarDays, FileSignature, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MeetingType {
  id: string
  name: string
  description: string
  duration: number
  type: 'quick-meeting' | 'business-meeting'
  meetingFormat: 'video' | 'phone' | 'in-person' | 'any'
  color: string
  isActive: boolean
  bookingUrl: string
  totalBookings: number
  workflow?: string
  documentsRequired?: boolean
  signatureRequired?: boolean
}

export default function MeetingTypesPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([
    {
      id: '1',
      name: 'Quick Consultation',
      description: 'Brief consultation for general questions',
      duration: 30,
      type: 'quick-meeting',
      meetingFormat: 'video',
      color: 'green',
      isActive: true,
      bookingUrl: 'tuskhub.com/meet/quick-consultation',
      totalBookings: 45
    },
    {
      id: '2',
      name: 'Legal Consultation',
      description: 'Comprehensive legal consultation with document review',
      duration: 60,
      type: 'business-meeting',
      meetingFormat: 'video',
      color: 'purple',
      isActive: true,
      bookingUrl: 'tuskhub.com/meet/legal-consultation',
      totalBookings: 23,
      workflow: 'Legal Consultation',
      documentsRequired: true,
      signatureRequired: true
    },
    {
      id: '3',
      name: 'Sales Demo',
      description: 'Product demonstration and sales discussion',
      duration: 45,
      type: 'business-meeting',
      meetingFormat: 'video',
      color: 'blue',
      isActive: true,
      bookingUrl: 'tuskhub.com/meet/sales-demo',
      totalBookings: 67,
      workflow: 'Sales Meeting',
      documentsRequired: true,
      signatureRequired: false
    },
    {
      id: '4',
      name: 'Coffee Chat',
      description: 'Informal networking conversation',
      duration: 30,
      type: 'quick-meeting',
      meetingFormat: 'any',
      color: 'orange',
      isActive: false,
      bookingUrl: 'tuskhub.com/meet/coffee-chat',
      totalBookings: 12
    }
  ])

  const getMeetingTypeIcon = (type: string) => {
    return type === 'quick-meeting' ? CalendarDays : FileSignature
  }

  const getMeetingFormatIcon = (format: string) => {
    switch (format) {
      case 'video': return Video
      case 'phone': return Phone
      case 'in-person': return MapPin
      default: return Users
    }
  }

  const getColorClasses = (color: string, isActive: boolean) => {
    const opacity = isActive ? '' : 'opacity-50'
    switch (color) {
      case 'green': return `bg-green-100 text-green-800 ${opacity}`
      case 'purple': return `bg-purple-100 text-purple-800 ${opacity}`
      case 'blue': return `bg-blue-100 text-blue-800 ${opacity}`
      case 'orange': return `bg-orange-100 text-orange-800 ${opacity}`
      default: return `bg-gray-100 text-gray-800 ${opacity}`
    }
  }

  const toggleMeetingType = (id: string) => {
    setMeetingTypes(prev => 
      prev.map(mt => 
        mt.id === id ? { ...mt, isActive: !mt.isActive } : mt
      )
    )
  }

  const duplicateMeetingType = (id: string) => {
    const original = meetingTypes.find(mt => mt.id === id)
    if (original) {
      const duplicate = {
        ...original,
        id: Date.now().toString(),
        name: `${original.name} (Copy)`,
        bookingUrl: `${original.bookingUrl}-copy`,
        totalBookings: 0,
        isActive: false
      }
      setMeetingTypes(prev => [...prev, duplicate])
    }
  }

  const deleteMeetingType = (id: string) => {
    setMeetingTypes(prev => prev.filter(mt => mt.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Types</h1>
          <p className="text-gray-600 mt-1">Create and manage your meeting configurations</p>
        </div>
        
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Meeting Type
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{meetingTypes.length}</div>
              <div className="text-sm text-gray-600">Total Types</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {meetingTypes.filter(mt => mt.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {meetingTypes.filter(mt => mt.type === 'business-meeting').length}
              </div>
              <div className="text-sm text-gray-600">Business Types</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {meetingTypes.reduce((sum, mt) => sum + mt.totalBookings, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Bookings</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Types List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {meetingTypes.map((meetingType) => {
          const TypeIcon = getMeetingTypeIcon(meetingType.type)
          const FormatIcon = getMeetingFormatIcon(meetingType.meetingFormat)
          
          return (
            <Card key={meetingType.id} className={`hover:shadow-md transition-shadow ${!meetingType.isActive ? 'opacity-75' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      meetingType.type === 'quick-meeting' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{meetingType.name}</CardTitle>
                      <CardDescription className="mt-1">{meetingType.description}</CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMeetingType(meetingType.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleMeetingType(meetingType.id)}>
                        {meetingType.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteMeetingType(meetingType.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Meeting Details */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{meetingType.duration} min</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <FormatIcon className="w-4 h-4" />
                    <span className="capitalize">
                      {meetingType.meetingFormat === 'any' ? 'Any format' : meetingType.meetingFormat}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{meetingType.totalBookings} bookings</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getColorClasses(meetingType.color, meetingType.isActive)}>
                    {meetingType.type === 'quick-meeting' ? 'Quick Meeting' : 'Business Meeting'}
                  </Badge>
                  
                  {!meetingType.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  
                  {meetingType.workflow && (
                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                      {meetingType.workflow}
                    </Badge>
                  )}
                  
                  {meetingType.documentsRequired && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      Documents
                    </Badge>
                  )}
                  
                  {meetingType.signatureRequired && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      Signatures
                    </Badge>
                  )}
                </div>

                {/* Booking URL */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Booking URL</div>
                  <div className="text-sm font-mono text-gray-900 break-all">
                    {meetingType.bookingUrl}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create New Meeting Type CTA */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create New Meeting Type</h3>
            <p className="text-gray-600 mb-4">
              Set up a new meeting configuration with custom settings
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Meeting Type
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
