'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Send, 
  MoreHorizontal, 
  Reply, 
  Edit, 
  Trash2, 
  MessageCircle,
  Users,
  Settings,
  Smile,
  Paperclip,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@supabase/supabase-js'

interface Message {
  message_id: string
  message_text: string
  message_type: string
  file_url?: string
  file_name?: string
  reply_to_id?: string
  is_edited: boolean
  sent_at: string
  participant_id: string
  display_name: string
  avatar_url?: string
  participant_role: string
  reaction_count: number
}

interface Participant {
  id: string
  display_name: string
  avatar_url?: string
  role: string
  joined_at: string
  last_seen_at: string
  is_active: boolean
  can_send_messages: boolean
}

interface Conversation {
  conversation_id: string
  title?: string
  description?: string
  conversation_type: string
  is_active: boolean
  created_at: string
  participant_count: number
  message_count: number
  last_message_at?: string
  participants: Participant[]
  recent_messages: Message[]
}

interface ConversationChatProps {
  conversationId: string
  currentParticipantId?: string
  viewerEmail?: string
  sessionId?: string
  displayName?: string
  onClose?: () => void
}

export function ConversationChat({
  conversationId,
  currentParticipantId,
  viewerEmail,
  sessionId,
  displayName,
  onClose
}: ConversationChatProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showParticipants, setShowParticipants] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch conversation details
  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/send/conversations/${conversationId}`)
      const data = await response.json()

      if (data.success) {
        setConversation(data.conversation)
        setMessages(data.conversation.recent_messages || [])
      } else {
        toast.error('Failed to load conversation')
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/send/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message_text: newMessage,
          participant_id: currentParticipantId,
          viewer_email: viewerEmail,
          session_id: sessionId,
          display_name: displayName,
          reply_to_id: replyingTo?.message_id
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewMessage('')
        setReplyingTo(null)
        // Message will be added via realtime subscription
      } else {
        toast.error(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Get participant initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'moderator': return 'bg-blue-100 text-blue-800'
      case 'participant': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Set up realtime subscription
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'send_conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Fetch the complete message with participant info
          fetch(`/api/send/conversations/${conversationId}/messages?limit=1&offset=0`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.messages.length > 0) {
                const newMessage = data.messages[0]
                setMessages(prev => [newMessage, ...prev])
                scrollToBottom()
              }
            })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'send_conversation_participants',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Update participant info
          setConversation(prev => {
            if (!prev) return prev
            const updatedParticipants = prev.participants.map(p => 
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            )
            return { ...prev, participants: updatedParticipants }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  useEffect(() => {
    fetchConversation()
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (loading) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  if (!conversation) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500">Conversation not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-96 flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">
                {conversation.title || 'Document Discussion'}
              </CardTitle>
              {conversation.description && (
                <p className="text-sm text-gray-500">{conversation.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParticipants(!showParticipants)}
            >
              <Users className="h-4 w-4 mr-1" />
              {conversation.participant_count}
            </Button>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <div className="flex flex-1 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.message_id} className="flex gap-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={message.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(message.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.display_name}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getRoleBadgeColor(message.participant_role)}`}
                        >
                          {message.participant_role}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                        </span>
                        {message.is_edited && (
                          <span className="text-xs text-gray-400">(edited)</span>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">
                          {message.message_text}
                        </p>
                        
                        {message.file_url && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <a 
                                href={message.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {message.file_name}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setReplyingTo(message)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        
                        {message.reaction_count > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            <Smile className="h-3 w-3 mr-1" />
                            {message.reaction_count}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Reply Preview */}
          {replyingTo && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Replying to {replyingTo.display_name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                >
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-600 truncate mt-1">
                {replyingTo.message_text}
              </p>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                disabled={!conversation.is_active}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending || !conversation.is_active}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {!conversation.is_active && (
              <p className="text-xs text-gray-500 mt-2">
                This conversation has been closed
              </p>
            )}
          </div>
        </div>

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="w-64 border-l bg-gray-50">
            <div className="p-4">
              <h4 className="font-medium mb-3">
                Participants ({conversation.participant_count})
              </h4>
              
              <div className="space-y-2">
                {conversation.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {participant.display_name}
                      </p>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getRoleBadgeColor(participant.role)}`}
                        >
                          {participant.role}
                        </Badge>
                        {participant.last_seen_at && (
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(participant.last_seen_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
