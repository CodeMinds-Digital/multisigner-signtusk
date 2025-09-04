import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function PendingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Documents</h1>
        <p className="text-gray-600">Documents waiting for signatures</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Signatures</CardTitle>
          <CardDescription>
            Documents that are waiting for signatures from recipients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending documents</h3>
            <p className="text-gray-500">
              Documents awaiting signatures will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
