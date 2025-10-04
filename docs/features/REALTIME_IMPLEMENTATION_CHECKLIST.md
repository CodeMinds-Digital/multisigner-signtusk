# ✅ Supabase Realtime Implementation Checklist

## 🎯 Quick Start Guide

### Prerequisites
- [ ] Supabase project is set up
- [ ] Database tables exist (documents, signing_requests, notifications, etc.)
- [ ] Row Level Security (RLS) policies are configured
- [ ] Supabase client is properly initialized

---

## 📋 Phase 1: Enable Realtime in Supabase (15 minutes)

### Step 1: Enable Realtime Replication
```sql
-- Run in Supabase SQL Editor

-- Enable realtime for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Enable realtime for signing_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE signing_requests;

-- Enable realtime for signing_request_signers table
ALTER PUBLICATION supabase_realtime ADD TABLE signing_request_signers;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for user_profiles table (for presence)
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
```

### Step 2: Verify RLS Policies
```sql
-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('documents', 'signing_requests', 'notifications');

-- If missing, add basic RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

### Step 3: Test Realtime Connection
```typescript
// Test in browser console
const { data, error } = await supabase
  .channel('test')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents'
  }, (payload) => {
    console.log('Realtime working!', payload)
  })
  .subscribe()

console.log('Subscription status:', data)
```

---

## 📋 Phase 2: Implement Dashboard Realtime (30 minutes)

### Step 1: Update Dashboard Component
```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { useRealtimeDashboardStats } from '@/hooks/use-realtime-enhancements'

export default function DashboardPage() {
  const { user } = useAuth()
  const { stats, loading } = useRealtimeDashboardStats(user.id)
  
  // Remove old polling code
  // ❌ DELETE: useEffect(() => { setInterval(fetchStats, 30000) }, [])
  
  return (
    <div>
      <StatsCard title="Total Documents" value={stats.totalDocuments} />
      <StatsCard title="Pending" value={stats.pendingSignatures} />
      <StatsCard title="Completed" value={stats.completedDocuments} />
    </div>
  )
}
```

### Step 2: Test Dashboard Updates
- [ ] Open dashboard in browser
- [ ] Create a new document in another tab
- [ ] Verify stats update automatically (no refresh needed)
- [ ] Check browser console for realtime logs

---

## 📋 Phase 3: Implement Notification Bell Realtime (30 minutes)

### Step 1: Update Notification Component
```typescript
// src/components/ui/notification-bell.tsx
import { useRealtimeNotifications } from '@/hooks/use-realtime-enhancements'

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead } = useRealtimeNotifications(user.id)
  
  // Remove old polling code
  // ❌ DELETE: useEffect(() => { setInterval(fetchNotifications, 30000) }, [])
  
  return (
    <div>
      <Bell />
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      {/* Notifications will update automatically */}
    </div>
  )
}
```

### Step 2: Request Browser Notification Permission
```typescript
// Add to app initialization
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}, [])
```

### Step 3: Test Notifications
- [ ] Open app in browser
- [ ] Trigger a notification (e.g., sign a document)
- [ ] Verify notification appears instantly
- [ ] Check browser notification pops up
- [ ] Verify unread count updates

---

## 📋 Phase 4: Implement Document List Realtime (30 minutes)

### Step 1: Update Document List Component
```typescript
// src/app/(dashboard)/documents/page.tsx
import { useRealtimeDocuments } from '@/hooks/use-realtime-enhancements'

