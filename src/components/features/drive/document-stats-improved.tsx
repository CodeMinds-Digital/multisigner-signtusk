'use client'

import { FileText, BarChart3 } from 'lucide-react'
import { DocumentTemplate } from '@/types/drive'
import { STATUS_GROUPS, getDocumentCounts } from '@/utils/document-status'

interface DocumentStatsImprovedProps {
  documents: DocumentTemplate[]
  onFilterChange?: (filter: string) => void
  activeFilter?: string
}

export function DocumentStatsImproved({ documents, onFilterChange, activeFilter = 'all' }: DocumentStatsImprovedProps) {
  const counts = getDocumentCounts(documents as any)

  const handleFilterClick = (filter: string) => {
    if (onFilterChange) {
      onFilterChange(filter === activeFilter ? 'all' : filter)
    }
  }

  const getColorClasses = (groupLabel: string, isActive: boolean) => {
    const baseClasses = {
      border: isActive ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300',
      bg: isActive ? 'bg-blue-50' : 'bg-white',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      indicator: 'bg-blue-500',
      progressBar: 'bg-blue-500'
    }

    if (groupLabel === 'In Progress') {
      return {
        ...baseClasses,
        border: isActive ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300',
        bg: isActive ? 'bg-blue-50' : 'bg-white',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        progressBar: 'bg-blue-500'
      }
    } else if (groupLabel === 'Ready to Send') {
      return {
        ...baseClasses,
        border: isActive ? 'border-emerald-500' : 'border-gray-200 hover:border-emerald-300',
        bg: isActive ? 'bg-emerald-50' : 'bg-white',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        progressBar: 'bg-emerald-500'
      }
    } else if (groupLabel === 'Archived') {
      return {
        ...baseClasses,
        border: isActive ? 'border-slate-500' : 'border-gray-200 hover:border-slate-300',
        bg: isActive ? 'bg-slate-50' : 'bg-white',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-600',
        progressBar: 'bg-slate-500'
      }
    }
    return baseClasses
  }

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Document Overview</h2>
              <p className="text-gray-600">Manage and track your document workflow efficiently</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {counts.total}
            </div>
            <div className="text-sm font-medium text-gray-600">Total Documents</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Documents Card */}
        <div
          className={`bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${activeFilter === 'all'
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
            : 'border-gray-200 hover:border-blue-300'
            }`}
          onClick={() => handleFilterClick('all')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            {activeFilter === 'all' && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{counts.total}</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">All Documents</p>
            <p className="text-xs text-gray-500">Complete overview</p>
          </div>
        </div>

        {/* Status Group Cards */}
        {STATUS_GROUPS.map((group) => {
          const count = (counts as any)[group.label.toLowerCase().replace(/\s+/g, '_')] || 0
          const Icon = group.icon
          const filterKey = group.label.toLowerCase().replace(/\s+/g, '_')
          const isActive = activeFilter === filterKey
          const percentage = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0
          const colors = getColorClasses(group.label, isActive)

          return (
            <div
              key={group.label}
              className={`bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${colors.border} ${isActive ? `${colors.bg} shadow-lg` : ''
                }`}
              onClick={() => handleFilterClick(filterKey)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${colors.iconBg} rounded-xl`}>
                  <Icon className={`w-6 h-6 ${colors.iconColor}`} />
                </div>
                <div className="flex items-center space-x-2">
                  {isActive && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 ${colors.progressBar} rounded-full animate-pulse`}></div>
                      <div className={`w-2 h-2 ${colors.progressBar} rounded-full animate-pulse opacity-75`} style={{ animationDelay: '0.2s' }}></div>
                      <div className={`w-2 h-2 ${colors.progressBar} rounded-full animate-pulse opacity-50`} style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  )}
                  {counts.total > 0 && percentage > 0 && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.iconBg} ${colors.iconColor} border border-current border-opacity-20`}>
                      {percentage}%
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-2">{count}</p>
                <p className="text-sm font-semibold text-gray-700 mb-1">{group.label}</p>
                <p className="text-xs text-gray-500">{group.description}</p>
              </div>

              {/* Enhanced Progress bar */}
              {counts.total > 0 && count > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${colors.progressBar} relative`}
                      style={{ width: `${percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-medium text-gray-700">{count} of {counts.total}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Bar */}
      {counts.total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Workflow Progress</h3>
            <div className="text-sm text-gray-500">
              {STATUS_GROUPS.reduce((acc, group) => {
                const count = (counts as any)[group.label.toLowerCase().replace(/\s+/g, '_')] || 0
                return acc + count
              }, 0)} / {counts.total} categorized
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="flex h-full">
              {STATUS_GROUPS.map((group) => {
                const count = (counts as any)[group.label.toLowerCase().replace(/\s+/g, '_')] || 0
                const percentage = counts.total > 0 ? (count / counts.total) * 100 : 0
                const colors = getColorClasses(group.label, false)

                return percentage > 0 ? (
                  <div
                    key={group.label}
                    className={`${colors.progressBar} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                    title={`${group.label}: ${count} documents (${Math.round(percentage)}%)`}
                  />
                ) : null
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
