'use client'

import { useRef, useEffect, useState } from 'react'
import SignaturePad from 'signature_pad'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SignaturePadComponentProps {
  onSignatureChange?: (signature: string) => void
  initialSignature?: string
  width?: number
  height?: number
  disabled?: boolean
}

export function SignaturePadComponent({
  onSignatureChange,
  initialSignature,
  width = 400,
  height = 200,
  disabled = false
}: SignaturePadComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        velocityFilterWeight: 0.7,
        minWidth: 0.5,
        maxWidth: 2.5,
        throttle: 16,
        minDistance: 5,
      })

      signaturePadRef.current = signaturePad

      // Set canvas size
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.getContext('2d')!.scale(ratio, ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Load initial signature if provided
      if (initialSignature) {
        signaturePad.fromDataURL(initialSignature)
        setIsEmpty(false)
      }

      // Set up event handlers
      const handleBeginStroke = () => {
        // This is called when the user starts drawing
      }

      const handleEndStroke = () => {
        const dataURL = signaturePad.toDataURL('image/png')
        setIsEmpty(signaturePad.isEmpty())
        if (onSignatureChange && !signaturePad.isEmpty()) {
          onSignatureChange(dataURL)
        }
      }

      signaturePad.addEventListener('beginStroke', handleBeginStroke)
      signaturePad.addEventListener('endStroke', handleEndStroke)

      // Disable if needed
      if (disabled) {
        signaturePad.off()
      } else {
        signaturePad.on()
      }

      return () => {
        signaturePad.removeEventListener('beginStroke', handleBeginStroke)
        signaturePad.removeEventListener('endStroke', handleEndStroke)
        signaturePad.off()
      }
    }
  }, [width, height, initialSignature, onSignatureChange, disabled])

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear()
      setIsEmpty(true)
      if (onSignatureChange) {
        onSignatureChange('')
      }
    }
  }


  return (
    <Card className="w-fit">
      <CardHeader>
        <CardTitle className="text-lg">Digital Signature</CardTitle>
        <CardDescription>
          {disabled ? 'Signature preview' : 'Sign in the box below'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <canvas
            ref={canvasRef}
            className="border border-gray-200 rounded bg-white cursor-crosshair"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              cursor: disabled ? 'default' : 'crosshair'
            }}
          />
        </div>

        {!disabled && (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={clearSignature}
              disabled={isEmpty}
            >
              Clear
            </Button>
            <p className="text-sm text-gray-500">
              {isEmpty ? 'Please sign above' : 'Signature captured'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
