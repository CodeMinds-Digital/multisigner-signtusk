/**
 * Hook for triggering Send Tab notifications
 */

import { useCallback } from 'react'
import { NotificationType } from '@/lib/send-notifications'

interface TriggerNotificationParams {
  documentId: string
  type: NotificationType
  visitorEmail?: string
  visitorFingerprint?: string
  visitorLocation?: string
  metadata?: Record<string, any>
}

export function useSendNotifications() {
  const triggerNotification = useCallback(async (params: TriggerNotificationParams) => {
    try {
      const response = await fetch('/api/send/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      const data = await response.json()
      
      if (!data.success) {
        console.error('Failed to trigger notification:', data.error)
      }
    } catch (error) {
      console.error('Failed to trigger notification:', error)
    }
  }, [])

  const notifyDocumentViewed = useCallback((
    documentId: string,
    visitorEmail?: string,
    visitorFingerprint?: string,
    visitorLocation?: string
  ) => {
    return triggerNotification({
      documentId,
      type: 'document_viewed',
      visitorEmail,
      visitorFingerprint,
      visitorLocation
    })
  }, [triggerNotification])

  const notifyDocumentDownloaded = useCallback((
    documentId: string,
    visitorEmail?: string,
    visitorFingerprint?: string,
    visitorLocation?: string
  ) => {
    return triggerNotification({
      documentId,
      type: 'document_downloaded',
      visitorEmail,
      visitorFingerprint,
      visitorLocation
    })
  }, [triggerNotification])

  const notifyDocumentPrinted = useCallback((
    documentId: string,
    visitorEmail?: string,
    visitorFingerprint?: string,
    visitorLocation?: string
  ) => {
    return triggerNotification({
      documentId,
      type: 'document_printed',
      visitorEmail,
      visitorFingerprint,
      visitorLocation
    })
  }, [triggerNotification])

  const notifyNDAAccepted = useCallback((
    documentId: string,
    visitorEmail?: string,
    visitorFingerprint?: string,
    visitorLocation?: string
  ) => {
    return triggerNotification({
      documentId,
      type: 'nda_accepted',
      visitorEmail,
      visitorFingerprint,
      visitorLocation
    })
  }, [triggerNotification])

  const notifyHighEngagement = useCallback((
    documentId: string,
    visitorEmail?: string,
    visitorFingerprint?: string,
    visitorLocation?: string,
    engagementScore?: number
  ) => {
    return triggerNotification({
      documentId,
      type: 'high_engagement',
      visitorEmail,
      visitorFingerprint,
      visitorLocation,
      metadata: { engagementScore }
    })
  }, [triggerNotification])

  const notifyReturningVisitor = useCallback((
    documentId: string,
    visitorEmail?: string,
    visitorFingerprint?: string,
    visitorLocation?: string,
    visitCount?: number
  ) => {
    return triggerNotification({
      documentId,
      type: 'returning_visitor',
      visitorEmail,
      visitorFingerprint,
      visitorLocation,
      metadata: { visitCount }
    })
  }, [triggerNotification])

  return {
    triggerNotification,
    notifyDocumentViewed,
    notifyDocumentDownloaded,
    notifyDocumentPrinted,
    notifyNDAAccepted,
    notifyHighEngagement,
    notifyReturningVisitor
  }
}

