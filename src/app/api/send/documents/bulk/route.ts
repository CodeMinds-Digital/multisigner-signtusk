import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
  results: any[]
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const body = await request.json()
    const { operation, documentIds, data } = body

    if (!operation || !documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: 'Invalid request. Operation and documentIds are required.' },
        { status: 400 }
      )
    }

    // Verify all documents belong to the user
    const { data: userDocuments, error: verifyError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('user_id', userId)
      .in('id', documentIds)

    if (verifyError) {
      return NextResponse.json(
        { error: 'Failed to verify document ownership' },
        { status: 500 }
      )
    }

    const ownedDocumentIds = userDocuments?.map(doc => doc.id) || []
    const unauthorizedIds = documentIds.filter(id => !ownedDocumentIds.includes(id))

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: `Unauthorized access to documents: ${unauthorizedIds.join(', ')}` },
        { status: 403 }
      )
    }

    let result: BulkOperationResult

    switch (operation) {
      case 'delete':
        result = await bulkDeleteDocuments(documentIds, userId)
        break
      case 'archive':
        result = await bulkArchiveDocuments(documentIds, userId)
        break
      case 'restore':
        result = await bulkRestoreDocuments(documentIds, userId)
        break
      case 'share':
        result = await bulkShareDocuments(documentIds, userId, data)
        break
      case 'move_to_folder':
        result = await bulkMoveToFolder(documentIds, userId, data.folderId)
        break
      case 'add_tags':
        result = await bulkAddTags(documentIds, userId, data.tagIds)
        break
      case 'remove_tags':
        result = await bulkRemoveTags(documentIds, userId, data.tagIds)
        break
      case 'update_status':
        result = await bulkUpdateStatus(documentIds, userId, data.status)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function bulkDeleteDocuments(documentIds: string[], userId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  for (const documentId of documentIds) {
    try {
      // Delete associated links first
      await supabaseAdmin
        .from('send_document_links')
        .delete()
        .eq('document_id', documentId)

      // Delete document views
      await supabaseAdmin
        .from('send_document_views')
        .delete()
        .eq('document_id', documentId)

      // Delete the document
      const { error } = await supabaseAdmin
        .from('send_shared_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) throw error

      result.processed++
      result.results.push({ documentId, status: 'deleted' })
    } catch (error) {
      result.failed++
      result.errors.push(`Failed to delete document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.results.push({ documentId, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  result.success = result.failed === 0
  return result
}

async function bulkArchiveDocuments(documentIds: string[], userId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('send_shared_documents')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', documentIds)
      .select('id')

    if (error) throw error

    result.processed = data?.length || 0
    result.results = data?.map(doc => ({ documentId: doc.id, status: 'archived' })) || []
  } catch (error) {
    result.success = false
    result.failed = documentIds.length
    result.errors.push(`Bulk archive failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkRestoreDocuments(documentIds: string[], userId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('send_shared_documents')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', documentIds)
      .select('id')

    if (error) throw error

    result.processed = data?.length || 0
    result.results = data?.map(doc => ({ documentId: doc.id, status: 'restored' })) || []
  } catch (error) {
    result.success = false
    result.failed = documentIds.length
    result.errors.push(`Bulk restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkShareDocuments(documentIds: string[], userId: string, shareData: any): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  for (const documentId of documentIds) {
    try {
      // Create share link for each document
      const linkData = {
        document_id: documentId,
        user_id: userId,
        name: shareData.name || `Shared Link`,
        slug: `${documentId}-${Date.now()}`,
        password_protected: shareData.password_protected || false,
        password: shareData.password || null,
        expires_at: shareData.expires_at || null,
        allow_download: shareData.allow_download !== false,
        allow_print: shareData.allow_print !== false,
        watermark_enabled: shareData.watermark_enabled || false,
        screenshot_protection: shareData.screenshot_protection || false,
        email_required: shareData.email_required || false,
        email_verification_required: shareData.email_verification_required || false,
        nda_required: shareData.nda_required || false,
        view_limit: shareData.view_limit || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: link, error } = await supabaseAdmin
        .from('send_document_links')
        .insert(linkData)
        .select()
        .single()

      if (error) throw error

      result.processed++
      result.results.push({ 
        documentId, 
        status: 'shared', 
        linkId: link.id,
        shareUrl: `/v/${link.slug}`
      })
    } catch (error) {
      result.failed++
      result.errors.push(`Failed to share document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.results.push({ documentId, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  result.success = result.failed === 0
  return result
}

async function bulkMoveToFolder(documentIds: string[], userId: string, folderId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('send_shared_documents')
      .update({ folder_id: folderId, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', documentIds)
      .select('id')

    if (error) throw error

    result.processed = data?.length || 0
    result.results = data?.map(doc => ({ documentId: doc.id, status: 'moved', folderId })) || []
  } catch (error) {
    result.success = false
    result.failed = documentIds.length
    result.errors.push(`Bulk move failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkAddTags(documentIds: string[], userId: string, tagIds: string[]): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  for (const documentId of documentIds) {
    for (const tagId of tagIds) {
      try {
        await supabaseAdmin
          .from('send_document_tags')
          .upsert({
            document_id: documentId,
            tag_id: tagId,
            created_at: new Date().toISOString()
          })

        result.processed++
      } catch (error) {
        result.failed++
        result.errors.push(`Failed to add tag ${tagId} to document ${documentId}`)
      }
    }
  }

  result.success = result.failed === 0
  return result
}

async function bulkRemoveTags(documentIds: string[], userId: string, tagIds: string[]): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  try {
    const { error } = await supabaseAdmin
      .from('send_document_tags')
      .delete()
      .in('document_id', documentIds)
      .in('tag_id', tagIds)

    if (error) throw error

    result.processed = documentIds.length * tagIds.length
    result.results = [{ status: 'tags_removed', documentIds, tagIds }]
  } catch (error) {
    result.success = false
    result.failed = documentIds.length * tagIds.length
    result.errors.push(`Bulk tag removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkUpdateStatus(documentIds: string[], userId: string, status: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: []
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('send_shared_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', documentIds)
      .select('id')

    if (error) throw error

    result.processed = data?.length || 0
    result.results = data?.map(doc => ({ documentId: doc.id, status: 'updated', newStatus: status })) || []
  } catch (error) {
    result.success = false
    result.failed = documentIds.length
    result.errors.push(`Bulk status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}
