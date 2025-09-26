import { NextRequest, NextResponse } from 'next/server'
import { RedisSearchService } from '@/lib/redis-search-service'
import { VectorSearchService } from '@/lib/vector-search-service'
import { rateLimiters } from '@/lib/upstash-config'
import { getSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
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

    // Get session for user context
    const session = await getSession(request)
    const userId = session?.user?.id

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const dateStart = searchParams.get('date_start')
    const dateEnd = searchParams.get('date_end')
    const domain = searchParams.get('domain')
    const searchMode = searchParams.get('mode') || 'hybrid' // 'traditional', 'semantic', 'hybrid'

    // Validate query
    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: '',
        message: 'Query must be at least 2 characters long'
      })
    }

    console.log('🔍 Search request:', { query, type, status, limit, userId })

    // Build filters
    const filters: any = {}

    if (type) {
      filters.type = type.split(',')
    }

    if (status) {
      filters.status = status.split(',')
    }

    if (dateStart && dateEnd) {
      filters.dateRange = {
        start: dateStart,
        end: dateEnd
      }
    }

    if (domain) {
      filters.domain = domain
    }

    // Track search query for suggestions
    if (userId) {
      await RedisSearchService.trackSearchQuery(userId, query)
    }

    // Track search query for suggestions
    await VectorSearchService.trackSearchQuery(query)

    // Perform search based on type and mode
    let results
    let semanticResults = []
    let traditionalResults = []

    if (searchMode === 'semantic' || searchMode === 'hybrid') {
      // Perform semantic search
      const searchTypes = type ? [type] : ['document', 'user', 'template']
      semanticResults = await VectorSearchService.semanticSearch(query, searchTypes, limit, userId)
    }

    if (searchMode === 'traditional' || searchMode === 'hybrid') {
      // Perform traditional search
      if (type === 'documents') {
        traditionalResults = await RedisSearchService.searchDocuments(query, filters, limit, userId)
      } else if (type === 'users') {
        // Only allow admin users to search users
        if (!session?.user?.app_metadata?.role?.includes('admin')) {
          return NextResponse.json(
            { error: 'Unauthorized to search users' },
            { status: 403 }
          )
        }
        traditionalResults = await RedisSearchService.searchUsers(query, filters, limit, userId)
      } else if (type === 'notifications') {
        traditionalResults = await RedisSearchService.searchNotifications(query, filters, limit, userId)
      } else if (type === 'signing_requests') {
        traditionalResults = await RedisSearchService.searchSigningRequests(query, filters, limit, userId)
      } else {
        // Universal search across all types
        traditionalResults = await RedisSearchService.universalSearch(query, filters, limit, userId)
      }
    }

    // Combine results based on search mode
    if (searchMode === 'hybrid') {
      results = combineSearchResults(traditionalResults, semanticResults, limit)
    } else if (searchMode === 'semantic') {
      results = semanticResults.map(result => ({
        ...result,
        score: result.similarity * 100 // Convert similarity to score
      }))
    } else {
      results = traditionalResults
    }

    return NextResponse.json({
      results,
      total: results.length,
      query,
      filters,
      searchMode,
      metadata: {
        traditionalCount: traditionalResults.length,
        semanticCount: semanticResults.length,
        combined: searchMode === 'hybrid'
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Search API error:', error)
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

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

    // Get session for user context
    const session = await getSession(request)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'get_suggestions':
        const suggestions = await VectorSearchService.getSearchSuggestions(data.query || '', data.limit || 10)
        return NextResponse.json({ suggestions })

      case 'similar_documents':
        if (!data.documentId) {
          return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
        }
        const similarDocs = await VectorSearchService.findSimilarDocuments(data.documentId, data.limit || 10)
        return NextResponse.json({ similar_documents: similarDocs })

      case 'index_document':
        if (!session?.user?.app_metadata?.role?.includes('admin')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
        await VectorSearchService.indexDocument(data.documentId, data.title, data.content, data.metadata)
        return NextResponse.json({ success: true, message: 'Document indexed' })

      case 'search_stats':
        const stats = await VectorSearchService.getSearchStats()
        return NextResponse.json({ stats })

      case 'clear_cache':
        // Only allow admin users to clear search cache
        if (!session?.user?.app_metadata?.role?.includes('admin')) {
          return NextResponse.json(
            { error: 'Unauthorized to clear cache' },
            { status: 403 }
          )
        }
        await RedisSearchService.clearSearchCache(data.pattern)
        return NextResponse.json({ success: true, message: 'Cache cleared' })

      case 'advanced_search':
        // Advanced search with complex filters
        const advancedResults = await performAdvancedSearch(data, userId)
        return NextResponse.json({
          results: advancedResults,
          total: advancedResults.length,
          timestamp: Date.now()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Search POST API error:', error)
    return NextResponse.json(
      {
        error: 'Search operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function performAdvancedSearch(searchData: any, userId: string) {
  const {
    query,
    types = [],
    statuses = [],
    dateRange,
    sortBy = 'relevance',
    sortOrder = 'desc',
    limit = 50,
    includeMetadata = false
  } = searchData

  // Build advanced filters
  const filters: any = {}

  if (types.length > 0) {
    filters.type = types
  }

  if (statuses.length > 0) {
    filters.status = statuses
  }

  if (dateRange) {
    filters.dateRange = dateRange
  }

  // Perform universal search
  let results = await RedisSearchService.universalSearch(query, filters, limit * 2, userId) // Get more for sorting

  // Apply sorting
  if (sortBy === 'date') {
    results.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  } else if (sortBy === 'type') {
    results.sort((a, b) => {
      const comparison = a.type.localeCompare(b.type)
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }
  // Default is relevance (already sorted by score)

  // Limit results
  results = results.slice(0, limit)

  // Remove metadata if not requested
  if (!includeMetadata) {
    results = results.map(result => ({
      id: result.id,
      type: result.type,
      title: result.title,
      description: result.description,
      score: result.score,
      url: result.url,
      created_at: result.created_at
    }))
  }

  return results
}

// Helper function to combine traditional and semantic search results
function combineSearchResults(traditionalResults: any[], semanticResults: any[], limit: number) {
  const combined = new Map()

  // Add traditional results with their scores
  traditionalResults.forEach(result => {
    combined.set(result.id, {
      ...result,
      sources: ['traditional'],
      combinedScore: result.score || 1
    })
  })

  // Add or merge semantic results
  semanticResults.forEach(result => {
    const existing = combined.get(result.id)
    if (existing) {
      // Item found in both searches - boost the score
      existing.combinedScore = (existing.combinedScore + result.similarity * 100) / 2
      existing.sources.push('semantic')
      existing.similarity = result.similarity
    } else {
      // New item from semantic search
      combined.set(result.id, {
        ...result,
        score: result.similarity * 100,
        sources: ['semantic'],
        combinedScore: result.similarity * 100
      })
    }
  })

  // Convert to array and sort by combined score
  return Array.from(combined.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit)
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
