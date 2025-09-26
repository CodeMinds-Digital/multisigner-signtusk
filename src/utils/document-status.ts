import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Edit3,
  Calendar
} from 'lucide-react'

// Extended document status type to handle all possible statuses across the app
export type ExtendedDocumentStatus =
  | 'draft'
  | 'ready'
  | 'pending'
  | 'sent'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'declined'
  | 'archived'

export interface StatusConfig {
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
}

// Extended status configuration to handle all possible statuses across the app
export const DOCUMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    label: 'Draft',
    description: 'Document is being created or edited',
    icon: Edit3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    badgeVariant: 'outline'
  },
  ready: {
    label: 'Ready',
    description: 'Document is ready for signature requests',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    badgeVariant: 'default'
  },
  pending: {
    label: 'Pending Signatures',
    description: 'Waiting for signatures from recipients',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    badgeVariant: 'secondary'
  },
  sent: {
    label: 'Sent',
    description: 'Signature request has been sent',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    badgeVariant: 'secondary'
  },
  in_progress: {
    label: 'In Progress',
    description: 'Some signatures have been collected',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    badgeVariant: 'secondary'
  },
  completed: {
    label: 'Completed',
    description: 'All signatures have been collected',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    badgeVariant: 'default'
  },
  expired: {
    label: 'Expired',
    description: 'Document has passed its expiration date',
    icon: Calendar,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    badgeVariant: 'destructive'
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Document was cancelled and is no longer active',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    badgeVariant: 'outline'
  },
  declined: {
    label: 'Declined',
    description: 'Document was declined by a recipient',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    badgeVariant: 'destructive'
  },
  archived: {
    label: 'Archived',
    description: 'Document has been archived',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    badgeVariant: 'outline'
  }
}

export interface StatusGroupConfig {
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  statuses: ExtendedDocumentStatus[]
  priority: number
}

export const STATUS_GROUPS: StatusGroupConfig[] = [
  {
    label: 'In Progress',
    description: 'Documents being worked on',
    icon: Edit3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    statuses: ['draft', 'ready'],
    priority: 1
  },
  {
    label: 'Pending Signatures',
    description: 'Documents waiting for signatures',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    statuses: ['pending', 'sent', 'in_progress'],
    priority: 2
  },
  {
    label: 'Completed',
    description: 'Completed documents',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    statuses: ['completed'],
    priority: 3
  },
  {
    label: 'Inactive',
    description: 'Expired, cancelled, or archived documents',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    statuses: ['expired', 'cancelled', 'declined', 'archived'],
    priority: 4
  }
]

export function getStatusConfig(status: ExtendedDocumentStatus | string): StatusConfig {
  // Return the config if it exists, otherwise return a default config
  const config = DOCUMENT_STATUS_CONFIG[status]

  if (!config) {
    console.warn('Unknown document status:', status)
    // Return a default config for unknown statuses
    return {
      label: status || 'Unknown',
      description: 'Unknown document status',
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-800',
      badgeVariant: 'outline'
    }
  }

  return config
}

export function getStatusGroup(status: ExtendedDocumentStatus): StatusGroupConfig | undefined {
  return STATUS_GROUPS.find(group => group.statuses.includes(status))
}

export function getDocumentCounts(documents: { status: ExtendedDocumentStatus }[]): { total: number } & Record<string, number> {
  const total = documents.length

  // Get counts for status groups
  const counts = STATUS_GROUPS.reduce((acc, group) => {
    const count = documents.filter(doc => group.statuses.includes(doc.status)).length
    acc[group.label.toLowerCase().replace(/\s+/g, '_')] = count
    return acc
  }, {} as Record<string, number>)

  // Add individual status counts for specific statuses
  const individualCounts = {
    draft: documents.filter(doc => doc.status === 'draft').length,
    ready: documents.filter(doc => doc.status === 'ready').length,
    pending: documents.filter(doc => doc.status === 'pending').length,
    completed: documents.filter(doc => doc.status === 'completed').length,
    expired: documents.filter(doc => doc.status === 'expired').length,
    cancelled: documents.filter(doc => doc.status === 'cancelled').length,
    archived: documents.filter(doc => doc.status === 'archived').length
  }

  return {
    total,
    ...counts,
    ...individualCounts
  }
}

export function filterDocumentsByStatus(
  documents: { status: ExtendedDocumentStatus }[],
  statusFilter: ExtendedDocumentStatus | 'all'
) {
  if (statusFilter === 'all') return documents
  return documents.filter(doc => doc.status === statusFilter)
}

export function filterDocumentsByGroup(
  documents: { status: ExtendedDocumentStatus }[],
  groupLabel: string
) {
  if (groupLabel === 'all') return documents
  const group = STATUS_GROUPS.find(g => g.label.toLowerCase().replace(/\s+/g, '_') === groupLabel)
  if (!group) return documents
  return documents.filter(doc => group.statuses.includes(doc.status))
}
