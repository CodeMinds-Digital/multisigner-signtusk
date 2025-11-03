'use client'

/**
 * Mobile Signature Pad Component
 * Optimized signature capture for mobile devices
 */

import { useRef, useState, useEffect } from 'react'

interface MobileSignaturePadProps {
  onSave: (signatureData: string) => void
  onCancel: () => void
}

export function MobileSignaturePad({ onSave, onCancel }: MobileSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
      }

      // Configure drawing context
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    updateCanvasSize()
    setContext(ctx)

    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (!context || !canvasRef.current) return

    setIsDrawing(true)
    setIsEmpty(false)

    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    context.beginPath()
    context.moveTo(x, y)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !context || !canvasRef.current) return

    e.preventDefault()

    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    context.lineTo(x, y)
    context.stroke()
  }

  const stopDrawing = () => {
    if (!context) return
    setIsDrawing(false)
    context.closePath()
  }

  const clear = () => {
    if (!context || !canvasRef.current) return
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setIsEmpty(true)
  }

  const save = () => {
    if (!canvasRef.current || isEmpty) return

    // Convert canvas to data URL
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Sign Document</h2>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <p className="text-sm text-blue-800">
          Sign in the box below using your finger or stylus
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-gray-100 p-4">
        <div className="h-full bg-white border-2 border-dashed border-gray-300 rounded-lg relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-lg">Sign here</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-4">
        <div className="flex gap-3">
          <button
            onClick={clear}
            disabled={isEmpty}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
          <button
            onClick={save}
            disabled={isEmpty}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Signature
          </button>
        </div>
      </div>

      {/* Orientation Hint for Mobile */}
      <div className="md:hidden bg-yellow-50 border-t border-yellow-200 px-4 py-2">
        <p className="text-xs text-yellow-800 text-center">
          💡 Tip: Rotate your device to landscape for a better signing experience
        </p>
      </div>
    </div>
  )
}

