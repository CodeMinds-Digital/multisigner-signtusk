'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Download, Upload } from 'lucide-react'

interface SignaturePadProps {
    onSave: (signatureData: string) => void
    onCancel: () => void
    width?: number
    height?: number
    existingSignature?: string
}

export default function SignaturePad({
    onSave,
    onCancel,
    width = 400,
    height = 200,
    existingSignature
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isEmpty, setIsEmpty] = useState(true)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        canvas.width = width
        canvas.height = height

        // Set drawing styles
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Load existing signature if provided
        if (existingSignature) {
            const img = new Image()
            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height)
                setIsEmpty(false)
            }
            img.src = existingSignature
        }
    }, [width, height, existingSignature])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        setIsDrawing(true)
        setIsEmpty(false)
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setIsEmpty(true)
    }

    const saveSignature = () => {
        const canvas = canvasRef.current
        if (!canvas || isEmpty) return

        const signatureData = canvas.toDataURL('image/png')
        onSave(signatureData)
    }

    const downloadSignature = () => {
        const canvas = canvasRef.current
        if (!canvas || isEmpty) return

        const link = document.createElement('a')
        link.download = 'signature.png'
        link.href = canvas.toDataURL()
        link.click()
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
                const canvas = canvasRef.current
                if (!canvas) return

                const ctx = canvas.getContext('2d')
                if (!ctx) return

                // Clear canvas and draw uploaded image
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0, width, height)
                setIsEmpty(false)
            }
            img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Create Your Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <canvas
                        ref={canvasRef}
                        className="border border-gray-200 rounded cursor-crosshair bg-white"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                    />
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        Draw your signature above or upload an image
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                        disabled={isEmpty}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadSignature}
                        disabled={isEmpty}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </Button>

                    <label className="inline-flex">
                        <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>

                <div className="flex space-x-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={saveSignature}
                        disabled={isEmpty}
                        className="flex-1"
                    >
                        Save Signature
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}