'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, User, Mail, Calendar } from 'lucide-react'

interface AccessRequest {
  id: string
  created_at: string
  user_profile: {
    id: string
    email: string
    first_name: string
    last_name: string
    created_at: string
  }
}

interface Message {
  type: 'success' | 'error'
  text: string
}

export function ApprovalQueue() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [selectedAction, setSelectedAction] = useState<'approve' | 'decline' | null>(null)
  const [adminMessage, setAdminMessage] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/corporate/access-requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching access requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (request: AccessRequest, action: 'approve' | 'decline') => {
    setSelectedRequest(request)
    setSelectedAction(action)
    setShowMessageDialog(true)
    setAdminMessage('')
  }

  const confirmAction = async () => {
    if (!selectedRequest || !selectedAction) return

    setActionLoading(selectedRequest.id)
    setMessage(null)

    try {
      const response = await fetch('/api/corporate/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: selectedAction,
          message: adminMessage || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: selectedAction === 'approve'
            ? `${data.user.name} has been approved and can now log in`
            : `Access request from ${data.user.name} has been declined`
        })
        fetchRequests() // Refresh the list
        setShowMessageDialog(false)
        setSelectedRequest(null)
        setSelectedAction(null)
        setAdminMessage('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch (error) {
      console.error('Error processing request:', error)
      setMessage({ type: 'error', text: 'Failed to process request' })
    } finally {
      setActionLoading(null)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading pending requests...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Access Requests
          </h3>
          <p className="text-sm text-gray-600">
            Users waiting for approval to join your organization
          </p>
        </div>
        {requests.length > 0 && (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {requests.length} pending
          </div>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No pending access requests</p>
          <p className="text-sm text-gray-500 mt-1">
            When users request access in Approval Mode, they'll appear here
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {getInitials(
                        request.user_profile.first_name,
                        request.user_profile.last_name
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {request.user_profile.first_name}{' '}
                          {request.user_profile.last_name}
                        </h4>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          Pending
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {request.user_profile.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Requested {formatDate(request.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(request, 'approve')}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(request, 'decline')}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Dialog */}
      {showMessageDialog && selectedRequest && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {selectedAction === 'approve' ? 'Approve Access Request' : 'Decline Access Request'}
            </h3>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                {selectedAction === 'approve' ? (
                  <>
                    You are about to approve{' '}
                    <span className="font-semibold">
                      {selectedRequest.user_profile.first_name}{' '}
                      {selectedRequest.user_profile.last_name}
                    </span>
                    . They will be able to log in immediately.
                  </>
                ) : (
                  <>
                    You are about to decline the access request from{' '}
                    <span className="font-semibold">
                      {selectedRequest.user_profile.first_name}{' '}
                      {selectedRequest.user_profile.last_name}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            {/* Optional Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to User (Optional)
              </label>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder={
                  selectedAction === 'approve'
                    ? 'Welcome to the team!'
                    : 'Please contact HR for more information.'
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMessageDialog(false)
                  setSelectedRequest(null)
                  setSelectedAction(null)
                  setAdminMessage('')
                }}
                disabled={actionLoading === selectedRequest.id}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionLoading === selectedRequest.id}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors ${
                  selectedAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading === selectedRequest.id ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

