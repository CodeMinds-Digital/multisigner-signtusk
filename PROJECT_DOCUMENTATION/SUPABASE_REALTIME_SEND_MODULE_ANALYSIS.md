# Supabase Realtime in Send Module - Comprehensive Analysis

## 📡 **Overview**
The Send module extensively uses Supabase Realtime for live data updates, presence tracking, and real-time notifications across all major features.

## 🏗️ **Architecture**

### **Core Realtime Services**

#### **1. SendTabRealtimeService** (`src/lib/send-tab-realtime-service.ts`)
Central service managing all Send module realtime subscriptions:

```typescript
// Live view notifications
static subscribeLinkViews(linkId: string, callback: (view: any) => void) {
  return supabase
    .channel(`link:${linkId}:views`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'document_views',
      filter: `link_id=eq.${linkId}`
    }, (payload) => callback(payload.new))
    .subscribe()
}

// View updates (duration, pages)
static subscribeViewUpdates(linkId: string, callback: (view: any) => void) {
  return supabase
    .channel(`link:${linkId}:view-updates`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'document_views',
      filter: `link_id=eq.${linkId}`
    }, (payload) => callback(payload.new))
    .subscribe()
}
```

#### **2. RealtimeService** (`src/lib/realtime-service.ts`)
Generic realtime service with fallback polling:

