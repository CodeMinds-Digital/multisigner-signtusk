'use client'

import { FileText, Edit3, XCircle, FileEdit } from 'lucide-react'
import { DocumentTemplate } from '@/types/drive'
import { getDocumentCounts } from '@/utils/document-status'
import { ResponsiveStatsCards, type StatCardData } from '@/components/ui/responsive-stats-cards'
import { useCallback } from 'react'

interface DocumentStatsImprovedProps {
  documents: DocumentTemplate[]
  onFilterChange?: (filter: string) => void
  activeFilter?: string
}

export function DocumentStatsImproved({ documents, onFilterChange, activeFilter = 'all' }: DocumentStatsImprovedProps) {
  const counts = getDocumentCounts(documents as any)

  // Create drive stats cards
  const createDriveStatsCards = useCallback((): StatCardData[] => {
    const handleFilterClick = (filter: string) => {
      if (onFilterChange) {
        onFilterChange(filter === activeFilter ? 'all' : filter)
      }
    }
    return [
      {
        id: 'all',
        title: 'All Documents',
        value: counts.total,
        description: 'Complete overview',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        onClick: () => handleFilterClick('all'),
        isActive: activeFilter === 'all'
      },
      {
        id: 'draft',
        title: 'Draft',
        value: counts.draft || 0,
        description: 'Documents being created',
        icon: FileEdit,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        onClick: () => handleFilterClick('draft'),
        isActive: activeFilter === 'draft'
      },
      {
        id: 'ready',
        title: 'Ready for signature',
        value: counts.ready || 0,
        description: 'Documents ready to be sent',
        icon: Edit3,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        onClick: () => handleFilterClick('ready'),
        isActive: activeFilter === 'ready'
      },
      {
        id: 'inactive',
        title: 'Inactive',
        value: counts.inactive || 0,
        description: 'Expired, cancelled, or archived',
        icon: XCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        onClick: () => handleFilterClick('inactive'),
        isActive: activeFilter === 'inactive'
      }
    ]
  }, [counts, activeFilter, onFilterChange])

  return (
    <div className="space-y-6">
      {/* Enhanced Drive Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Drive Overview</h2>
            <p className="text-gray-600">Manage and track your document templates</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{counts.total}</div>
            <div className="text-sm font-medium text-gray-600">Total Documents</div>
          </div>
        </div>

        <ResponsiveStatsCards
          cards={createDriveStatsCards()}
          cardSize="md"
          className="mb-6"
        />
      </div>
    </div>
  )
}
