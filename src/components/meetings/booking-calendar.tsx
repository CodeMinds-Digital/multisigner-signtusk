'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Mail, Phone, Building, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { MeetingTypeConfig, TimeSlot } from '@/types/meetings'

interface BookingCalendarProps {
  meetingType: MeetingTypeConfig
  onBookingComplete?: (booking: any) => void
}

export function BookingCalendar({ meetingType, onBookingComplete }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_company: '',
    guest_title: '',
    guest_notes: '',
    project_details: '',
    budget_range: '',
    timeline: ''
  })

  const toast = useToast()

  // Generate next 30 days for date selection
  const generateDates = () => {
    const dates = []
    const today = new Date()

    for (let i = 1; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      // Skip weekends for default availability
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })
        })
      }
    }

    return dates
  }

  const availableDates = generateDates()

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (selectedDate && meetingType.id) {
      fetchAvailableSlots()
    }
  }, [selectedDate, meetingType.id])

  const fetchAvailableSlots = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/meetings/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_type_id: meetingType.id,
          date: selectedDate
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch availability')
      }

      const data = await response.json()
      setAvailableSlots(data.available_slots || [])
    } catch (error) {
      console.error('Error fetching availability:', error)
      toast.error('Failed to load available time slots')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time')
      return
    }

    if (!formData.guest_name || !formData.guest_email) {
      toast.error('Please fill in your name and email')
      return
    }

    setSubmitting(true)
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`)

      const bookingData = {
        meeting_type_id: meetingType.id,
        scheduled_at: scheduledAt.toISOString(),
        ...formData
      }

      const response = await fetch('/api/meetings/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create booking')
      }

      const result = await response.json()

      toast.success('Your meeting has been booked successfully. Check your email for confirmation.')

      // Reset form
      setFormData({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_company: '',
        guest_title: '',
        guest_notes: '',
        project_details: '',
        budget_range: '',
        timeline: ''
      })
      setSelectedDate('')
      setSelectedTime('')
      setAvailableSlots([])

      onBookingComplete?.(result.booking)
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Meeting Type Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {meetingType.name}
          </CardTitle>
          <CardDescription>
            {meetingType.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {meetingType.duration_minutes} minutes
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline">{meetingType.meeting_format}</Badge>
            </div>
            {meetingType.is_paid && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary">
                  ${(meetingType.price_amount / 100).toFixed(2)} {meetingType.currency}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Date & Time Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date & Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Selection */}
            <div>
              <Label htmlFor="date">Date</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a date" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((date) => (
                    <SelectItem key={date.value} value={date.value}>
                      {date.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <Label htmlFor="time">Time</Label>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading available times...</div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.start}
                        variant={selectedTime === slot.start ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot.start)}
                      >
                        {slot.start}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No available times for this date
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_name">
                    <User className="h-4 w-4 inline mr-1" />
                    Name *
                  </Label>
                  <Input
                    id="guest_name"
                    value={formData.guest_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email *
                  </Label>
                  <Input
                    id="guest_email"
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone
                  </Label>
                  <Input
                    id="guest_phone"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="guest_company">
                    <Building className="h-4 w-4 inline mr-1" />
                    Company
                  </Label>
                  <Input
                    id="guest_company"
                    value={formData.guest_company}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_company: e.target.value }))}
                  />
                </div>
              </div>

              {meetingType.type === 'business-meeting' && (
                <>
                  <div>
                    <Label htmlFor="project_details">Project Details</Label>
                    <Textarea
                      id="project_details"
                      value={formData.project_details}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_details: e.target.value }))}
                      placeholder="Tell us about your project..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget_range">Budget Range</Label>
                      <Select
                        value={formData.budget_range}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, budget_range: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select budget" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-10k">Under $10,000</SelectItem>
                          <SelectItem value="10k-50k">$10,000 - $50,000</SelectItem>
                          <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                          <SelectItem value="over-100k">Over $100,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timeline">Timeline</Label>
                      <Select
                        value={formData.timeline}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asap">ASAP</SelectItem>
                          <SelectItem value="1-3-months">1-3 months</SelectItem>
                          <SelectItem value="3-6-months">3-6 months</SelectItem>
                          <SelectItem value="6-plus-months">6+ months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="guest_notes">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Additional Notes
                </Label>
                <Textarea
                  id="guest_notes"
                  value={formData.guest_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, guest_notes: e.target.value }))}
                  placeholder="Anything else you'd like us to know?"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedDate || !selectedTime || submitting}
              >
                {submitting ? 'Booking...' : 'Book Meeting'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
