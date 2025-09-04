import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignaturePadComponent } from '@/components/features/signature/signature-pad'

export default function Sign2Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advanced Signature</h1>
        <p className="text-gray-600">Create advanced digital signatures with custom settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Signature Creation</CardTitle>
            <CardDescription>
              Create your signature with advanced options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignaturePadComponent
              width={400}
              height={200}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signature Settings</CardTitle>
            <CardDescription>
              Configure your signature preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Style
                </label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>Handwritten</option>
                  <option>Typed</option>
                  <option>Drawn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Thickness
                </label>
                <input type="range" min="1" max="5" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input type="color" defaultValue="#000000" className="w-full h-10 border border-gray-300 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
