// Advanced Vector Search Service for SignTusk
// Provides semantic search capabilities for documents, users, and content

import { redis, CACHE_TTL, CACHE_KEYS, RedisUtils } from './upstash-config'
import { supabaseAdmin } from './supabase-admin'

export interface VectorSearchResult {
  id: string
  type: 'document' | 'user' | 'template' | 'notification'
  title: string
  content: string
  metadata: any
  similarity: number
  embedding?: number[]
  url?: string
  created_at: string
}

export interface SearchEmbedding {
  id: string
  embedding: number[]
  metadata: any
  content: string
}

export class VectorSearchService {
  private static readonly EMBEDDING_DIMENSION = 384 // Using sentence-transformers dimension
  private static readonly SIMILARITY_THRESHOLD = 0.7
  private static readonly MAX_RESULTS = 50

  /**
   * Generate embeddings for text content
   * In production, you'd use a proper embedding service like OpenAI, Cohere, or local models
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Simplified embedding generation using text hashing and normalization
      // In production, replace with actual embedding service
      const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2)
      const embedding = new Array(this.EMBEDDING_DIMENSION).fill(0)
      
      // Simple hash-based embedding (replace with real embeddings)
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        for (let j = 0; j < word.length; j++) {
          const charCode = word.charCodeAt(j)
          const index = (charCode + i + j) % this.EMBEDDING_DIMENSION
          embedding[index] += Math.sin(charCode * 0.1) * 0.1
        }
      }
      
      // Normalize the embedding
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
      return embedding.map(val => magnitude > 0 ? val / magnitude : 0)
      
    } catch (error) {
      console.error('❌ Error generating embedding:', error)
      return new Array(this.EMBEDDING_DIMENSION).fill(0)
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
    return magnitude > 0 ? dotProduct / magnitude : 0
  }

  /**
   * Index document content for vector search
   */
  static async indexDocument(
    documentId: string,
    title: string,
    content: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      // Generate embedding for the document
      const fullText = `${title} ${content}`.trim()
      const embedding = await this.generateEmbedding(fullText)
      
      // Store embedding in Redis
      const embeddingKey = RedisUtils.buildKey('vector', 'document', documentId)
      const embeddingData: SearchEmbedding = {
        id: documentId,
        embedding,
        metadata: {
          ...metadata,
          type: 'document',
          title,
          indexed_at: Date.now()
        },
        content: fullText.substring(0, 1000) // Store first 1000 chars for preview
      }
      
      await RedisUtils.setWithTTL(embeddingKey, embeddingData, CACHE_TTL.DOCUMENT_METADATA)
      
      // Add to document index
      await redis.sadd('vector:index:documents', documentId)
      
      console.log('✅ Document indexed for vector search:', documentId)
      
    } catch (error) {
      console.error('❌ Error indexing document:', error)
    }
  }

  /**
   * Index user profile for search
   */
  static async indexUser(
    userId: string,
    email: string,
    profile: any = {}
  ): Promise<void> {
    try {
      const fullText = `${email} ${profile.full_name || ''} ${profile.company || ''} ${profile.role || ''}`.trim()
      const embedding = await this.generateEmbedding(fullText)
      
      const embeddingKey = RedisUtils.buildKey('vector', 'user', userId)
      const embeddingData: SearchEmbedding = {
        id: userId,
        embedding,
        metadata: {
          ...profile,
          type: 'user',
          email,
          indexed_at: Date.now()
        },
        content: fullText
      }
      
      await RedisUtils.setWithTTL(embeddingKey, embeddingData, CACHE_TTL.USER_PROFILE)
      await redis.sadd('vector:index:users', userId)
      
      console.log('✅ User indexed for vector search:', userId)
      
    } catch (error) {
      console.error('❌ Error indexing user:', error)
    }
  }

  /**
   * Index template for search
   */
  static async indexTemplate(
    templateId: string,
    name: string,
    description: string,
    tags: string[] = [],
    metadata: any = {}
  ): Promise<void> {
    try {
      const fullText = `${name} ${description} ${tags.join(' ')}`.trim()
      const embedding = await this.generateEmbedding(fullText)
      
      const embeddingKey = RedisUtils.buildKey('vector', 'template', templateId)
      const embeddingData: SearchEmbedding = {
        id: templateId,
        embedding,
        metadata: {
          ...metadata,
          type: 'template',
          name,
          description,
          tags,
          indexed_at: Date.now()
        },
        content: fullText
      }
      
      await RedisUtils.setWithTTL(embeddingKey, embeddingData, CACHE_TTL.DOCUMENT_METADATA)
      await redis.sadd('vector:index:templates', templateId)
      
      console.log('✅ Template indexed for vector search:', templateId)
      
    } catch (error) {
      console.error('❌ Error indexing template:', error)
    }
  }

  /**
   * Perform semantic search across indexed content
   */
  static async semanticSearch(
    query: string,
    types: string[] = ['document', 'user', 'template'],
    limit: number = 20,
    userId?: string
  ): Promise<VectorSearchResult[]> {
    try {
      console.log('🔍 Performing semantic search:', { query, types, limit })
      
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query)
      
      // Get all indexed items of specified types
      const allResults: VectorSearchResult[] = []
      
      for (const type of types) {
        const indexKey = `vector:index:${type}s`
        const itemIds = await redis.smembers(indexKey) as string[]
        
        for (const itemId of itemIds) {
          const embeddingKey = RedisUtils.buildKey('vector', type, itemId)
          const embeddingData = await RedisUtils.get<SearchEmbedding>(embeddingKey)
          
          if (embeddingData) {
            const similarity = this.calculateSimilarity(queryEmbedding, embeddingData.embedding)
            
            if (similarity >= this.SIMILARITY_THRESHOLD) {
              allResults.push({
                id: itemId,
                type: type as any,
                title: embeddingData.metadata.title || embeddingData.metadata.name || embeddingData.metadata.email || 'Untitled',
                content: embeddingData.content,
                metadata: embeddingData.metadata,
                similarity,
                url: this.generateUrl(type, itemId),
                created_at: embeddingData.metadata.created_at || new Date().toISOString()
              })
            }
          }
        }
      }
      
      // Sort by similarity and limit results
      const sortedResults = allResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
      
      // Cache search results
      const cacheKey = `vector_search:${Buffer.from(query + types.join(',')).toString('base64').slice(0, 32)}`
      await RedisUtils.setWithTTL(cacheKey, sortedResults, 300) // 5 minutes
      
      return sortedResults
      
    } catch (error) {
      console.error('❌ Semantic search error:', error)
      return []
    }
  }

  /**
   * Find similar documents to a given document
   */
  static async findSimilarDocuments(
    documentId: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      const embeddingKey = RedisUtils.buildKey('vector', 'document', documentId)
      const sourceEmbedding = await RedisUtils.get<SearchEmbedding>(embeddingKey)
      
      if (!sourceEmbedding) {
        return []
      }
      
      const documentIds = await redis.smembers('vector:index:documents') as string[]
      const similarDocuments: VectorSearchResult[] = []
      
      for (const docId of documentIds) {
        if (docId === documentId) continue // Skip self
        
        const docEmbeddingKey = RedisUtils.buildKey('vector', 'document', docId)
        const docEmbedding = await RedisUtils.get<SearchEmbedding>(docEmbeddingKey)
        
        if (docEmbedding) {
          const similarity = this.calculateSimilarity(sourceEmbedding.embedding, docEmbedding.embedding)
          
          if (similarity >= this.SIMILARITY_THRESHOLD) {
            similarDocuments.push({
              id: docId,
              type: 'document',
              title: docEmbedding.metadata.title || 'Untitled',
              content: docEmbedding.content,
              metadata: docEmbedding.metadata,
              similarity,
              url: this.generateUrl('document', docId),
              created_at: docEmbedding.metadata.created_at || new Date().toISOString()
            })
          }
        }
      }
      
      return similarDocuments
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
      
    } catch (error) {
      console.error('❌ Error finding similar documents:', error)
      return []
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      if (partialQuery.length < 2) return []
      
      // Get recent search queries that start with the partial query
      const suggestionKey = 'search_suggestions:global'
      const allSuggestions = await redis.lrange(suggestionKey, 0, 999) as string[]
      
      const matchingSuggestions = allSuggestions
        .filter(suggestion => suggestion.toLowerCase().startsWith(partialQuery.toLowerCase()))
        .slice(0, limit)
      
      // If we don't have enough suggestions, generate some based on indexed content
      if (matchingSuggestions.length < limit) {
        const additionalSuggestions = await this.generateContentBasedSuggestions(partialQuery, limit - matchingSuggestions.length)
        matchingSuggestions.push(...additionalSuggestions)
      }
      
      return [...new Set(matchingSuggestions)] // Remove duplicates
      
    } catch (error) {
      console.error('❌ Error getting search suggestions:', error)
      return []
    }
  }

  /**
   * Track search query for future suggestions
   */
  static async trackSearchQuery(query: string): Promise<void> {
    try {
      if (query.length < 3) return
      
      const suggestionKey = 'search_suggestions:global'
      await redis.lpush(suggestionKey, query)
      await redis.ltrim(suggestionKey, 0, 999) // Keep last 1000 searches
      await redis.expire(suggestionKey, CACHE_TTL.USER_PROFILE)
      
    } catch (error) {
      console.error('❌ Error tracking search query:', error)
    }
  }

  /**
   * Remove item from vector index
   */
  static async removeFromIndex(type: string, itemId: string): Promise<void> {
    try {
      const embeddingKey = RedisUtils.buildKey('vector', type, itemId)
      await RedisUtils.del(embeddingKey)
      
      const indexKey = `vector:index:${type}s`
      await redis.srem(indexKey, itemId)
      
      console.log('✅ Removed from vector index:', { type, itemId })
      
    } catch (error) {
      console.error('❌ Error removing from index:', error)
    }
  }

  /**
   * Get vector search statistics
   */
  static async getSearchStats(): Promise<any> {
    try {
      const [documentCount, userCount, templateCount] = await Promise.all([
        redis.scard('vector:index:documents'),
        redis.scard('vector:index:users'),
        redis.scard('vector:index:templates')
      ])
      
      return {
        indexed_documents: documentCount,
        indexed_users: userCount,
        indexed_templates: templateCount,
        total_indexed: documentCount + userCount + templateCount,
        embedding_dimension: this.EMBEDDING_DIMENSION,
        similarity_threshold: this.SIMILARITY_THRESHOLD
      }
      
    } catch (error) {
      console.error('❌ Error getting search stats:', error)
      return {}
    }
  }

  // Helper methods
  private static generateUrl(type: string, itemId: string): string {
    switch (type) {
      case 'document':
        return `/documents/${itemId}`
      case 'user':
        return `/admin/users/${itemId}`
      case 'template':
        return `/templates/${itemId}`
      default:
        return '#'
    }
  }

  private static async generateContentBasedSuggestions(partialQuery: string, limit: number): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In production, you'd analyze indexed content to generate better suggestions
      const commonTerms = [
        'contract', 'agreement', 'document', 'signature', 'sign', 'template',
        'user', 'email', 'notification', 'pending', 'completed', 'expired'
      ]
      
      return commonTerms
        .filter(term => term.startsWith(partialQuery.toLowerCase()))
        .slice(0, limit)
        
    } catch (error) {
      console.error('❌ Error generating content-based suggestions:', error)
      return []
    }
  }
}