export default function DocumentsPage() {
  const { user } = useAuth()
  const { documents, loading } = useRealtimeDocuments(user.id)
  
  // Remove manual refresh button if exists
  // Documents will update automatically
  
  return (
    <div>
      {documents.map(doc => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  )
}
```

### Step 2: Add Status Filter Support
```typescript
// For filtered views (e.g., only pending documents)
const { documents } = useRealtimeDocuments(user.id, 'pending')
```

### Step 3: Test Document List
- [ ] Open documents page
- [ ] Create new document in another tab
- [ ] Verify it appears in list automatically
- [ ] Update document status
- [ ] Verify status updates in real-time
- [ ] Delete a document
- [ ] Verify it disappears from list

---

## 📋 Phase 5: Enhance Signature Progress (20 minutes)

### Step 1: Add Visual Feedback
```typescript
// src/components/signature-progress.tsx
import { useRealTimeStatus } from '@/hooks/use-real-time-status'

export function SignatureProgress({ requestId }) {
  const [progress, setProgress] = useState(0)
  
  useRealTimeStatus(requestId, (update) => {
    if (update.type === 'document_signed') {
      // Animate progress bar
      setProgress(update.metadata.progress)
      
      // Show confetti if completed
      if (update.status === 'completed') {
        triggerConfetti()
      }
    }
  })
  
  return <ProgressBar value={progress} animated />
}
```

### Step 2: Test Signature Updates
- [ ] Open signature request page
- [ ] Sign document in another browser/incognito
- [ ] Verify progress bar updates instantly
- [ ] Check confetti animation on completion

---

## 📋 Phase 6: Add Presence Tracking (Optional, 45 minutes)

### Step 1: Implement Presence Hook
```typescript
// Already created in use-realtime-enhancements.ts
import { usePresence } from '@/hooks/use-realtime-enhancements'

export function DocumentEditor({ documentId }) {
  const { user } = useAuth()
  const { onlineUsers } = usePresence(
    `document_${documentId}`,
    user.id,
    user.name
  )
  
  return (
    <div>
      <div className="online-users">
        {onlineUsers.map(u => (
          <Avatar key={u.userId} name={u.userName} />
        ))}
      </div>
      {/* Document editor */}
    </div>
  )
}
```

### Step 2: Test Presence
- [ ] Open document in two browsers
- [ ] Verify both users appear in online list
- [ ] Close one browser
- [ ] Verify user disappears from list

---

## 📋 Phase 7: Performance Optimization (30 minutes)

### Step 1: Add Connection Monitoring
```typescript
// src/lib/realtime-monitor.ts
export function monitorRealtimeHealth() {
  const channel = supabase.channel('health_check')
  
  channel.on('system', { event: '*' }, (payload) => {
    console.log('Realtime status:', payload)
    
    if (payload.status === 'CHANNEL_ERROR') {
      // Handle reconnection
      console.error('Realtime connection error')
    }
  })
  
  channel.subscribe((status) => {
    console.log('Subscription status:', status)
  })
}
```

### Step 2: Implement Reconnection Logic
```typescript
// Add to app initialization
useEffect(() => {
  const handleOnline = () => {
    console.log('Back online, reconnecting realtime...')
    // Channels will auto-reconnect
  }
  
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}, [])
```

### Step 3: Add Error Boundaries
```typescript
// Wrap realtime components in error boundaries
<ErrorBoundary fallback={<div>Realtime unavailable</div>}>
  <RealtimeComponent />
</ErrorBoundary>
```

---

## 📋 Testing Checklist

### Functional Tests
- [ ] Dashboard stats update in real-time
- [ ] Notifications appear instantly
- [ ] Document list updates automatically
- [ ] Signature progress updates live
- [ ] Presence tracking works
- [ ] Multiple tabs sync correctly

### Performance Tests
- [ ] No polling API calls in network tab
- [ ] WebSocket connection established
- [ ] Updates appear within 1 second
- [ ] No memory leaks (check DevTools)
- [ ] Works with 10+ open tabs

### Edge Cases
- [ ] Works when offline → online
- [ ] Handles connection drops gracefully
- [ ] Works with slow network
- [ ] Multiple rapid updates handled
- [ ] Large datasets don't cause lag

---

## 📊 Success Metrics

### Before Realtime
- API calls: ~540/hour per user
- Update latency: 30-60 seconds
- Server load: High
- User experience: Manual refresh needed

### After Realtime
- API calls: ~0/hour (only WebSocket)
- Update latency: <1 second
- Server load: 95% reduction
- User experience: Instant updates

---

## 🐛 Troubleshooting

### Issue: Realtime not working
```bash
# Check if realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

# If empty, enable it
ALTER PUBLICATION supabase_realtime ADD TABLE your_table;
```

### Issue: RLS blocking updates
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Temporarily disable RLS for testing (NOT in production!)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

### Issue: Connection keeps dropping
```typescript
// Add reconnection logic
channel.subscribe((status) => {
  if (status === 'CHANNEL_ERROR') {
    setTimeout(() => {
      channel.subscribe()
    }, 5000)
  }
})
```

---

## 🎉 Completion

Once all phases are complete:
- [ ] All polling code removed
- [ ] Realtime working across all features
- [ ] Performance metrics improved
- [ ] User experience enhanced
- [ ] Documentation updated

**Estimated Total Time: 3-4 hours**

---

## 📚 Next Steps

1. Monitor realtime performance in production
2. Add analytics to track realtime usage
3. Implement advanced features (broadcast, presence)
4. Optimize for scale (1000+ concurrent users)
5. Add realtime to mobile app (if applicable)

