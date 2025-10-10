'use client'

import { useState } from 'react'
import { Clock, Calendar, Plus, Trash2, Save, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Separator } from '@/components/ui/separator'

interface TimeSlot {
  start: string
  end: string
}

interface DayAvailability {
  enabled: boolean
  slots: TimeSlot[]
}

interface WeeklyAvailability {
  monday: DayAvailability
  tuesday: DayAvailability
  wednesday: DayAvailability
  thursday: DayAvailability
  friday: DayAvailability
  saturday: DayAvailability
  sunday: DayAvailability
}

export default function AvailabilityPage() {
  const [timezone, setTimezone] = useState('America/New_York')
  const [bufferTime, setBufferTime] = useState('15')
  const [maxAdvanceBooking, setMaxAdvanceBooking] = useState('30')
  const [minNotice, setMinNotice] = useState('2')

  const [availability, setAvailability] = useState<WeeklyAvailability>({
    monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] }
  })

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  const toggleDay = (day: keyof WeeklyAvailability) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: !prev[day].enabled ? [{ start: '09:00', end: '17:00' }] : []
      }
    }))
  }

  const addTimeSlot = (day: keyof WeeklyAvailability) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: '09:00', end: '17:00' }]
      }
    }))
  }

  const removeTimeSlot = (day: keyof WeeklyAvailability, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index)
      }
    }))
  }

  const updateTimeSlot = (day: keyof WeeklyAvailability, index: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }))
  }

  const handleSave = () => {
    // Save availability settings
    console.log('Saving availability:', { availability, timezone, bufferTime, maxAdvanceBooking, minNotice })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability Settings</h1>
          <p className="text-gray-600 mt-1">Configure when you're available for meetings</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            General Settings
          </CardTitle>
          <CardDescription>Configure your timezone and booking preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer">Buffer Time (minutes)</Label>
              <Select value={bufferTime} onValueChange={setBufferTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance">Max Advance Booking (days)</Label>
              <Select value={maxAdvanceBooking} onValueChange={setMaxAdvanceBooking}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                  <SelectItem value="60">2 months</SelectItem>
                  <SelectItem value="90">3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice">Minimum Notice (hours)</Label>
              <Select value={minNotice} onValueChange={setMinNotice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No minimum</SelectItem>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Availability
          </CardTitle>
          <CardDescription>Set your available hours for each day of the week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {days.map((day, dayIndex) => {
            const dayAvailability = availability[day.key as keyof WeeklyAvailability]

            return (
              <div key={day.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CustomSwitch
                      checked={dayAvailability.enabled}
                      onCheckedChange={() => toggleDay(day.key as keyof WeeklyAvailability)}
                    />
                    <Label className="font-medium">{day.label}</Label>
                  </div>

                  {dayAvailability.enabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(day.key as keyof WeeklyAvailability)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Hours
                    </Button>
                  )}
                </div>

                {dayAvailability.enabled && (
                  <div className="ml-6 space-y-2">
                    {dayAvailability.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(
                            day.key as keyof WeeklyAvailability,
                            slotIndex,
                            'start',
                            e.target.value
                          )}
                          className="w-32"
                        />
                        <span className="text-gray-500">to</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(
                            day.key as keyof WeeklyAvailability,
                            slotIndex,
                            'end',
                            e.target.value
                          )}
                          className="w-32"
                        />

                        {dayAvailability.slots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(day.key as keyof WeeklyAvailability, slotIndex)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {dayIndex < days.length - 1 && <Separator />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Preview</CardTitle>
          <CardDescription>How your availability will appear to guests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {days.map((day) => {
              const dayAvailability = availability[day.key as keyof WeeklyAvailability]

              return (
                <div key={day.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="font-medium text-gray-900">{day.label}</span>
                  <div className="text-sm text-gray-600">
                    {dayAvailability.enabled ? (
                      dayAvailability.slots.map((slot, index) => (
                        <span key={index} className="mr-2">
                          {slot.start} - {slot.end}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">Unavailable</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Timezone:</strong> {timezone.replace('_', ' ')} <br />
              <strong>Buffer Time:</strong> {bufferTime} minutes between meetings <br />
              <strong>Booking Window:</strong> {minNotice} hours minimum notice, {maxAdvanceBooking} days maximum advance
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
