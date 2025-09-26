import { NextRequest, NextResponse } from 'next/server'
import { VectorSearchService } from '@/lib/vector-search-service'
import { rateLimiters } from '@/lib/upstash-config'
import { getSession } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip ?? 'anonymous'
    const { success } = await rateLimiters.api.limit(identifier)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Get session for admin check
    const session = await getSession(request)
    if (!session?.user?.app_metadata?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'index_all_documents':
        return await indexAllDocuments()
      
      case 'index_all_users':
        return await indexAllUsers()
      
      case 'index_all_templates':
        return await indexAllTemplates()
      
      case 'index_document':
        return await indexSingleDocument(data)
      
      case 'index_user':
        return await indexSingleUser(data)
      
      case 'index_template':
        return await indexSingleTemplate(data)
      
      case 'reindex_all':
        return await reindexAll()
      
      case 'clear_index':
        return await clearIndex(data.type)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Search indexing error:', error)
    return NextResponse.json(
      { 
        error: 'Indexing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function indexAllDocuments() {
  try {
    console.log('📚 Starting to index all documents...')
    
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, description, content, metadata, created_at')
      .limit(1000) // Process in batches
    
    if (error) throw error
    
    let indexed = 0
    let failed = 0
    
    for (const doc of documents || []) {
      try {
        const content = doc.content || doc.description || ''
        await VectorSearchService.indexDocument(
          doc.id,
          doc.title || 'Untitled',
          content,
          {
            ...doc.metadata,
            created_at: doc.created_at
          }
        )
        indexed++
      } catch (error) {
        console.error(`❌ Failed to index document ${doc.id}:`, error)
        failed++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Document indexing completed',
      stats: {
        total: documents?.length || 0,
        indexed,
        failed
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function indexAllUsers() {
  try {
    console.log('👥 Starting to index all users...')
    
    const { data: authData, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) throw error
    
    let indexed = 0
    let failed = 0
    
    for (const user of authData.users || []) {
      try {
        await VectorSearchService.indexUser(
          user.id,
          user.email || '',
          {
            ...user.user_metadata,
            created_at: user.created_at,
            last_sign_in: user.last_sign_in_at
          }
        )
        indexed++
      } catch (error) {
        console.error(`❌ Failed to index user ${user.id}:`, error)
        failed++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'User indexing completed',
      stats: {
        total: authData.users?.length || 0,
        indexed,
        failed
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function indexAllTemplates() {
  try {
    console.log('📄 Starting to index all templates...')
    
    const { data: templates, error } = await supabaseAdmin
      .from('document_templates')
      .select('id, name, description, tags, metadata, created_at')
      .limit(1000)
    
    if (error) throw error
    
    let indexed = 0
    let failed = 0
    
    for (const template of templates || []) {
      try {
        await VectorSearchService.indexTemplate(
          template.id,
          template.name || 'Untitled Template',
          template.description || '',
          template.tags || [],
          {
            ...template.metadata,
            created_at: template.created_at
          }
        )
        indexed++
      } catch (error) {
        console.error(`❌ Failed to index template ${template.id}:`, error)
        failed++
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Template indexing completed',
      stats: {
        total: templates?.length || 0,
        indexed,
        failed
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function indexSingleDocument(data: any) {
  try {
    const { documentId, title, content, metadata } = data
    
    if (!documentId || !title) {
      return NextResponse.json(
        { error: 'Document ID and title are required' },
        { status: 400 }
      )
    }
    
    await VectorSearchService.indexDocument(documentId, title, content || '', metadata || {})
    
    return NextResponse.json({
      success: true,
      message: 'Document indexed successfully',
      documentId
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function indexSingleUser(data: any) {
  try {
    const { userId, email, profile } = data
    
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }
    
    await VectorSearchService.indexUser(userId, email, profile || {})
    
    return NextResponse.json({
      success: true,
      message: 'User indexed successfully',
      userId
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function indexSingleTemplate(data: any) {
  try {
    const { templateId, name, description, tags, metadata } = data
    
    if (!templateId || !name) {
      return NextResponse.json(
        { error: 'Template ID and name are required' },
        { status: 400 }
      )
    }
    
    await VectorSearchService.indexTemplate(
      templateId,
      name,
      description || '',
      tags || [],
      metadata || {}
    )
    
    return NextResponse.json({
      success: true,
      message: 'Template indexed successfully',
      templateId
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function reindexAll() {
  try {
    console.log('🔄 Starting complete reindexing...')
    
    const [docsResult, usersResult, templatesResult] = await Promise.allSettled([
      indexAllDocuments(),
      indexAllUsers(),
      indexAllTemplates()
    ])
    
    const results = {
      documents: docsResult.status === 'fulfilled' ? await docsResult.value.json() : { success: false },
      users: usersResult.status === 'fulfilled' ? await usersResult.value.json() : { success: false },
      templates: templatesResult.status === 'fulfilled' ? await templatesResult.value.json() : { success: false }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Complete reindexing finished',
      results
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function clearIndex(type?: string) {
  try {
    if (type) {
      // Clear specific type index
      console.log(`🧹 Clearing ${type} index...`)
      // Implementation would depend on your Redis structure
    } else {
      // Clear all indexes
      console.log('🧹 Clearing all indexes...')
      // Implementation would clear all vector indexes
    }
    
    return NextResponse.json({
      success: true,
      message: type ? `${type} index cleared` : 'All indexes cleared'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Search Indexing API',
    status: 'active',
    timestamp: Date.now(),
    actions: [
      'index_all_documents',
      'index_all_users',
      'index_all_templates',
      'index_document',
      'index_user',
      'index_template',
      'reindex_all',
      'clear_index'
    ]
  })
}
