'use client'

/**
 * Bulk Actions Panel Component
 * Allows users to perform bulk operations on signature requests
 */

import { useState } from 'react'
import { BulkOperationType, BulkOperationResult } from '@/lib/signature/types/signature-types'

interface BulkActionsPanelProps {
  selectedRequestIds: string[]
  onComplete: () => void
  onCancel: () => void
}

export function BulkActionsPanel({ selectedRequestIds, onComplete, onCancel }: BulkActionsPanelProps) {
  const [selectedOperation, setSelectedOperation] = useState<BulkOperationType>(BulkOperationType.REMIND)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkOperationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parameters, setParameters] = useState<Record<string, unknown>>({})

  const operations = [
    { value: BulkOperationType.REMIND, label: 'Send Reminders', icon: '📧', description: 'Send reminder emails to all pending signers' },
    { value: BulkOperationType.CANCEL, label: 'Cancel Requests', icon: '❌', description: 'Cancel all selected signature requests', danger: true },
    { value: BulkOperationType.EXTEND_EXPIRATION, label: 'Extend Expiration', icon: '⏰', description: 'Extend expiration date for selected requests' },
    { value: BulkOperationType.EXPORT, label: 'Export Data', icon: '📥', description: 'Export selected requests to CSV/PDF' },
    { value: BulkOperationType.DELETE, label: 'Delete Requests', icon: '🗑️', description: 'Permanently delete selected requests', danger: true },
  ]

  const handleExecute = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/v1/signatures/requests/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: selectedOperation,
          request_ids: selectedRequestIds,
          parameters,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Bulk operation failed')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute bulk operation')
    } finally {
      setLoading(false)
    }
  }

  const selectedOp = operations.find((op) => op.value === selectedOperation)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Bulk Actions ({selectedRequestIds.length} selected)
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!result ? (
            <>
              {/* Operation Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Action</label>
                <div className="space-y-2">
                  {operations.map((op) => (
                    <button
                      key={op.value}
                      onClick={() => setSelectedOperation(op.value)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedOperation === op.value
                          ? op.danger
                            ? 'border-red-500 bg-red-50'
                            : 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{op.icon}</span>
                        <div className="flex-1">
                          <h3 className={`font-medium ${op.danger ? 'text-red-900' : 'text-gray-900'}`}>
                            {op.label}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{op.description}</p>
                        </div>
                        {selectedOperation === op.value && (
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Parameters */}
              {selectedOperation === BulkOperationType.EXTEND_EXPIRATION && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extend by (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={(parameters.days as number) || 7}
                    onChange={(e) => setParameters({ ...parameters, days: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {selectedOperation === BulkOperationType.EXPORT && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                  <select
                    value={(parameters.format as string) || 'csv'}
                    onChange={(e) => setParameters({ ...parameters, format: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              )}

              {/* Warning for Dangerous Operations */}
              {selectedOp?.danger && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-900">Warning</h4>
                      <p className="text-sm text-red-800 mt-1">
                        This action cannot be undone. Please confirm you want to proceed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mt-4">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Result Display */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="font-medium text-green-900">Operation Completed</h3>
                    <p className="text-sm text-green-800 mt-1">
                      {result.successful} of {result.total} requests processed successfully
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-900">{result.successful}</p>
                  <p className="text-sm text-green-600">Successful</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-900">{result.failed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <ul className="space-y-2 text-sm text-red-800">
                      {result.errors.map((err, index) => (
                        <li key={index}>
                          <span className="font-mono text-xs">{err.id}</span>: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          {!result ? (
            <>
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={loading || selectedRequestIds.length === 0}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedOp?.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Execute ${selectedOp?.label}`
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

