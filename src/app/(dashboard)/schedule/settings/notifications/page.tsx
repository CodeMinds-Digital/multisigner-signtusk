'use client'

import { useState } from 'react'
import { Bell, Mail, Clock, Users, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function NotificationsPage() {
  const [emailSettings, setEmailSettings] = useState({
    bookingConfirmation: true,
    reminderEmails: true,
    cancellationNotice: true,
    rescheduleNotice: true,
    noShowFollowup: false,
    weeklyDigest: true
  })

  const [reminderSettings, setReminderSettings] = useState({
    enabled: true,
    reminder24h: true,
    reminder1h: true,
    reminderCustom: false,
    customHours: 2
  })

  const [templates, setTemplates] = useState({
    confirmationSubject: 'Meeting Confirmed: {{meetingType}}',
    confirmationMessage: 'Your meeting has been confirmed for {{date}} at {{time}}.',
    reminderSubject: 'Reminder: Meeting in {{timeUntil}}',
    reminderMessage: 'This is a reminder that you have a meeting scheduled for {{date}} at {{time}}.'
  })

  const handleSave = () => {
    console.log('Saving notification settings:', { emailSettings, reminderSettings, templates })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600 mt-1">Configure email notifications and reminder preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email Notifications
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="w-4 h-4 mr-2" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Bell className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Choose which email notifications to send to meeting participants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Booking confirmation emails</Label>
                  <p className="text-sm text-gray-600">Send confirmation when a meeting is booked</p>
                </div>
                <CustomSwitch
                  checked={emailSettings.bookingConfirmation}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, bookingConfirmation: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Reminder emails</Label>
                  <p className="text-sm text-gray-600">Send reminder emails before meetings</p>
                </div>
                <CustomSwitch
                  checked={emailSettings.reminderEmails}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, reminderEmails: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Cancellation notices</Label>
                  <p className="text-sm text-gray-600">Notify when meetings are cancelled</p>
                </div>
                <CustomSwitch
                  checked={emailSettings.cancellationNotice}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, cancellationNotice: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Reschedule notices</Label>
                  <p className="text-sm text-gray-600">Notify when meetings are rescheduled</p>
                </div>
                <CustomSwitch
                  checked={emailSettings.rescheduleNotice}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, rescheduleNotice: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">No-show follow-up</Label>
                  <p className="text-sm text-gray-600">Send follow-up emails for missed meetings</p>
                </div>
                <CustomSwitch
                  checked={emailSettings.noShowFollowup}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, noShowFollowup: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Weekly digest</Label>
                  <p className="text-sm text-gray-600">Send weekly summary of upcoming meetings</p>
                </div>
                <CustomSwitch
                  checked={emailSettings.weeklyDigest}
                  onCheckedChange={(checked) => setEmailSettings(prev => ({ ...prev, weeklyDigest: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          {/* Reminder Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Reminder Settings
              </CardTitle>
              <CardDescription>Configure when to send meeting reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable reminders</Label>
                  <p className="text-sm text-gray-600">Send automatic meeting reminders</p>
                </div>
                <CustomSwitch
                  checked={reminderSettings.enabled}
                  onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              {reminderSettings.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">24-hour reminder</Label>
                      <p className="text-sm text-gray-600">Send reminder 24 hours before meeting</p>
                    </div>
                    <CustomSwitch
                      checked={reminderSettings.reminder24h}
                      onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, reminder24h: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">1-hour reminder</Label>
                      <p className="text-sm text-gray-600">Send reminder 1 hour before meeting</p>
                    </div>
                    <CustomSwitch
                      checked={reminderSettings.reminder1h}
                      onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, reminder1h: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Custom reminder</Label>
                      <p className="text-sm text-gray-600">Send reminder at custom time</p>
                    </div>
                    <CustomSwitch
                      checked={reminderSettings.reminderCustom}
                      onCheckedChange={(checked) => setReminderSettings(prev => ({ ...prev, reminderCustom: checked }))}
                    />
                  </div>

                  {reminderSettings.reminderCustom && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="custom-hours">Hours before meeting</Label>
                      <Input
                        id="custom-hours"
                        type="number"
                        value={reminderSettings.customHours}
                        onChange={(e) => setReminderSettings(prev => ({ ...prev, customHours: parseInt(e.target.value) }))}
                        className="w-32"
                        min="1"
                        max="168"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Email Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Email Templates
              </CardTitle>
              <CardDescription>Customize your email notification templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="confirmation-subject">Confirmation Email Subject</Label>
                <Input
                  id="confirmation-subject"
                  value={templates.confirmationSubject}
                  onChange={(e) => setTemplates(prev => ({ ...prev, confirmationSubject: e.target.value }))}
                  placeholder="Meeting Confirmed: {{meetingType}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation-message">Confirmation Email Message</Label>
                <Textarea
                  id="confirmation-message"
                  value={templates.confirmationMessage}
                  onChange={(e) => setTemplates(prev => ({ ...prev, confirmationMessage: e.target.value }))}
                  placeholder="Your meeting has been confirmed..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-subject">Reminder Email Subject</Label>
                <Input
                  id="reminder-subject"
                  value={templates.reminderSubject}
                  onChange={(e) => setTemplates(prev => ({ ...prev, reminderSubject: e.target.value }))}
                  placeholder="Reminder: Meeting in {{timeUntil}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-message">Reminder Email Message</Label>
                <Textarea
                  id="reminder-message"
                  value={templates.reminderMessage}
                  onChange={(e) => setTemplates(prev => ({ ...prev, reminderMessage: e.target.value }))}
                  placeholder="This is a reminder that you have a meeting..."
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Available Variables</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><code>{'{{meetingType}}'}</code> - Meeting type name</div>
                  <div><code>{'{{date}}'}</code> - Meeting date</div>
                  <div><code>{'{{time}}'}</code> - Meeting time</div>
                  <div><code>{'{{timeUntil}}'}</code> - Time until meeting</div>
                  <div><code>{'{{guestName}}'}</code> - Guest name</div>
                  <div><code>{'{{hostName}}'}</code> - Host name</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
