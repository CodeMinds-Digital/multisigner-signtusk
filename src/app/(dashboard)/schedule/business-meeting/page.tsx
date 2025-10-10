'use client'

import { useState, useEffect } from 'react'
import { FileSignature, Clock, Video, Phone, MapPin, Mail, User, MessageSquare, ArrowLeft, Shield, FileText, Zap, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BusinessMeetingPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [meetingType, setMeetingType] = useState<string>('')
  const [duration, setDuration] = useState<string>('60')
  const [documentWorkflow, setDocumentWorkflow] = useState<string>('')

  // Mock available time slots
  const availableSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
  ]



  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle booking logic here
    console.log('Business meeting booking submitted')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-purple-600" />
            </div>
            Business Meeting
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
              Recommended
            </span>
          </h1>
          <p className="text-gray-600 mt-1">Advanced scheduling with document workflows and signatures</p>
        </div>
      </div>

      {/* Features Overview */}
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg text-purple-800">Advanced Features Included</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-purple-700">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Automated document delivery</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <FileSignature className="w-4 h-4" />
              <span className="text-sm">Integrated signature workflows</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Enterprise security (TOTP/MFA)</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Advanced analytics & reporting</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Workflow automation</span>
            </div>
            <div className="flex items-center gap-2 text-purple-700">
              <User className="w-4 h-4" />
              <span className="text-sm">Multi-party coordination</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Your Business Meeting</CardTitle>
            <CardDescription>Complete workflow from scheduling to document signing</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBooking} className="space-y-4">
              {/* Meeting Type */}
              <div className="space-y-2">
                <Label htmlFor="meeting-type">Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Video Call
                      </div>
                    </SelectItem>
                    <SelectItem value="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Call
                      </div>
                    </SelectItem>
                    <SelectItem value="in-person">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        In-Person Meeting
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Document Workflow */}
              <div className="space-y-2">
                <Label htmlFor="workflow">Document Workflow</Label>
                <Select value={documentWorkflow} onValueChange={setDocumentWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">
                      <div className="flex flex-col items-start">
                        <span>Legal Consultation</span>
                        <span className="text-xs text-gray-500">Intake forms → Meeting → Retainer</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sales">
                      <div className="flex flex-col items-start">
                        <span>Sales Meeting</span>
                        <span className="text-xs text-gray-500">NDA → Proposal → Contract</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="real-estate">
                      <div className="flex flex-col items-start">
                        <span>Real Estate</span>
                        <span className="text-xs text-gray-500">Disclosures → Viewing → Agreement</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex flex-col items-start">
                        <span>Custom Workflow</span>
                        <span className="text-xs text-gray-500">Configure your own process</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date">Select Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label>Available Time Slots</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot)}
                        className="text-xs"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-gray-900">Your Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="Enter your full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" placeholder="your@email.com" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Your company name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" placeholder="Your job title" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Project Details</Label>
                  <Textarea
                    id="project"
                    placeholder="Tell us about your project, requirements, timeline, and budget"
                    rows={4}
                  />
                </div>

                {/* Security Options */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-gray-900">Security Preferences</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox />
                      <Label className="text-sm">
                        Require two-factor authentication for document access
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox />
                      <Label className="text-sm">
                        Add watermarks to shared documents
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox />
                      <Label className="text-sm">
                        Enable advanced document tracking
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!selectedDate || !selectedTime || !meetingType || !documentWorkflow}
              >
                Book Business Meeting
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Meeting Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <FileSignature className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Business Meeting</div>
                    <div className="text-sm text-gray-600">
                      {duration} minutes • {meetingType || 'Select type'}
                    </div>
                    {documentWorkflow && (
                      <div className="text-xs text-purple-600 font-medium">
                        {documentWorkflow.charAt(0).toUpperCase() + documentWorkflow.slice(1)} Workflow
                      </div>
                    )}
                  </div>
                </div>

                {selectedDate && selectedTime && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-blue-700">{selectedTime}</div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600 space-y-2">
                  <p>✅ Documents auto-sent after booking</p>
                  <p>✅ Advanced security & tracking</p>
                  <p>✅ Signature workflows included</p>
                  <p>✅ Real-time analytics</p>
                  <p>✅ Enterprise-grade features</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Preview */}
          {documentWorkflow && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">Workflow Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {documentWorkflow === 'consultation' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>1. Auto-send intake forms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>2. Conduct consultation meeting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>3. Generate retainer agreement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>4. Client signs documents</span>
                      </div>
                    </>
                  )}
                  {documentWorkflow === 'sales' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>1. Send NDA for review</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>2. Conduct sales presentation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>3. Generate custom proposal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span>4. Contract negotiation & signing</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Info */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Professional Plan</span>
                  <span className="font-medium">$50/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Enterprise Plan</span>
                  <span className="font-medium">$150/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Custom Enterprise</span>
                  <span className="font-medium">Contact Sales</span>
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
      </div>
    </div>
  )
}
