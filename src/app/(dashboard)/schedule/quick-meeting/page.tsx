'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Clock, Video, Phone, MapPin, Mail, User, MessageSquare, ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookingCalendar } from '@/components/meetings/booking-calendar'
import { MeetingTypeConfig } from '@/types/meetings'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function QuickMeetingPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeConfig[]>([])
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingTypeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchMeetingTypes()
  }, [])



  const fetchMeetingTypes = async () => {
    try {
      const response = await fetch('/api/meetings/types')
      if (!response.ok) {
        throw new Error('Failed to fetch meeting types')
      }

      const data = await response.json()
      const quickMeetingTypes = data.meeting_types?.filter((type: MeetingTypeConfig) =>
        type.type === 'quick-meeting' && type.is_active
      ) || []

      setMeetingTypes(quickMeetingTypes)
    } catch (error) {
      console.error('Error fetching meeting types:', error)
      toast.error('Failed to load meeting types')
    } finally {
      setLoading(false)
    }
  }

  const handleBookingComplete = (booking: any) => {
    setSelectedMeetingType(null)
    toast.success('Your meeting has been booked successfully!')
  }

  if (selectedMeetingType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Book Meeting</h1>
            <p className="text-muted-foreground">
              Schedule your {selectedMeetingType.name}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectedMeetingType(null)}
          >
            ← Back to Meeting Types
          </Button>
        </div>

        <BookingCalendar
          meetingType={selectedMeetingType}
          onBookingComplete={handleBookingComplete}
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schedule
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-green-600" />
              </div>
              Quick Meeting
            </h1>
            <p className="text-muted-foreground mt-1">Simple scheduling for casual meetings and consultations</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/schedule/meeting-types">
            <Plus className="w-4 h-4 mr-2" />
            Create Meeting Type
          </Link>
        </Button>
      </div>

      {/* Features Overview */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg text-green-800">What's Included</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-green-700">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm">Calendar booking interface</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email confirmations & reminders</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <Video className="w-4 h-4" />
              <span className="text-sm">Video, phone, or in-person options</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Reschedule & cancel functionality</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Types */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading meeting types...</div>
        </div>
      ) : meetingTypes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Quick Meeting Types</h3>
            <p className="text-muted-foreground mb-4">
              Create your first quick meeting type to start accepting bookings.
            </p>
            <Button asChild>
              <Link href="/schedule/meeting-types">
                <Plus className="w-4 h-4 mr-2" />
                Create Meeting Type
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetingTypes.map((meetingType) => (
            <Card key={meetingType.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{meetingType.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {meetingType.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    style={{ backgroundColor: `${meetingType.color}20`, borderColor: meetingType.color }}
                  >
                    {meetingType.duration_minutes}m
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {meetingType.duration_minutes} minutes
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {meetingType.meeting_format === 'video' && <Video className="w-4 h-4" />}
                    {meetingType.meeting_format === 'phone' && <Phone className="w-4 h-4" />}
                    {meetingType.meeting_format === 'in-person' && <MapPin className="w-4 h-4" />}
                    {meetingType.meeting_format === 'any' && <CalendarDays className="w-4 h-4" />}
                    {meetingType.meeting_format === 'any' ? 'Any format' : meetingType.meeting_format}
                  </div>

                  {meetingType.is_paid && (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <span>${(meetingType.price_amount / 100).toFixed(2)} {meetingType.currency}</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {meetingType.total_bookings} bookings
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={() => setSelectedMeetingType(meetingType)}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pricing Info */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Free Tier</span>
              <span className="font-medium">5 meetings/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Basic Plan</span>
              <span className="font-medium">$10/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pro Plan</span>
              <span className="font-medium">$25/month</span>
            </div>
            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/schedule/pricing">View All Plans</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
