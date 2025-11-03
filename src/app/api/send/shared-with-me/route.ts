import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redis, RedisUtils, CACHE_TTL } from '@/lib/upstash-config'

/**
 * GET /api/send/shared-with-me
 * Get documents and data rooms shared with the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const type = searchParams.get('type') || 'all' // all, documents, datarooms
    const status = searchParams.get('status') || 'all' // all, unread, read
    const sortBy = searchParams.get('sortBy') || 'shared_at' // shared_at, name, expires_at
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required', errorCode: 'EMAIL_REQUIRED' },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `shared-with-me:${email}:${type}:${status}:${sortBy}:${sortOrder}:${page}`
    const cached = await RedisUtils.get<any>(cacheKey)
    
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true
      })
    }

    // Get shared documents
    let documents: any[] = []
    if (type === 'all' || type === 'documents') {
      // Get documents via email verifications
      const { data: verifications } = await supabaseAdmin
        .from('send_email_verifications')
        .select(`
          *,
          link:send_document_links!inner(
            id,
            link_id,
            title,
            expires_at,
            is_active,
            allow_download,
            created_at,
            document:send_shared_documents(
              id,
              title,
              file_name,
              file_type,
              file_size,
              thumbnail_url
            )
          )
        `)
        .eq('email', email)
        .eq('verified', true)

      if (verifications) {
        documents = verifications.map((v: any) => ({
          id: v.link.id,
          type: 'document',
          linkId: v.link.link_id,
          name: v.link.title || v.link.document?.title,
          fileName: v.link.document?.file_name,
          fileType: v.link.document?.file_type,
          fileSize: v.link.document?.file_size,
          thumbnailUrl: v.link.document?.thumbnail_url,
          sharedAt: v.verified_at,
          expiresAt: v.link.expires_at,
          isActive: v.link.is_active,
          allowDownload: v.link.allow_download,
          isRead: v.last_accessed_at !== null,
          lastAccessedAt: v.last_accessed_at
        }))
      }

      // Also get documents from view records
      const { data: views } = await supabaseAdmin
        .from('send_document_views')
        .select(`
          *,
          link:send_document_links!inner(
            id,
            link_id,
            title,
            expires_at,
            is_active,
            allow_download,
            created_at,
            document:send_shared_documents(
              id,
              title,
              file_name,
              file_type,
              file_size,
              thumbnail_url
            )
          )
        `)
        .eq('viewer_email', email)

      if (views) {
        const viewDocs = views.map((v: any) => ({
          id: v.link.id,
          type: 'document',
          linkId: v.link.link_id,
          name: v.link.title || v.link.document?.title,
          fileName: v.link.document?.file_name,
          fileType: v.link.document?.file_type,
          fileSize: v.link.document?.file_size,
          thumbnailUrl: v.link.document?.thumbnail_url,
          sharedAt: v.first_viewed_at,
          expiresAt: v.link.expires_at,
          isActive: v.link.is_active,
          allowDownload: v.link.allow_download,
          isRead: true,
          lastAccessedAt: v.last_viewed_at
        }))

        // Merge and deduplicate
        const existingIds = new Set(documents.map(d => d.id))
        viewDocs.forEach(doc => {
          if (!existingIds.has(doc.id)) {
            documents.push(doc)
          }
        })
      }
    }

    // Get shared data rooms
    let datarooms: any[] = []
    if (type === 'all' || type === 'datarooms') {
      // Get data rooms via email verifications
      const { data: drVerifications } = await supabaseAdmin
        .from('send_email_verifications')
        .select(`
          *,
          dataroom_link:send_dataroom_links!inner(
            id,
            slug,
            name,
            expires_at,
            is_active,
            download_enabled,
            created_at,
            data_room:send_data_rooms(
              id,
              name,
              description
            )
          )
        `)
        .eq('email', email)
        .eq('verified', true)
        .not('dataroom_link', 'is', null)

      if (drVerifications) {
        datarooms = drVerifications.map((v: any) => ({
          id: v.dataroom_link.id,
          type: 'dataroom',
          slug: v.dataroom_link.slug,
          name: v.dataroom_link.name || v.dataroom_link.data_room?.name,
          description: v.dataroom_link.data_room?.description,
          sharedAt: v.verified_at,
          expiresAt: v.dataroom_link.expires_at,
          isActive: v.dataroom_link.is_active,
          allowDownload: v.dataroom_link.download_enabled,
          isRead: v.last_accessed_at !== null,
          lastAccessedAt: v.last_accessed_at
        }))
      }
    }

    // Combine and filter
    let items = [...documents, ...datarooms]

    // Filter by status
    if (status === 'unread') {
      items = items.filter(item => !item.isRead)
    } else if (status === 'read') {
      items = items.filter(item => item.isRead)
    }

    // Sort
    items.sort((a, b) => {
      const aVal = a[sortBy] || ''
      const bVal = b[sortBy] || ''
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Paginate
    const total = items.length
    const paginatedItems = items.slice(offset, offset + limit)

    const response = {
      success: true,
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalDocuments: documents.length,
        totalDatarooms: datarooms.length,
        unreadCount: items.filter(i => !i.isRead).length
      }
    }

    // Cache for 5 minutes
    await RedisUtils.setWithTTL(cacheKey, response, CACHE_TTL.ANALYTICS)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Shared with me error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shared items', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

