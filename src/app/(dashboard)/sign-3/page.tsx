import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Type, Pen } from 'lucide-react'

export default function Sign3Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Signature Options</h1>
        <p className="text-gray-600">Choose how you want to create your signature</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Pen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <CardTitle>Draw Signature</CardTitle>
            <CardDescription>
              Draw your signature using mouse or touch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Start Drawing
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Type className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Type Signature</CardTitle>
            <CardDescription>
              Type your name and choose a font style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Type Name
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Upload className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>
              Upload an image of your signature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Upload File
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signature Preview</CardTitle>
          <CardDescription>
            Your signature will appear here once created
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">No signature created yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
