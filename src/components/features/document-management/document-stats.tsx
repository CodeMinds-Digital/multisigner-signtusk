'use client'

import { FileText, TrendingUp } from 'lucide-react'
import { DocumentTemplate } from '@/types/document-management'
import { STATUS_GROUPS, getDocumentCounts } from '@/utils/document-status'

interface DocumentStatsProps {
  documents: DocumentTemplate[]
  onFilterChange?: (filter: string) => void
  activeFilter?: string
}

export function DocumentStats({ documents, onFilterChange, activeFilter = 'all' }: DocumentStatsProps) {
  const counts = getDocumentCounts(documents)

  const handleFilterClick = (filter: string) => {
    if (onFilterChange) {
      onFilterChange(filter === activeFilter ? 'all' : filter)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Total Documents */}
      <div 
        className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
          activeFilter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleFilterClick('all')}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
          </div>
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">All documents in system</p>
        </div>
      </div>

      {/* Status Group Cards */}
      {STATUS_GROUPS.map((group) => {
        const count = counts[group.label.toLowerCase().replace(/\s+/g, '_')] || 0
        const Icon = group.icon
        const filterKey = group.label.toLowerCase().replace(/\s+/g, '_')
        const isActive = activeFilter === filterKey
        const percentage = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0

        return (
          <div
            key={group.label}
            className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
              isActive 
                ? `border-${group.color.split('-')[1]}-500 ${group.bgColor}` 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleFilterClick(filterKey)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{group.label}</p>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
              <div className={`p-2 rounded-lg ${group.bgColor}`}>
                <Icon className={`w-6 h-6 ${group.color}`} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">{group.description}</p>
              {counts.total > 0 && (
                <div className="flex items-center text-xs text-gray-400">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {percentage}%
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DocumentStatsCompact({ documents }: { documents: DocumentTemplate[] }) {
  const counts = getDocumentCounts(documents)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Document Overview</h3>
        <FileText className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        
        {STATUS_GROUPS.slice(0, 4).map((group) => {
          const count = counts[group.label.toLowerCase().replace(/\s+/g, '_')] || 0
          const Icon = group.icon
          
          return (
            <div key={group.label} className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Icon className={`w-4 h-4 ${group.color} mr-1`} />
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
              <p className="text-sm text-gray-600">{group.label}</p>
            </div>
          )
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{counts.completed || 0} of {counts.total} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: counts.total > 0 ? `${((counts.completed || 0) / counts.total) * 100}%` : '0%' 
            }}
          />
        </div>
      </div>
    </div>
  )
}
