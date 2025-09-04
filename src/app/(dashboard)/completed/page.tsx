import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function CompletedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Completed Documents</h1>
        <p className="text-gray-600">Documents that have been fully signed</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Signatures</CardTitle>
          <CardDescription>
            Documents that have been successfully signed by all parties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No completed documents</h3>
            <p className="text-gray-500">
              Completed documents will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
