import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/resources - Get all folders and documents in data room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id, folder_structure')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    // Get all documents in the data room
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('send_data_room_documents')
      .select(`
        document_id,
        folder_path,
        document:send_shared_documents(
          id,
          title,
          file_name
        )
      `)
      .eq('data_room_id', roomId)

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // Build resources list
    const resources = []
    const folderSet = new Set<string>()

    // Add documents
    if (documents) {
      for (const doc of documents) {
        if (doc.document) {
          const document = doc.document as any
          resources.push({
            id: document.id,
            name: document.title || document.file_name,
            type: 'document',
            path: doc.folder_path || '/'
          })

          // Track folders
          if (doc.folder_path && doc.folder_path !== '/') {
            const pathParts = doc.folder_path.split('/').filter(Boolean)
            let currentPath = ''
            for (const part of pathParts) {
              currentPath += '/' + part
              folderSet.add(currentPath)
            }
          }
        }
      }
    }

    // Add folders from folder structure
    if (dataroom.folder_structure) {
      const addFoldersFromStructure = (structure: any, basePath = '') => {
        for (const [key, value] of Object.entries(structure)) {
          if (key !== '/' && typeof value === 'object' && value !== null) {
            const folderPath = basePath + '/' + key
            folderSet.add(folderPath)

            // Recursively add subfolders
            if ((value as any).subfolders) {
              addFoldersFromStructure((value as any).subfolders, folderPath)
            }
          }
        }
      }

      addFoldersFromStructure(dataroom.folder_structure)
    }

    // Add folders to resources
    for (const folderPath of folderSet) {
      const folderName = folderPath.split('/').pop() || 'Root'
      resources.push({
        id: `folder:${folderPath}`,
        name: folderName,
        type: 'folder',
        path: folderPath
      })
    }

    // Add root folder
    resources.push({
      id: 'folder:/',
      name: 'Root Folder',
      type: 'folder',
      path: '/'
    })

    // Sort resources: folders first, then documents, alphabetically within each type
    resources.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      resources
    })

  } catch (error: any) {
    console.error('Get resources error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
