'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Plus,
  Folder,
  FileText,
  Users,
  Eye,
  Settings,
  Share2,
  Download,
  Calendar,
  Palette,
  UserPlus,
  Rocket
} from 'lucide-react'
import Link from 'next/link'
import { DataRoomDocumentManager } from '@/components/features/send/data-rooms/data-room-document-manager'
import { UserGroupManager } from '@/components/features/send/data-rooms/user-group-manager'
import { PermissionManager } from '@/components/features/send/data-rooms/permission-manager'
import { GroupShareLinks } from '@/components/features/send/data-rooms/group-share-links'
import { BrandingManager } from '@/components/features/send/data-rooms/branding-manager'
import { CollaboratorManager } from '@/components/features/send/data-rooms/collaborator-manager'
import { AdvancedAnalytics } from '@/components/features/send/data-rooms/advanced-analytics'
import { WorkflowManager } from '@/components/features/send/data-rooms/workflow-manager'
import { DataRoomShareModal } from '@/components/features/send/data-rooms/data-room-share-modal'

interface DataRoom {
  id: string
  name: string
  description: string
  folder_structure: any
  is_active: boolean
  created_at: string
  updated_at: string
  documents: Array<{
    id: string
    document_id: string
    folder_path: string
    sort_order: number
    added_at: string
    document: {
      id: string
      title: string
      file_name: string
      file_size: number
      file_type: string
      created_at: string
    }
  }>
}

export default function DataRoomDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [dataRoom, setDataRoom] = useState<DataRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    if (roomId) {
      fetchDataRoom()
    }
  }, [roomId])

  const fetchDataRoom = async () => {
    try {
      const response = await fetch(`/api/send/data-rooms/${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setDataRoom(data.dataRoom)
      } else {
        setError('Data room not found')
      }
    } catch (error) {
      console.error('Failed to fetch data room:', error)
      setError('Failed to load data room')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !dataRoom) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Data Room Not Found</h3>
          <p className="text-gray-600 mb-6">{error || 'The requested data room could not be found.'}</p>
          <Button asChild>
            <Link href="/send/data-rooms">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Data Rooms
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/send/data-rooms">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Data Rooms
          </Link>
        </Button>
      </div>

      {/* Data Room Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Folder className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {dataRoom.name}
              {!dataRoom.is_active && (
                <Badge variant="secondary">Archived</Badge>
              )}
            </h1>
            {dataRoom.description && (
              <p className="text-gray-600 mt-1">{dataRoom.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/send/data-rooms/${roomId}/settings`}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Data Room
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold">{dataRoom.documents?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(dataRoom.documents?.reduce((sum, doc) => sum + (doc.document.file_size || 0), 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-2xl font-bold">{formatDate(dataRoom.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Groups
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="group-links" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Group Links
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Collaborators
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DataRoomDocumentManager
            dataRoomId={roomId}
            documents={dataRoom.documents || []}
            onDocumentsChange={fetchDataRoom}
          />
        </TabsContent>

        <TabsContent value="groups">
          <UserGroupManager dataRoomId={roomId} />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionManager dataRoomId={roomId} />
        </TabsContent>

        <TabsContent value="group-links">
          <GroupShareLinks dataRoomId={roomId} />
        </TabsContent>

        <TabsContent value="branding">
          <BrandingManager dataRoomId={roomId} />
        </TabsContent>

        <TabsContent value="collaborators">
          <CollaboratorManager dataRoomId={roomId} />
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowManager dataRoomId={roomId} />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedAnalytics dataRoomId={roomId} />
        </TabsContent>
        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
            <CardDescription>
              Detailed analytics and insights for your data room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
              <p className="text-gray-500">
                Advanced analytics dashboard with geographic insights, session tracking, and engagement scoring
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      {/* Share Modal */ }
  {
    showShareModal && (
      <DataRoomShareModal
        dataRoom={dataRoom}
        onClose={() => setShowShareModal(false)}
      />
    )
  }
    </div >
  )
}
