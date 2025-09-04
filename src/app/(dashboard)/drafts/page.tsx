import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { File } from 'lucide-react'

export default function DraftsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Draft Documents</h1>
        <p className="text-gray-600">Documents saved as drafts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Draft Documents</CardTitle>
          <CardDescription>
            Documents that are saved but not yet sent for signature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <File className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No draft documents</h3>
            <p className="text-gray-500">
              Draft documents will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
