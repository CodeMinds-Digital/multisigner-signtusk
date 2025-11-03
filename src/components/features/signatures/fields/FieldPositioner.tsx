'use client'

/**
 * Field Positioner Component
 * Allows users to position signature fields on documents
 */

import { useState, useRef, useEffect } from 'react'
import { SignatureField, FieldType } from '@/lib/signature/types/signature-types'

interface FieldPositionerProps {
  documentUrl: string
  documentId: string
  signers: Array<{ id: string; name: string; email: string }>
  onSave: (fields: SignatureField[]) => void
  initialFields?: SignatureField[]
}

export function FieldPositioner({
  documentUrl,
  documentId,
  signers,
  onSave,
  initialFields = [],
}: FieldPositionerProps) {
  const [fields, setFields] = useState<SignatureField[]>(initialFields)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>(FieldType.SIGNATURE)
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.id || '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isDragging) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const newField: SignatureField = {
      id: `field-${Date.now()}`,
      type: selectedFieldType,
      position: {
        x,
        y,
        width: selectedFieldType === FieldType.SIGNATURE ? 20 : 15,
        height: selectedFieldType === FieldType.SIGNATURE ? 8 : 5,
        page: currentPage,
      },
      required: true,
      assigned_to: selectedSigner,
      completed: false,
    }

    setFields([...fields, newField])
  }

  const handleFieldDragStart = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation()
    setIsDragging(true)
    setSelectedField(fieldId)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleFieldDrag = (e: React.MouseEvent) => {
    if (!isDragging || !selectedField || !dragStart || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100

    setFields(
      fields.map((field) =>
        field.id === selectedField
          ? {
            ...field,
            position: {
              ...field.position,
              x: Math.max(0, Math.min(100 - field.position.width, field.position.x + deltaX)),
              y: Math.max(0, Math.min(100 - field.position.height, field.position.y + deltaY)),
            },
          }
          : field
      )
    )

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleFieldDragEnd = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const deleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId))
    if (selectedField === fieldId) {
      setSelectedField(null)
    }
  }

  const getSignerColor = (signerId: string) => {
    const index = signers.findIndex((s) => s.id === signerId)
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
    return colors[index % colors.length]
  }

  const getFieldTypeLabel = (type: FieldType) => {
    switch (type) {
      case FieldType.SIGNATURE:
        return 'Signature'
      case FieldType.INITIALS:
        return 'Initials'
      case FieldType.DATE:
        return 'Date'
      case FieldType.TEXT:
        return 'Text'
      case FieldType.CHECKBOX:
        return 'Checkbox'
      default:
        return type
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Add Fields</h3>

        {/* Field Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
          <select
            value={selectedFieldType}
            onChange={(e) => setSelectedFieldType(e.target.value as FieldType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(FieldType).map((type) => (
              <option key={type} value={type}>
                {getFieldTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        {/* Signer Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
          <select
            value={selectedSigner}
            onChange={(e) => setSelectedSigner(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {signers.map((signer) => (
              <option key={signer.id} value={signer.id}>
                {signer.name || signer.email}
              </option>
            ))}
          </select>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-800">
            Click on the document to place a field. Drag fields to reposition them.
          </p>
        </div>

        {/* Field List */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Placed Fields ({fields.length})</h4>
          <div className="space-y-2">
            {fields.map((field) => {
              const signer = signers.find((s) => s.id === field.assigned_to)
              return (
                <div
                  key={field.id}
                  className={`p-3 rounded-lg border ${selectedField === field.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getSignerColor(field.assigned_to || '')}`}></span>
                        <span className="text-sm font-medium">{getFieldTypeLabel(field.type)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{signer?.name || signer?.email}</p>
                    </div>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={() => onSave(fields)}
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Field Configuration
        </button>
      </div>

      {/* Document Preview */}
      <div className="flex-1 bg-gray-100 p-8 overflow-auto">
        <div
          ref={containerRef}
          className="relative bg-white shadow-lg mx-auto"
          style={{ width: '800px', height: '1100px' }}
          onClick={handleContainerClick}
          onMouseMove={handleFieldDrag}
          onMouseUp={handleFieldDragEnd}
          onMouseLeave={handleFieldDragEnd}
        >
          {/* Document Image/PDF would go here */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Document Preview
          </div>

          {/* Fields */}
          {fields
            .filter((field) => field.position.page === currentPage)
            .map((field) => {
              const signer = signers.find((s) => s.id === field.assigned_to)
              return (
                <div
                  key={field.id}
                  className={`absolute border-2 cursor-move ${selectedField === field.id ? 'border-blue-600' : 'border-gray-400'
                    } ${getSignerColor(field.assigned_to || '')} bg-opacity-20`}
                  style={{
                    left: `${field.position.x}%`,
                    top: `${field.position.y}%`,
                    width: `${field.position.width}%`,
                    height: `${field.position.height}%`,
                  }}
                  onMouseDown={(e) => handleFieldDragStart(e, field.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedField(field.id)
                  }}
                >
                  <div className="text-xs font-medium p-1 truncate">
                    {getFieldTypeLabel(field.type)} - {signer?.name || signer?.email}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

