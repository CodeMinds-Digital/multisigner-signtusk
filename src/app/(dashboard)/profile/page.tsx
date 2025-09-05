'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { User, Mail, Calendar, Shield, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="text-gray-900">
                    {user.full_name || user.first_name || 'Not provided'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type
                  </label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    {user.account_type === 'corporate' ? 'Corporate' : 'Personal'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member Since
                  </label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>

              {user.company_name && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Company Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <div className="text-gray-900">{user.company_name}</div>
                    </div>
                    {user.job_title && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title
                        </label>
                        <div className="text-gray-900">{user.job_title}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Avatar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Your profile avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-medium">
                {user.full_name?.charAt(0) || user.first_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900">
                  {user.full_name || user.first_name || 'User'}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
              {isEditing && (
                <Button variant="outline" size="sm">
                  Change Picture
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <span className={`text-sm font-medium ${user.email_verified ? 'text-green-600' : 'text-red-600'}`}>
                    {user.email_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                {user.account_type === 'corporate' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Company Verified</span>
                    <span className={`text-sm font-medium ${user.company_verified ? 'text-green-600' : 'text-orange-600'}`}>
                      {user.company_verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsEditing(false)}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}
