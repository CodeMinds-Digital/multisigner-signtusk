import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function ExpiredPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expired Documents</h1>
        <p className="text-gray-600">Documents that have passed their due date</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expired Documents</CardTitle>
          <CardDescription>
            Documents that have exceeded their signature deadline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expired documents</h3>
            <p className="text-gray-500">
              Expired documents will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
