import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/documents/[id]/tags - Get document tags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify document belongs to user
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get document tags
    const { data: documentTags, error } = await supabaseAdmin
      .from('send_document_tags')
      .select(`
        *,
        tag:send_tags(
          id, name, description, color, icon,
          group:send_tag_groups(id, name, color)
        )
      `)
      .eq('document_id', id)
      .order('assigned_at', { ascending: true })

    if (error) {
      console.error('Error fetching document tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document_tags: documentTags || []
    })

  } catch (error) {
    console.error('Get document tags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/documents/[id]/tags - Assign tags to document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify document belongs to user
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { tag_ids, replace_all = false } = body

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return NextResponse.json(
        { error: 'tag_ids array is required' },
        { status: 400 }
      )
    }

    // Verify all tags belong to user or are system tags
    const { data: tags, error: tagsError } = await supabaseAdmin
      .from('send_tags')
      .select('id')
      .in('id', tag_ids)
      .or(`user_id.eq.${userId},is_system.eq.true`)

    if (tagsError || !tags || tags.length !== tag_ids.length) {
      return NextResponse.json(
        { error: 'One or more tags not found' },
        { status: 404 }
      )
    }

    // If replace_all is true, remove existing tags first
    if (replace_all) {
      const { error: deleteError } = await supabaseAdmin
        .from('send_document_tags')
        .delete()
        .eq('document_id', id)

      if (deleteError) {
        console.error('Error removing existing tags:', deleteError)
        return NextResponse.json(
          { error: 'Failed to remove existing tags' },
          { status: 500 }
        )
      }
    }

    // Assign new tags
    const tagAssignments = tag_ids.map(tagId => ({
      document_id: id,
      tag_id: tagId,
      assigned_by: userId
    }))

    const { data: assignedTags, error: assignError } = await supabaseAdmin
      .from('send_document_tags')
      .upsert(tagAssignments, {
        onConflict: 'document_id,tag_id',
        ignoreDuplicates: true
      })
      .select(`
        *,
        tag:send_tags(
          id, name, description, color, icon,
          group:send_tag_groups(id, name, color)
        )
      `)

    if (assignError) {
      console.error('Error assigning tags:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assigned_tags: assignedTags || [],
      count: assignedTags?.length || 0
    })

  } catch (error) {
    console.error('Assign document tags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/documents/[id]/tags - Remove tags from document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify document belongs to user
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tagIds = searchParams.get('tag_ids')?.split(',') || []
    const removeAll = searchParams.get('remove_all') === 'true'

    if (!removeAll && tagIds.length === 0) {
      return NextResponse.json(
        { error: 'tag_ids or remove_all parameter is required' },
        { status: 400 }
      )
    }

    // Build delete query
    let deleteQuery = supabaseAdmin
      .from('send_document_tags')
      .delete()
      .eq('document_id', id)

    if (!removeAll) {
      deleteQuery = deleteQuery.in('tag_id', tagIds)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error removing document tags:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Remove document tags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
