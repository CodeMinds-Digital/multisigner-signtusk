'use client'

import { DocumentStats, DocumentStatsCompact } from '@/components/features/drive/document-stats'
import { DocumentTemplate } from '@/types/drive'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DOCUMENT_STATUS_CONFIG, STATUS_GROUPS } from '@/utils/document-status'

// Sample data for demonstration
const sampleDocuments: DocumentTemplate[] = [
  {
    id: '1',
    name: 'Employment Contract - John Doe',
    type: 'Contract',
    signature_type: 'single',
    status: 'draft',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    user_id: 'user1',
    schemas: []
  },
  {
    id: '2',
    name: 'NDA Agreement - Tech Corp',
    type: 'NDA',
    signature_type: 'multi',
    status: 'ready',
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-14T09:00:00Z',
    user_id: 'user1',
    schemas: []
  },
  {
    id: '3',
    name: 'Service Agreement - Client ABC',
    type: 'Service Agreement',
    signature_type: 'multi',
    status: 'pending',
    created_at: '2024-01-13T08:00:00Z',
    updated_at: '2024-01-13T08:00:00Z',
    user_id: 'user1',
    schemas: []
  },
  {
    id: '4',
    name: 'Purchase Order - Supplier XYZ',
    type: 'Purchase Order',
    signature_type: 'single',
    status: 'completed',
    created_at: '2024-01-12T07:00:00Z',
    updated_at: '2024-01-12T07:00:00Z',
    user_id: 'user1',
    schemas: []
  },
  {
    id: '5',
    name: 'Lease Agreement - Office Space',
    type: 'Lease',
    signature_type: 'multi',
    status: 'expired',
    created_at: '2024-01-11T06:00:00Z',
    updated_at: '2024-01-11T06:00:00Z',
    user_id: 'user1',
    schemas: []
  },
  {
    id: '6',
    name: 'Consulting Agreement - Cancelled',
    type: 'Consulting',
    signature_type: 'single',
    status: 'cancelled',
    created_at: '2024-01-10T05:00:00Z',
    updated_at: '2024-01-10T05:00:00Z',
    user_id: 'user1',
    schemas: []
  }
]

export default function DocumentStatusDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Document Status System
          </h1>
          <p className="text-gray-600">
            Refined UI/UX with better categories and status tracking
          </p>
        </div>

        <div className="space-y-8">
          {/* Enhanced Stats Component */}
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Document Statistics</CardTitle>
              <CardDescription>
                Interactive stats with filtering capabilities and better categorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentStats documents={sampleDocuments} />
            </CardContent>
          </Card>

          {/* Compact Stats Component */}
          <Card>
            <CardHeader>
              <CardTitle>Compact Overview</CardTitle>
              <CardDescription>
                Condensed view with progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentStatsCompact documents={sampleDocuments} />
            </CardContent>
          </Card>

          {/* Status Configuration Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Status Configuration</CardTitle>
              <CardDescription>
                All available document statuses with their visual styling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(DOCUMENT_STATUS_CONFIG).map(([status, config]) => {
                  const Icon = config.icon
                  return (
                    <div key={status} className={`p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}>
                      <div className="flex items-center mb-2">
                        <Icon className={`w-5 h-5 ${config.color} mr-2`} />
                        <span className={`font-semibold ${config.textColor}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{config.description}</p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                          <Icon className={`w-3 h-3 ${config.color} mr-1`} />
                          {config.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Status Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Status Groups</CardTitle>
              <CardDescription>
                Logical groupings for better organization and filtering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {STATUS_GROUPS.map((group) => {
                  const Icon = group.icon
                  const count = sampleDocuments.filter(doc => group.statuses.includes(doc.status)).length
                  return (
                    <div key={group.label} className={`p-4 rounded-lg border-2 ${group.bgColor} border-gray-200`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Icon className={`w-5 h-5 ${group.color} mr-2`} />
                          <span className="font-semibold text-gray-900">
                            {group.label}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{count}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.statuses.map(status => {
                          const config = DOCUMENT_STATUS_CONFIG[status]
                          const StatusIcon = config.icon
                          return (
                            <span key={status} className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                              <StatusIcon className={`w-3 h-3 ${config.color} mr-1`} />
                              {config.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sample Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Documents</CardTitle>
              <CardDescription>
                Example documents showing the new status system in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sampleDocuments.map((doc) => {
                  const config = DOCUMENT_STATUS_CONFIG[doc.status]
                  const Icon = config.icon
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{doc.name}</h3>
                        <p className="text-sm text-gray-500">{doc.type} • {doc.signature_type} signature</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                        <Icon className={`w-4 h-4 ${config.color} mr-2`} />
                        {config.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