```typescript
static subscribeToTable(tableName: string, filter: string, callback: Function) {
  const channel = supabase
    .channel(`${tableName}_${userId}_${filter}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      ...(filter ? { filter } : {})
    }, callback)
    .subscribe()
}
```

## 🔄 **Realtime Features by Component**

### **1. Dashboard Stats Cards** (`src/components/features/send/send-stats-cards.tsx`)

**Realtime Hook**: `use-realtime-enhancements.ts`
```typescript
// Subscribe to document changes
const channel = supabase
  .channel(`dashboard_stats_${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents',
    filter: `user_id=eq.${userId}`
  }, () => {
    console.log('📊 Document changed, updating stats...')
    fetchStats() // Refresh dashboard stats
  })
  .subscribe()
```

**Live Updates**:
- ✅ Document count changes
- ✅ Link status updates
- ✅ View count increments
- ✅ Visitor tracking

### **2. Real-time Analytics Widget** (`src/components/features/send/realtime-analytics-widget.tsx`)

**Hook**: `useRealtimeAnalytics` with 5-second refresh
```typescript
export function useRealtimeAnalytics(linkId: string, refreshInterval = 5000) {
  const fetchAnalytics = useCallback(async () => {
    const response = await fetch(`/api/send/realtime/${linkId}`)
    const result = await response.json()
    setData({
      metrics: result.metrics,
      activeViewers: result.activeViewers
    })
  }, [linkId])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchAnalytics, refreshInterval])
}
```

**Live Features**:
- ✅ Active viewer count with pulse animation
- ✅ Real-time view metrics
- ✅ Live viewer list with current page
- ✅ Session duration tracking

### **3. Viewer Tracking** (`src/hooks/use-realtime-analytics.ts`)

**Heartbeat System**:
```typescript
export function useViewerTracking(linkId: string, sessionId: string) {
  const sendHeartbeat = useCallback(async () => {
    await fetch(`/api/send/realtime/${linkId}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'heartbeat',
        sessionId,
        currentPage: currentPageRef.current
      })
    })
  }, [linkId, sessionId])

  // Send heartbeat every 30 seconds
  useEffect(() => {
    const interval = setInterval(sendHeartbeat, 30000)
    return () => clearInterval(interval)
  }, [sendHeartbeat])
}
```

### **4. Notifications** (`src/components/features/send/realtime-notifications.tsx`)

**Live Notification Stream**:
```typescript
const setupRealtimeSubscription = async () => {
  const channel = supabase
    .channel('send_notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'send_notifications',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      // Add new notification to state
      setNotifications(prev => [payload.new, ...prev])
      setUnreadCount(prev => prev + 1)
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(payload.new.title, {
          body: payload.new.message
        })
      }
    })
    .subscribe()
}
```

### **5. Document Management** (`use-realtime-enhancements.ts`)

**Document List Updates**:
```typescript
// Subscribe to new documents
const channel = supabase
  .channel(`documents_${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'documents',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    const newDoc = payload.new
    setDocuments(prev => [newDoc, ...prev])
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === payload.new.id ? payload.new : doc
      )
    )
  })
  .subscribe()
```

### **6. Presence Tracking** (`use-realtime-enhancements.ts`)

**Online User Presence**:
```typescript
export function usePresenceTracking(channelName: string, userId: string) {
  const channel = supabase.channel(channelName, {
    config: { presence: { key: userId } }
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users = Object.values(state).flat()
      setOnlineUsers(users)
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('👋 User joined:', newPresences)
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('👋 User left:', leftPresences)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          userName,
          online_at: new Date().toISOString()
        })
      }
    })
}
```

## 📊 **Database Tables with Realtime**

### **Core Tables**
- `send_shared_documents` - Document creation/updates
- `send_document_links` - Link status changes
- `send_document_views` - New views and view updates
- `send_visitor_sessions` - Session tracking
- `send_analytics_events` - Event tracking
- `send_notifications` - Live notifications
- `send_data_rooms` - Data room changes
- `send_viewer_groups` - Group membership changes

### **Realtime Filters**
```sql
-- User-specific filters
filter: `user_id=eq.${userId}`
filter: `created_by=eq.${userId}`

-- Link-specific filters  
filter: `link_id=eq.${linkId}`

-- Document-specific filters
filter: `document_id=eq.${documentId}`

-- Data room filters
filter: `data_room_id=eq.${roomId}`
```

## 🎯 **Key Realtime Patterns**

### **1. Auto-Refresh Pattern**
```typescript
// Fetch data + realtime updates
useEffect(() => {
  fetchData() // Initial load
  
  const channel = supabase
    .channel('updates')
    .on('postgres_changes', { /* config */ }, () => {
      fetchData() // Refresh on changes
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [])
```

### **2. Optimistic Updates Pattern**
```typescript
// Update UI immediately, sync with realtime
const addDocument = async (doc) => {
  // Optimistic update
  setDocuments(prev => [doc, ...prev])
  
  try {
    await api.createDocument(doc)
    // Realtime will confirm the change
  } catch (error) {
    // Rollback on error
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }
}
```

### **3. Presence Pattern**
```typescript
// Track who's online/active
const channel = supabase.channel('presence', {
  config: { presence: { key: userId } }
})

channel.track({ 
  user: userName,
  status: 'online',
  lastSeen: new Date()
})
```

### **4. Heartbeat Pattern**
```typescript
// Keep connections alive
useEffect(() => {
  const heartbeat = setInterval(() => {
    channel.send({
      type: 'heartbeat',
      payload: { timestamp: Date.now() }
    })
  }, 30000)
  
  return () => clearInterval(heartbeat)
}, [])
```

## 🔧 **Configuration**

### **Realtime Config** (`src/lib/realtime-service.ts`)
```typescript
const defaultConfig = {
  enabled: true,
  fallbackPolling: true,
  pollingInterval: 60000, // 60 seconds
  debug: true
}
```

### **Channel Management**
```typescript
class SendTabRealtimeService {
  private static channels = new Map<string, RealtimeChannel>()
  
  static unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }
  
  static cleanup() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}
```

## ✅ **Realtime Features Summary**

### **Working Features**
1. ✅ **Dashboard Stats**: Live document/link/view counts
2. ✅ **Real-time Analytics**: 5-second refresh with live viewers
3. ✅ **Viewer Tracking**: Active viewer presence with heartbeat
4. ✅ **Notifications**: Live notification stream
5. ✅ **Document Updates**: Real-time document list changes
6. ✅ **Presence Tracking**: Online user indicators
7. ✅ **Activity Feed**: Live activity stream
8. ✅ **Data Room Updates**: Live member/permission changes

### **Performance Optimizations**
- ✅ Channel cleanup on unmount
- ✅ Debounced updates
- ✅ Fallback polling for reliability
- ✅ Optimistic UI updates
- ✅ Error handling and retry logic

The Send module has **comprehensive Supabase Realtime integration** providing live updates across all major features with proper error handling, cleanup, and performance optimizations.
