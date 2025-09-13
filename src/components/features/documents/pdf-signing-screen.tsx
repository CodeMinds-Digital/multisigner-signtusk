'use client'

import { useState, useEffect } from 'react'
import { X, FileText, CheckCircle, XCircle, User, MapPin, Clock, Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PDFSigningScreenProps {
  request: {
    id: string
    title: string
    document_url: string
    expires_at: string
    signers: Array<{
      id: string
      name: string
      email: string
      status: string
      signing_order: number
    }>
  }
  currentUserEmail: string
  onClose: () => void
  onSign: (signatureData: any) => void
  onDecline: (reason: string) => void
}

interface UserProfile {
  full_name: string
  signatures?: string[]
  location?: {
    state: string
    district: string
    taluk: string
  }
  hasRequiredData?: {
    full_name: boolean
    signatures: boolean
    location: boolean
  }
}

interface LocationData {
  latitude?: number
  longitude?: number
  address?: string
  timestamp: string
  accuracy?: number
}

export function PDFSigningScreen({
  request,
  currentUserEmail,
  onClose,
  onSign,
  onDecline
}: PDFSigningScreenProps) {
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showProfileValidation, setShowProfileValidation] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    signature_image: '',
    state: '',
    district: '',
    taluk: ''
  })
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile()
    captureCurrentLocation()

    // Set the PDF URL from the request
    if (request.document_url) {
      setPdfUrl(request.document_url)
      setPdfLoading(false)
      console.log('✅ PDF URL set for signing:', request.document_url)
    }
  }, [request.document_url])

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true)
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      })

      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
        setProfileForm({
          full_name: profile.full_name || '',
          signature_image: profile.signatures?.[0] || '',
          state: profile.location?.state || '',
          district: profile.location?.district || '',
          taluk: profile.location?.taluk || ''
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  const captureCurrentLocation = async () => {
    setIsCapturingLocation(true)
    setLocationError(null)

    try {
      // Use a free IP geolocation service to get location info
      const response = await fetch('https://ipapi.co/json/')
      const locationInfo = await response.json()

      const locationData: LocationData = {
        timestamp: new Date().toISOString(),
        address: locationInfo.city && locationInfo.country_name
          ? `${locationInfo.city}, ${locationInfo.region}, ${locationInfo.country_name}`
          : 'Location detected automatically',
        latitude: locationInfo.latitude || undefined,
        longitude: locationInfo.longitude || undefined,
        accuracy: undefined
      }

      setCurrentLocation(locationData)
      setIsCapturingLocation(false)
      console.log('✅ Location captured via IP geolocation:', locationData)
    } catch (error) {
      // Fallback: Just set a basic location without IP detection
      const locationData: LocationData = {
        timestamp: new Date().toISOString(),
        address: 'Location detected automatically',
        latitude: undefined,
        longitude: undefined,
        accuracy: undefined
      }

      setCurrentLocation(locationData)
      setIsCapturingLocation(false)
      console.log('✅ Location set automatically (fallback):', locationData)
    }
  }

  const validateProfile = () => {
    const isValid = profileForm.full_name &&
      profileForm.signature_image

    if (!isValid) {
      setShowProfileValidation(true)
      return false
    }
    return true
  }

  const handleAcceptAndSign = async () => {
    if (!validateProfile()) {
      return
    }

    // Location is now automatically captured, no need to wait for user permission

    const signatureData = {
      signer_name: profileForm.full_name,
      signature_image: profileForm.signature_image,
      signed_at: new Date().toISOString(),
      location: currentLocation || {
        timestamp: new Date().toISOString(),
        note: 'Location not available',
        error: locationError
      },
      profile_location: {
        state: profileForm.state,
        district: profileForm.district,
        taluk: profileForm.taluk
      }
    }

    console.log('🖊️ Signing with data:', signatureData)
    onSign(signatureData)
  }

  const handleDecline = () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining')
      return
    }
    onDecline(declineReason)
    setShowDeclineModal(false)
  }

  const handleUpdateProfile = async () => {
    try {
      const updateData = {
        full_name: profileForm.full_name,
        signatures: profileForm.signature_image ? [profileForm.signature_image] : [],
        location: {
          state: profileForm.state,
          district: profileForm.district,
          taluk: profileForm.taluk
        }
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        await fetchUserProfile()
        setShowProfileValidation(false)
        handleAcceptAndSign()
      } else {
        alert('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    }
  }

  const currentSigner = request.signers.find(s => s.email === currentUserEmail)

  if (profileLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading profile...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{request.title}</h2>
            <p className="text-sm text-gray-600">Review and sign the document</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow h-full">
              {pdfLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Loading PDF...</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full rounded-lg"
                  title={`PDF Preview - ${request.title}`}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">PDF not available</p>
                    <p className="text-sm text-gray-500 mt-2">Document: {request.title}</p>
                    {request.document_url && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.open(request.document_url, '_blank')}
                      >
                        Open in New Tab
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 p-6 overflow-y-auto">
            {/* Location Status */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCapturingLocation && (
                  <div className="flex items-center text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Detecting location...
                  </div>
                )}
                {currentLocation && (
                  <div className="text-sm text-green-600">
                    ✅ Location detected automatically
                    <p className="text-xs text-gray-500 mt-1">
                      {currentLocation.address}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Signer Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Your Signing Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm">{currentSigner?.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm">Order: {currentSigner?.signing_order}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm">
                      {profileForm.state && profileForm.district
                        ? `${profileForm.district}, ${profileForm.state}`
                        : 'Location not set'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Validation Alert */}
            {userProfile && !userProfile.hasRequiredData?.full_name && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please complete your profile before signing
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleAcceptAndSign}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept & Sign
              </Button>

              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeclineModal(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>

            {/* Other Signers - Only show for multi-signer documents */}
            {request.signers.filter(s => s.email !== currentUserEmail).length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm">Other Signers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.signers
                      .filter(s => s.email !== currentUserEmail)
                      .map((signer) => (
                        <div key={signer.id} className="flex items-center justify-between">
                          <span className="text-sm">{signer.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {signer.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Decline Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for declining this document:
            </p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter your reason for declining..."
              className="mb-4"
              rows={4}
            />
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDeclineModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDecline}
              >
                Decline Document
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Validation Modal */}
      {showProfileValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Complete Your Profile</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please complete your profile information before signing:
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="signature">Signature *</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                          setProfileForm(prev => ({
                            ...prev,
                            signature_image: e.target?.result as string
                          }))
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  {profileForm.signature_image && (
                    <img
                      src={profileForm.signature_image}
                      alt="Signature"
                      className="mt-2 max-h-20 border rounded"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter your state"
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={profileForm.district}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="Enter your district"
                />
              </div>
              <div>
                <Label htmlFor="taluk">Taluk</Label>
                <Input
                  id="taluk"
                  value={profileForm.taluk}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, taluk: e.target.value }))}
                  placeholder="Enter your taluk (optional)"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowProfileValidation(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProfile}>
                Save & Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
