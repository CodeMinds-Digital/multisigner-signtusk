'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MousePointer, Type, Pen, Calendar, User } from 'lucide-react'

interface Marker {
  id: string
  type: 'signature' | 'text' | 'date' | 'initial'
  x: number
  y: number
  width: number
  height: number
  assignedTo?: string
}

export function DocumentMarker() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [selectedTool, setSelectedTool] = useState<string>('signature')
  const [isPlacing, setIsPlacing] = useState(false)

  const tools = [
    { id: 'signature', label: 'Signature', icon: Pen, color: 'bg-blue-500' },
    { id: 'text', label: 'Text', icon: Type, color: 'bg-green-500' },
    { id: 'date', label: 'Date', icon: Calendar, color: 'bg-purple-500' },
    { id: 'initial', label: 'Initial', icon: User, color: 'bg-orange-500' }
  ]

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacing) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newMarker: Marker = {
      id: Date.now().toString(),
      type: selectedTool as any,
      x,
      y,
      width: 120,
      height: 40,
      assignedTo: 'Signer 1'
    }

    setMarkers([...markers, newMarker])
    setIsPlacing(false)
  }

  const removeMarker = (id: string) => {
    setMarkers(markers.filter(marker => marker.id !== id))
  }

  const getMarkerColor = (type: string) => {
    const tool = tools.find(t => t.id === type)
    return tool?.color || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Marker</h1>
        <p className="text-gray-600">Add signature and form fields to your document</p>
      </div>

      <div className="flex gap-6">
        {/* Tools Panel */}
        <Card className="w-64 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Button
                  key={tool.id}
                  variant={selectedTool === tool.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedTool(tool.id)
                    setIsPlacing(true)
                  }}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tool.label}
                </Button>
              )
            })}
            
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full">
                <MousePointer className="w-4 h-4 mr-2" />
                Select
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Document Canvas */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="relative bg-white border-2 border-gray-300 rounded-lg min-h-[600px] cursor-crosshair"
              onClick={handleCanvasClick}
            >
              {/* Document background */}
              <div className="absolute inset-0 bg-gray-50 rounded-lg p-8">
                <div className="bg-white shadow-sm rounded p-6 h-full">
                  <h3 className="text-lg font-semibold mb-4">Sample Document</h3>
                  <p className="text-gray-600 mb-4">
                    This is a sample document where you can place signature fields and other form elements.
                  </p>
                  <p className="text-gray-600 mb-8">
                    Click on the tools in the left panel and then click on the document to place them.
                  </p>
                  
                  {/* Markers */}
                  {markers.map((marker) => (
                    <div
                      key={marker.id}
                      className={`absolute border-2 border-dashed ${getMarkerColor(marker.type)} bg-opacity-20 cursor-pointer group`}
                      style={{
                        left: marker.x,
                        top: marker.y,
                        width: marker.width,
                        height: marker.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeMarker(marker.id)
                      }}
                    >
                      <div className="flex items-center justify-center h-full text-xs font-medium">
                        {marker.type.toUpperCase()}
                      </div>
                      <div className="absolute -top-6 left-0 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {marker.assignedTo} - Click to remove
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {isPlacing && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Click on the document to place a {selectedTool} field
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <Card className="w-64 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>Signer 1</option>
                <option>Signer 2</option>
                <option>Approver</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required
              </label>
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">This field is required</span>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                Fields placed: {markers.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
