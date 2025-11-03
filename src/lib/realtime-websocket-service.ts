import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createClient } from '@supabase/supabase-js'
import { verify } from 'jsonwebtoken'
import Redis from 'ioredis'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Redis clients for pub/sub
let redisPublisher: Redis | null = null
let redisSubscriber: Redis | null = null

if (process.env.UPSTASH_REDIS_REST_URL) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL.replace('https://', 'redis://')
  redisPublisher = new Redis(redisUrl)
  redisSubscriber = new Redis(redisUrl)
}

interface AuthenticatedSocket extends Socket {
  userId?: string
  documentId?: string
  sessionId?: string
}

interface ViewerJoinedEvent {
  sessionId: string
  email?: string
  fingerprint: string
  timestamp: string
}

interface ViewerLeftEvent {
  sessionId: string
  timestamp: string
}

interface PageChangedEvent {
  sessionId: string
  pageNumber: number
  timestamp: string
}

interface AnalyticsUpdatedEvent {
  documentId: string
  linkId?: string
  type: 'view' | 'page_view' | 'event'
  data: any
}

export class RealtimeWebSocketService {
  private io: SocketIOServer | null = null
  private connectionCount = 0
  private readonly MAX_CONNECTIONS = parseInt(process.env.MAX_WS_CONNECTIONS || '10000')
  private readonly RATE_LIMIT_WINDOW = 60000 // 1 minute
  private readonly RATE_LIMIT_MAX_EVENTS = 100
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>()

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer) {
    if (this.io) {
      console.log('⚠️  WebSocket server already initialized')
      return this.io
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token

        if (!token) {
          return next(new Error('Authentication token required'))
        }

        // Verify JWT token
        const decoded = verify(token, process.env.SUPABASE_JWT_SECRET!) as any
        socket.userId = decoded.sub

        // Check connection limit
        if (this.connectionCount >= this.MAX_CONNECTIONS) {
          return next(new Error('Connection limit reached'))
        }

        next()
      } catch (error) {
        console.error('WebSocket auth error:', error)
        next(new Error('Authentication failed'))
      }
    })

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.connectionCount++
      console.log(`🔌 Client connected: ${socket.id} (${this.connectionCount} total)`)

      // Join document room
      socket.on('join:document', async (data: { documentId: string; linkId?: string }) => {
        const { documentId, linkId } = data
        
        // Verify user has access to document
        const hasAccess = await this.verifyDocumentAccess(socket.userId!, documentId, linkId)
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' })
          return
        }

        socket.documentId = documentId
        const room = `document:${documentId}`
        socket.join(room)

        console.log(`📄 User ${socket.userId} joined document ${documentId}`)
        socket.emit('joined', { documentId, room })
      })

      // Leave document room
      socket.on('leave:document', (data: { documentId: string }) => {
        const room = `document:${data.documentId}`
        socket.leave(room)
        console.log(`📤 User ${socket.userId} left document ${data.documentId}`)
      })

      // Handle viewer events (with rate limiting)
      socket.on('viewer:joined', (data: ViewerJoinedEvent) => {
        if (!this.checkRateLimit(socket.id)) {
          socket.emit('error', { message: 'Rate limit exceeded' })
          return
        }

        if (socket.documentId) {
          this.broadcastToDocument(socket.documentId, 'viewer:joined', data)
        }
      })

      socket.on('viewer:left', (data: ViewerLeftEvent) => {
        if (!this.checkRateLimit(socket.id)) return

        if (socket.documentId) {
          this.broadcastToDocument(socket.documentId, 'viewer:left', data)
        }
      })

      socket.on('viewer:page_changed', (data: PageChangedEvent) => {
        if (!this.checkRateLimit(socket.id)) return

        if (socket.documentId) {
          this.broadcastToDocument(socket.documentId, 'viewer:page_changed', data)
        }
      })

      // Disconnect handler
      socket.on('disconnect', () => {
        this.connectionCount--
        console.log(`🔌 Client disconnected: ${socket.id} (${this.connectionCount} remaining)`)
      })
    })

    // Subscribe to Redis pub/sub for multi-instance broadcasting
    if (redisSubscriber) {
      redisSubscriber.subscribe('analytics:events', (err) => {
        if (err) {
          console.error('Redis subscription error:', err)
        } else {
          console.log('📡 Subscribed to Redis analytics:events channel')
        }
      })

      redisSubscriber.on('message', (channel, message) => {
        if (channel === 'analytics:events') {
          try {
            const event = JSON.parse(message)
            this.handleRedisEvent(event)
          } catch (error) {
            console.error('Redis message parse error:', error)
          }
        }
      })
    }

    console.log('✅ WebSocket server initialized')
    return this.io
  }

  /**
   * Verify user has access to document
   */
  private async verifyDocumentAccess(
    userId: string,
    documentId: string,
    linkId?: string
  ): Promise<boolean> {
    try {
      // Check if user owns the document
      const { data: document } = await supabaseAdmin
        .from('send_shared_documents')
        .select('user_id')
        .eq('id', documentId)
        .single()

      if (document?.user_id === userId) {
        return true
      }

      // If linkId provided, check if link is valid and active
      if (linkId) {
        const { data: link } = await supabaseAdmin
          .from('send_document_links')
          .select('id, is_active, expires_at')
          .eq('link_id', linkId)
          .eq('document_id', documentId)
          .single()

        if (link?.is_active) {
          if (!link.expires_at || new Date(link.expires_at) > new Date()) {
            return true
          }
        }
      }

      return false
    } catch (error) {
      console.error('Access verification error:', error)
      return false
    }
  }

  /**
   * Check rate limit for socket
   */
  private checkRateLimit(socketId: string): boolean {
    const now = Date.now()
    const limit = this.rateLimitMap.get(socketId)

    if (!limit || now > limit.resetAt) {
      this.rateLimitMap.set(socketId, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW
      })
      return true
    }

    if (limit.count >= this.RATE_LIMIT_MAX_EVENTS) {
      return false
    }

    limit.count++
    return true
  }

  /**
   * Broadcast event to all clients in a document room
   */
  broadcastToDocument(documentId: string, event: string, data: any) {
    if (!this.io) return

    const room = `document:${documentId}`
    this.io.to(room).emit(event, data)

    // Also publish to Redis for multi-instance support
    if (redisPublisher) {
      redisPublisher.publish('analytics:events', JSON.stringify({
        documentId,
        event,
        data
      })).catch(err => console.error('Redis publish error:', err))
    }
  }

  /**
   * Handle events from Redis pub/sub
   */
  private handleRedisEvent(event: { documentId: string; event: string; data: any }) {
    if (!this.io) return

    const room = `document:${event.documentId}`
    this.io.to(room).emit(event.event, event.data)
  }

  /**
   * Emit analytics update event
   */
  emitAnalyticsUpdate(documentId: string, linkId: string | undefined, type: string, data: any) {
    this.broadcastToDocument(documentId, 'analytics:updated', {
      documentId,
      linkId,
      type,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      connections: this.connectionCount,
      maxConnections: this.MAX_CONNECTIONS,
      rooms: this.io?.sockets.adapter.rooms.size || 0
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeWebSocketService()

