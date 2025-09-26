// Redis-powered search service with vector capabilities
import { redis, CACHE_TTL, CACHE_KEYS, RedisUtils } from './upstash-config'
import { supabaseAdmin } from './supabase-admin'

export interface SearchResult {
  id: string
  type: 'document' | 'user' | 'notification' | 'signing_request'
  title: string
  description: string
  metadata: any
  score: number
  url?: string
  created_at: string
}

export interface SearchFilters {
  type?: string[]
  status?: string[]
  dateRange?: {
    start: string
    end: string
  }
  userId?: string
  domain?: string
}

export class RedisSearchService {
  // Search index keys
  private static readonly SEARCH_INDEX = {
    DOCUMENTS: 'search:documents',
    USERS: 'search:users',
    NOTIFICATIONS: 'search:notifications',
    SIGNING_REQUESTS: 'search:signing_requests',
    GLOBAL: 'search:global'
  }

  // Cache search results
  private static readonly SEARCH_CACHE_TTL = 300 // 5 minutes

  /**
   * Universal search across all entities
   */
  static async universalSearch(
    query: string,
    filters: SearchFilters = {},
    limit: number = 50,
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      // Generate cache key for search results
      const cacheKey = this.generateSearchCacheKey(query, filters, limit, userId)
      
      // Try to get cached results first
      const cachedResults = await RedisUtils.get<SearchResult[]>(cacheKey)
      if (cachedResults) {
        console.log('🎯 Returning cached search results')
        return cachedResults
      }

      console.log('🔍 Performing universal search:', { query, filters, limit })

      // Perform parallel searches across all entities
      const [documents, users, notifications, signingRequests] = await Promise.all([
        this.searchDocuments(query, filters, Math.ceil(limit / 4), userId),
        this.searchUsers(query, filters, Math.ceil(limit / 4), userId),
        this.searchNotifications(query, filters, Math.ceil(limit / 4), userId),
        this.searchSigningRequests(query, filters, Math.ceil(limit / 4), userId)
      ])

      // Combine and sort results by relevance score
      const allResults = [...documents, ...users, ...notifications, ...signingRequests]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      // Cache the results
      await RedisUtils.setWithTTL(cacheKey, allResults, this.SEARCH_CACHE_TTL)

      return allResults
    } catch (error) {
      console.error('❌ Universal search error:', error)
      return []
    }
  }

  /**
   * Search documents with full-text and metadata search
   */
  static async searchDocuments(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      // Check cache first
      const cacheKey = `${this.SEARCH_INDEX.DOCUMENTS}:${this.hashQuery(query, filters, userId)}`
      const cached = await RedisUtils.get<SearchResult[]>(cacheKey)
      if (cached) return cached

      let dbQuery = supabaseAdmin
        .from('documents')
        .select(`
          id, title, file_name, document_type, category, status, 
          created_at, user_id, metadata, description,
          signing_requests!inner(id, status, expires_at)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Apply text search
      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,file_name.ilike.%${query}%,description.ilike.%${query}%`)
      }

      // Apply filters
      if (filters.status?.length) {
        dbQuery = dbQuery.in('signing_requests.status', filters.status)
      }

      if (filters.type?.length) {
        dbQuery = dbQuery.in('document_type', filters.type)
      }

      if (filters.dateRange) {
        dbQuery = dbQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }

      if (userId) {
        dbQuery = dbQuery.eq('user_id', userId)
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('❌ Document search error:', error)
        return []
      }

      const results: SearchResult[] = (data || []).map(doc => ({
        id: doc.id,
        type: 'document' as const,
        title: doc.title || doc.file_name || 'Untitled Document',
        description: doc.description || `${doc.document_type || 'Document'} - ${doc.status}`,
        metadata: {
          document_type: doc.document_type,
          category: doc.category,
          status: doc.status,
          signing_status: doc.signing_requests?.[0]?.status,
          expires_at: doc.signing_requests?.[0]?.expires_at
        },
        score: this.calculateRelevanceScore(query, doc.title || doc.file_name || '', doc.description || ''),
        url: `/documents/${doc.id}`,
        created_at: doc.created_at
      }))

      // Cache results
      await RedisUtils.setWithTTL(cacheKey, results, this.SEARCH_CACHE_TTL)
      return results
    } catch (error) {
      console.error('❌ Document search error:', error)
      return []
    }
  }

  /**
   * Search users (admin functionality)
   */
  static async searchUsers(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    adminUserId?: string
  ): Promise<SearchResult[]> {
    try {
      if (!adminUserId) return [] // Only admins can search users

      const cacheKey = `${this.SEARCH_INDEX.USERS}:${this.hashQuery(query, filters, adminUserId)}`
      const cached = await RedisUtils.get<SearchResult[]>(cacheKey)
      if (cached) return cached

      // Search in auth.users via admin API
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers()
      
      if (error) {
        console.error('❌ User search error:', error)
        return []
      }

      let filteredUsers = authUsers.users || []

      // Apply text search
      if (query) {
        filteredUsers = filteredUsers.filter(user =>
          user.email?.toLowerCase().includes(query.toLowerCase()) ||
          user.user_metadata?.full_name?.toLowerCase().includes(query.toLowerCase())
        )
      }

      // Apply domain filter for corporate features
      if (filters.domain) {
        filteredUsers = filteredUsers.filter(user =>
          user.email?.endsWith(`@${filters.domain}`)
        )
      }

      const results: SearchResult[] = filteredUsers
        .slice(0, limit)
        .map(user => ({
          id: user.id,
          type: 'user' as const,
          title: user.user_metadata?.full_name || user.email || 'Unknown User',
          description: `${user.email} - Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`,
          metadata: {
            email: user.email,
            email_confirmed: !!user.email_confirmed_at,
            last_sign_in: user.last_sign_in_at,
            created_at: user.created_at
          },
          score: this.calculateRelevanceScore(query, user.email || '', user.user_metadata?.full_name || ''),
          url: `/admin/users/${user.id}`,
          created_at: user.created_at
        }))

      await RedisUtils.setWithTTL(cacheKey, results, this.SEARCH_CACHE_TTL)
      return results
    } catch (error) {
      console.error('❌ User search error:', error)
      return []
    }
  }

  /**
   * Search notifications
   */
  static async searchNotifications(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      if (!userId) return []

      const cacheKey = `${this.SEARCH_INDEX.NOTIFICATIONS}:${this.hashQuery(query, filters, userId)}`
      const cached = await RedisUtils.get<SearchResult[]>(cacheKey)
      if (cached) return cached

      let dbQuery = supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,message.ilike.%${query}%`)
      }

      if (filters.status?.length) {
        const isRead = filters.status.includes('read')
        dbQuery = dbQuery.eq('is_read', isRead)
      }

      if (filters.type?.length) {
        dbQuery = dbQuery.in('type', filters.type)
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('❌ Notification search error:', error)
        return []
      }

      const results: SearchResult[] = (data || []).map(notification => ({
        id: notification.id,
        type: 'notification' as const,
        title: notification.title,
        description: notification.message,
        metadata: {
          type: notification.type,
          is_read: notification.is_read,
          action_url: notification.action_url
        },
        score: this.calculateRelevanceScore(query, notification.title, notification.message),
        url: notification.action_url || '/notifications',
        created_at: notification.created_at
      }))

      await RedisUtils.setWithTTL(cacheKey, results, this.SEARCH_CACHE_TTL)
      return results
    } catch (error) {
      console.error('❌ Notification search error:', error)
      return []
    }
  }

  /**
   * Search signing requests
   */
  static async searchSigningRequests(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      const cacheKey = `${this.SEARCH_INDEX.SIGNING_REQUESTS}:${this.hashQuery(query, filters, userId)}`
      const cached = await RedisUtils.get<SearchResult[]>(cacheKey)
      if (cached) return cached

      let dbQuery = supabaseAdmin
        .from('signing_requests')
        .select(`
          id, document_sign_id, status, created_at, expires_at,
          documents!inner(id, title, file_name),
          signing_request_signers!inner(id, email, status)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (query) {
        dbQuery = dbQuery.or(`document_sign_id.ilike.%${query}%,documents.title.ilike.%${query}%`)
      }

      if (filters.status?.length) {
        dbQuery = dbQuery.in('status', filters.status)
      }

      if (userId) {
        dbQuery = dbQuery.eq('documents.user_id', userId)
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('❌ Signing request search error:', error)
        return []
      }

      const results: SearchResult[] = (data || []).map(request => ({
        id: request.id,
        type: 'signing_request' as const,
        title: `${request.documents?.title || 'Document'} - ${request.document_sign_id}`,
        description: `Status: ${request.status} - Signers: ${request.signing_request_signers?.length || 0}`,
        metadata: {
          document_sign_id: request.document_sign_id,
          status: request.status,
          expires_at: request.expires_at,
          signers_count: request.signing_request_signers?.length || 0
        },
        score: this.calculateRelevanceScore(query, request.document_sign_id, request.documents?.title || ''),
        url: `/sign/${request.document_sign_id}`,
        created_at: request.created_at
      }))

      await RedisUtils.setWithTTL(cacheKey, results, this.SEARCH_CACHE_TTL)
      return results
    } catch (error) {
      console.error('❌ Signing request search error:', error)
      return []
    }
  }

  /**
   * Get search suggestions based on user's search history
   */
  static async getSearchSuggestions(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const suggestionsKey = `search:suggestions:${userId}`
      const suggestions = await redis.lrange(suggestionsKey, 0, limit - 1)
      return suggestions as string[]
    } catch (error) {
      console.error('❌ Error getting search suggestions:', error)
      return []
    }
  }

  /**
   * Track search query for suggestions
   */
  static async trackSearchQuery(userId: string, query: string): Promise<void> {
    try {
      if (query.length < 3) return // Don't track very short queries

      const suggestionsKey = `search:suggestions:${userId}`
      await redis.lpush(suggestionsKey, query)
      await redis.ltrim(suggestionsKey, 0, 49) // Keep last 50 searches
      await redis.expire(suggestionsKey, CACHE_TTL.USER_PROFILE)
    } catch (error) {
      console.error('❌ Error tracking search query:', error)
    }
  }

  /**
   * Clear search cache for specific patterns
   */
  static async clearSearchCache(pattern?: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern || 'search:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('❌ Error clearing search cache:', error)
    }
  }

  // Helper methods
  private static generateSearchCacheKey(
    query: string,
    filters: SearchFilters,
    limit: number,
    userId?: string
  ): string {
    const filterStr = JSON.stringify(filters)
    const hash = this.hashQuery(query + filterStr + limit + (userId || ''))
    return `search:universal:${hash}`
  }

  private static hashQuery(...parts: string[]): string {
    return Buffer.from(parts.join('|')).toString('base64').slice(0, 16)
  }

  private static calculateRelevanceScore(query: string, title: string, description: string): number {
    if (!query) return 1

    const queryLower = query.toLowerCase()
    const titleLower = title.toLowerCase()
    const descLower = description.toLowerCase()

    let score = 0

    // Exact title match gets highest score
    if (titleLower === queryLower) score += 100
    // Title starts with query
    else if (titleLower.startsWith(queryLower)) score += 80
    // Title contains query
    else if (titleLower.includes(queryLower)) score += 60

    // Description matches
    if (descLower.includes(queryLower)) score += 20

    // Boost recent items (within last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    if (Date.now() > thirtyDaysAgo) score += 10

    return Math.max(score, 1) // Minimum score of 1
  }
}
