/**
 * Send Tab Realtime Service
 * Handles real-time updates using Supabase Realtime
 */

import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export class SendTabRealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map()

  // =====================================================
  // LIVE VIEW NOTIFICATIONS
  // =====================================================

  /**
   * Subscribe to live view notifications for a link
   */
  static subscribeLinkViews(
    linkId: string,
    callback: (view: any) => void
  ): RealtimeChannel {
    const channelName = `link:${linkId}:views`
    
    // Remove existing channel if any
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_views',
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to view updates (duration, pages viewed, etc.)
   */
  static subscribeViewUpdates(
    linkId: string,
    callback: (view: any) => void
  ): RealtimeChannel {
    const channelName = `link:${linkId}:view-updates`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_views',
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // =====================================================
  // ACTIVE VIEWER PRESENCE
  // =====================================================

  /**
   * Track active viewer presence for a link
   */
  static trackViewerPresence(
    linkId: string,
    viewerData: {
      sessionId: string
      viewerEmail?: string
      viewerName?: string
    },
    onPresenceChange: (state: any) => void
  ): RealtimeChannel {
    const channelName = `link:${linkId}:presence`
    
    this.unsubscribe(channelName)

    const channel = supabase.channel(channelName)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        onPresenceChange(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Viewer joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Viewer left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            session_id: viewerData.sessionId,
            viewer_email: viewerData.viewerEmail,
            viewer_name: viewerData.viewerName,
            online_at: new Date().toISOString(),
          })
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Update viewer presence (heartbeat)
   */
  static async updateViewerPresence(
    channelName: string,
    updates: any
  ): Promise<void> {
    const channel = this.channels.get(channelName)
    if (channel) {
      await channel.track(updates)
    }
  }

  /**
   * Get active viewer count from presence
   */
  static getActiveViewerCount(channelName: string): number {
    const channel = this.channels.get(channelName)
    if (channel) {
      const state = channel.presenceState()
      return Object.keys(state).length
    }
    return 0
  }

  // =====================================================
  // DOCUMENT STATUS UPDATES
  // =====================================================

  /**
   * Subscribe to document updates
   */
  static subscribeDocumentUpdates(
    userId: string,
    callback: (document: any) => void
  ): RealtimeChannel {
    const channelName = `user:${userId}:documents`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_documents',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to link status changes
   */
  static subscribeLinkUpdates(
    userId: string,
    callback: (link: any) => void
  ): RealtimeChannel {
    const channelName = `user:${userId}:links`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_links',
          filter: `created_by=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new || payload.old)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // =====================================================
  // ANALYTICS EVENTS
  // =====================================================

  /**
   * Subscribe to analytics events for a link
   */
  static subscribeAnalyticsEvents(
    linkId: string,
    callback: (event: any) => void
  ): RealtimeChannel {
    const channelName = `link:${linkId}:analytics`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'link_analytics_events',
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // =====================================================
  // NDA ACCEPTANCES
  // =====================================================

  /**
   * Subscribe to NDA acceptances for a link
   */
  static subscribeNDAAcceptances(
    linkId: string,
    callback: (nda: any) => void
  ): RealtimeChannel {
    const channelName = `link:${linkId}:ndas`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_ndas',
          filter: `link_id=eq.${linkId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // =====================================================
  // FEEDBACK
  // =====================================================

  /**
   * Subscribe to document feedback
   */
  static subscribeFeedback(
    documentId: string,
    callback: (feedback: any) => void
  ): RealtimeChannel {
    const channelName = `document:${documentId}:feedback`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_feedback',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // =====================================================
  // TEAM ACTIVITY
  // =====================================================

  /**
   * Subscribe to team activity feed
   */
  static subscribeTeamActivity(
    teamId: string,
    callback: (activity: any) => void
  ): RealtimeChannel {
    const channelName = `team:${teamId}:activity`
    
    this.unsubscribe(channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_documents',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          callback({
            type: payload.eventType,
            data: payload.new || payload.old,
            timestamp: new Date().toISOString(),
          })
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Unsubscribe from a channel
   */
  static unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  /**
   * Get active channel count
   */
  static getActiveChannelCount(): number {
    return this.channels.size
  }

  /**
   * Get all active channel names
   */
  static getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Check if a channel is active
   */
  static isChannelActive(channelName: string): boolean {
    return this.channels.has(channelName)
  }
}

