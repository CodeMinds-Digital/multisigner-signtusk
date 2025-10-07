import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BulkLinkResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
  links: any[]
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
    const { operation, linkIds, documentIds, linkSettings, data } = body

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation is required' },
        { status: 400 }
      )
    }

    let result: BulkLinkResult

    switch (operation) {
      case 'create':
        if (!documentIds || !Array.isArray(documentIds)) {
          return NextResponse.json(
            { error: 'documentIds array is required for create operation' },
            { status: 400 }
          )
        }
        result = await bulkCreateLinks(documentIds, userId, linkSettings)
        break
      
      case 'delete':
        if (!linkIds || !Array.isArray(linkIds)) {
          return NextResponse.json(
            { error: 'linkIds array is required for delete operation' },
            { status: 400 }
          )
        }
        result = await bulkDeleteLinks(linkIds, userId)
        break
      
      case 'update':
        if (!linkIds || !Array.isArray(linkIds)) {
          return NextResponse.json(
            { error: 'linkIds array is required for update operation' },
            { status: 400 }
          )
        }
        result = await bulkUpdateLinks(linkIds, userId, data)
        break
      
      case 'expire':
        if (!linkIds || !Array.isArray(linkIds)) {
          return NextResponse.json(
            { error: 'linkIds array is required for expire operation' },
            { status: 400 }
          )
        }
        result = await bulkExpireLinks(linkIds, userId)
        break
      
      case 'extend':
        if (!linkIds || !Array.isArray(linkIds)) {
          return NextResponse.json(
            { error: 'linkIds array is required for extend operation' },
            { status: 400 }
          )
        }
        result = await bulkExtendLinks(linkIds, userId, data.expiresAt)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Bulk link operation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function bulkCreateLinks(documentIds: string[], userId: string, linkSettings: any): Promise<BulkLinkResult> {
  const result: BulkLinkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    links: []
  }

  // Verify all documents belong to the user
  const { data: userDocuments, error: verifyError } = await supabaseAdmin
    .from('send_shared_documents')
    .select('id, title')
    .eq('user_id', userId)
    .in('id', documentIds)

  if (verifyError) {
    result.success = false
    result.failed = documentIds.length
    result.errors.push('Failed to verify document ownership')
    return result
  }

  const ownedDocuments = userDocuments || []
  const ownedDocumentIds = ownedDocuments.map(doc => doc.id)
  const unauthorizedIds = documentIds.filter(id => !ownedDocumentIds.includes(id))

  if (unauthorizedIds.length > 0) {
    result.success = false
    result.failed = unauthorizedIds.length
    result.errors.push(`Unauthorized access to documents: ${unauthorizedIds.join(', ')}`)
  }

  // Create links for owned documents
  for (const document of ownedDocuments) {
    try {
      const linkData = {
        document_id: document.id,
        user_id: userId,
        name: linkSettings?.name || `${document.title} - Shared Link`,
        slug: `${document.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        password_protected: linkSettings?.password_protected || false,
        password: linkSettings?.password || null,
        expires_at: linkSettings?.expires_at || null,
        allow_download: linkSettings?.allow_download !== false,
        allow_print: linkSettings?.allow_print !== false,
        watermark_enabled: linkSettings?.watermark_enabled || false,
        screenshot_protection: linkSettings?.screenshot_protection || false,
        email_required: linkSettings?.email_required || false,
        email_verification_required: linkSettings?.email_verification_required || false,
        nda_required: linkSettings?.nda_required || false,
        view_limit: linkSettings?.view_limit || null,
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
      result.links.push({
        ...link,
        document_title: document.title,
        share_url: `/v/${link.slug}`
      })
    } catch (error) {
      result.failed++
      result.errors.push(`Failed to create link for document ${document.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  result.success = result.failed === 0
  return result
}

async function bulkDeleteLinks(linkIds: string[], userId: string): Promise<BulkLinkResult> {
  const result: BulkLinkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    links: []
  }

  try {
    // Verify ownership and delete
    const { data: deletedLinks, error } = await supabaseAdmin
      .from('send_document_links')
      .delete()
      .eq('user_id', userId)
      .in('id', linkIds)
      .select('id, slug, name')

    if (error) throw error

    result.processed = deletedLinks?.length || 0
    result.links = deletedLinks || []

    if (result.processed < linkIds.length) {
      result.failed = linkIds.length - result.processed
      result.errors.push(`Some links could not be deleted (unauthorized or not found)`)
    }
  } catch (error) {
    result.success = false
    result.failed = linkIds.length
    result.errors.push(`Bulk delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkUpdateLinks(linkIds: string[], userId: string, updateData: any): Promise<BulkLinkResult> {
  const result: BulkLinkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    links: []
  }

  try {
    const { data: updatedLinks, error } = await supabaseAdmin
      .from('send_document_links')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('id', linkIds)
      .select()

    if (error) throw error

    result.processed = updatedLinks?.length || 0
    result.links = updatedLinks || []

    if (result.processed < linkIds.length) {
      result.failed = linkIds.length - result.processed
      result.errors.push(`Some links could not be updated (unauthorized or not found)`)
    }
  } catch (error) {
    result.success = false
    result.failed = linkIds.length
    result.errors.push(`Bulk update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkExpireLinks(linkIds: string[], userId: string): Promise<BulkLinkResult> {
  const result: BulkLinkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    links: []
  }

  try {
    const { data: expiredLinks, error } = await supabaseAdmin
      .from('send_document_links')
      .update({
        expires_at: new Date().toISOString(), // Set to current time to expire immediately
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('id', linkIds)
      .select()

    if (error) throw error

    result.processed = expiredLinks?.length || 0
    result.links = expiredLinks || []

    if (result.processed < linkIds.length) {
      result.failed = linkIds.length - result.processed
      result.errors.push(`Some links could not be expired (unauthorized or not found)`)
    }
  } catch (error) {
    result.success = false
    result.failed = linkIds.length
    result.errors.push(`Bulk expire failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

async function bulkExtendLinks(linkIds: string[], userId: string, expiresAt: string): Promise<BulkLinkResult> {
  const result: BulkLinkResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    links: []
  }

  try {
    const { data: extendedLinks, error } = await supabaseAdmin
      .from('send_document_links')
      .update({
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('id', linkIds)
      .select()

    if (error) throw error

    result.processed = extendedLinks?.length || 0
    result.links = extendedLinks || []

    if (result.processed < linkIds.length) {
      result.failed = linkIds.length - result.processed
      result.errors.push(`Some links could not be extended (unauthorized or not found)`)
    }
  } catch (error) {
    result.success = false
    result.failed = linkIds.length
    result.errors.push(`Bulk extend failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}
