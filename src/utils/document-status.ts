import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Edit3,
  Send,
  Users,
  Calendar,
  Archive
} from 'lucide-react'
import { DocumentStatus } from '@/types/document-management'

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

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, StatusConfig> = {
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
    label: 'Ready to Sign',
    description: 'Document is ready for signatures',
    icon: Send,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
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
  archived: {
    label: 'Archived',
    description: 'Document has been archived',
    icon: Archive,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    badgeVariant: 'secondary'
  }
}

export interface StatusGroupConfig {
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  statuses: DocumentStatus[]
  priority: number
}

export const STATUS_GROUPS: StatusGroupConfig[] = [
  {
    label: 'In Progress',
    description: 'Documents being worked on',
    icon: Edit3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    statuses: ['draft'],
    priority: 1
  },
  {
    label: 'Ready to Send',
    description: 'Documents ready for signatures',
    icon: Send,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    statuses: ['ready'],
    priority: 2
  },
  {
    label: 'Archived',
    description: 'Archived documents',
    icon: Archive,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    statuses: ['archived'],
    priority: 3
  }
]

export function getStatusConfig(status: DocumentStatus): StatusConfig {
  return DOCUMENT_STATUS_CONFIG[status]
}

export function getStatusGroup(status: DocumentStatus): StatusGroupConfig | undefined {
  return STATUS_GROUPS.find(group => group.statuses.includes(status))
}

export function getDocumentCounts(documents: { status: DocumentStatus }[]) {
  const total = documents.length

  const counts = STATUS_GROUPS.reduce((acc, group) => {
    const count = documents.filter(doc => group.statuses.includes(doc.status)).length
    acc[group.label.toLowerCase().replace(/\s+/g, '_')] = count
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    ...counts
  }
}

export function filterDocumentsByStatus(
  documents: { status: DocumentStatus }[],
  statusFilter: DocumentStatus | 'all'
) {
  if (statusFilter === 'all') return documents
  return documents.filter(doc => doc.status === statusFilter)
}

export function filterDocumentsByGroup(
  documents: { status: DocumentStatus }[],
  groupLabel: string
) {
  if (groupLabel === 'all') return documents
  const group = STATUS_GROUPS.find(g => g.label.toLowerCase().replace(/\s+/g, '_') === groupLabel)
  if (!group) return documents
  return documents.filter(doc => group.statuses.includes(doc.status))
}
