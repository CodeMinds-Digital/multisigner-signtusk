# SendTusk Quick Start Guide
## Developer Reference for Implementation

---

## 🎯 Overview

**SendTusk** is the document-sharing service within the TuskHub platform, positioned as an open-source alternative to DocSend with advanced analytics and security features.

**Key Differentiators:**
- Integration with SignTusk (share → sign workflow)
- TOTP/MFA for document access
- QR code verification
- Real-time analytics with Upstash Redis
- Modern tech stack (Next.js, Supabase, TypeScript)

---

## 📁 Project Structure

```
src/
├── app/
│   └── send/                    # SendTusk routes
│       ├── page.tsx            # Dashboard
│       ├── documents/          # Document management
│       ├── analytics/          # Analytics views
│       ├── settings/           # SendTusk settings
│       └── view/[linkId]/      # Public viewer
├── components/
│   └── features/
│       └── send/               # SendTusk components
│           ├── document-upload.tsx
│           ├── share-link-modal.tsx
│           ├── analytics-dashboard.tsx
│           ├── public-viewer.tsx
│           └── access-controls.tsx
├── lib/
│   ├── send/                   # SendTusk utilities
│   │   ├── link-generator.ts
│   │   ├── analytics.ts
│   │   ├── access-control.ts
│   │   └── watermark.ts
│   └── upstash-send-analytics.ts
└── sql/
    └── send/                   # Database migrations
        ├── 001_initial_schema.sql
        ├── 002_analytics_tables.sql
        └── 003_access_controls.sql
```

---

## 🗄️ Database Schema Quick Reference

### Core Tables

```sql
-- Documents
shared_documents (id, user_id, team_id, title, file_url, status, created_at)

-- Links
document_links (id, document_id, link_id, password_hash, expires_at, max_views)

-- Analytics
document_views (id, link_id, viewer_id, ip_address, viewed_at, duration_seconds)
page_views (id, view_id, page_number, time_spent_seconds)
visitor_sessions (id, link_id, session_id, total_duration_seconds)

-- Access Control
link_access_controls (id, link_id, require_email, allowed_domains, require_totp)
link_email_verifications (id, link_id, email, verification_code, verified)

-- Advanced
data_rooms (id, user_id, name, status)
data_room_documents (id, data_room_id, document_id, display_order)
link_branding (id, link_id, logo_url, brand_color, custom_domain)
```

---

## 🔧 Key Components

### 1. Document Upload

```typescript
// components/features/send/document-upload.tsx
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'

export function DocumentUpload() {
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('send-documents')
      .upload(`${userId}/${Date.now()}_${file.name}`, file)
    
    if (error) throw error
    
    // Create document record
    const { data: doc } = await supabase
      .from('shared_documents')
      .insert({
        user_id: userId,
        title: file.name,
        file_url: data.path,
        file_type: file.type,
        file_size: file.size
      })
      .select()
      .single()
    
    return doc
  }, [userId])
  
  const { getRootProps, getInputProps } = useDropzone({ onDrop })
  
  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Drag & drop or click to upload</p>
    </div>
  )
}
```

### 2. Link Generation

```typescript
// lib/send/link-generator.ts
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)

export async function generateShareLink(documentId: string, options?: {
  password?: string
  expiresAt?: Date
  maxViews?: number
  requireEmail?: boolean
}) {
  const linkId = nanoid()
  
  const { data } = await supabase
    .from('document_links')
    .insert({
      document_id: documentId,
      link_id: linkId,
      password_hash: options?.password ? await hashPassword(options.password) : null,
      expires_at: options?.expiresAt,
      max_views: options?.maxViews,
      is_active: true
    })
    .select()
    .single()
  
  // Create access controls if needed
  if (options?.requireEmail) {
    await supabase
      .from('link_access_controls')
      .insert({
        link_id: data.id,
        require_email: true
      })
  }
  
  return {
    linkId,
    url: `${process.env.NEXT_PUBLIC_URL}/send/view/${linkId}`
  }
}
```

### 3. View Tracking

```typescript
// lib/send/analytics.ts
import { redis } from '@/lib/upstash'

export async function trackDocumentView(
  linkId: string,
  viewerData: {
    email?: string
    ipAddress: string
    userAgent: string
    sessionId: string
  }
) {
  // Store in database
  const { data: view } = await supabase
    .from('document_views')
    .insert({
      link_id: linkId,
      viewer_email: viewerData.email,
      ip_address: viewerData.ipAddress,
      user_agent: viewerData.userAgent,
      viewed_at: new Date()
    })
    .select()
    .single()
  
  // Update Redis for real-time analytics
  await redis.hincrby(`link:${linkId}:stats`, 'total_views', 1)
  await redis.zadd(`link:${linkId}:recent`, Date.now(), view.id)
  
  // Publish real-time notification
  const link = await getDocumentLink(linkId)
  await redis.publish(`user:${link.user_id}:notifications`, {
    type: 'document_viewed',
    linkId,
    viewerEmail: viewerData.email,
    timestamp: Date.now()
  })
  
  return view
}

export async function trackPageView(
  viewId: string,
  pageNumber: number,
  timeSpent: number
) {
  await supabase
    .from('page_views')
    .insert({
      view_id: viewId,
      page_number: pageNumber,
      time_spent_seconds: timeSpent,
      viewed_at: new Date()
    })
}
```

### 4. Public Viewer

```typescript
// app/send/view/[linkId]/page.tsx
import { PDFViewer } from '@/components/features/send/pdf-viewer'
import { trackDocumentView } from '@/lib/send/analytics'

export default async function ViewDocument({ params }: { params: { linkId: string } }) {
  const { linkId } = params
  
  // Get link and document
  const link = await getDocumentLink(linkId)
  
  // Check access controls
  if (!link.is_active) return <LinkExpired />
  if (link.expires_at && new Date(link.expires_at) < new Date()) return <LinkExpired />
  if (link.password_hash) return <PasswordProtection linkId={linkId} />
  
  // Get document
  const document = await getDocument(link.document_id)
  
  // Track view (server-side)
  const viewId = await trackDocumentView(linkId, {
    ipAddress: headers().get('x-forwarded-for') || '',
    userAgent: headers().get('user-agent') || '',
    sessionId: cookies().get('session_id')?.value || ''
  })
  
  return (
    <div>
      <PDFViewer
        documentUrl={document.file_url}
        viewId={viewId}
        onPageView={(page, time) => trackPageView(viewId, page, time)}
      />
    </div>
  )
}
```

### 5. Analytics Dashboard

```typescript
// components/features/send/analytics-dashboard.tsx
import { useEffect, useState } from 'react'
import { Line, Bar } from 'recharts'

export function AnalyticsDashboard({ documentId }: { documentId: string }) {
  const [analytics, setAnalytics] = useState(null)
  
  useEffect(() => {
    // Fetch analytics
    fetch(`/api/send/analytics/${documentId}`)
      .then(res => res.json())
      .then(setAnalytics)
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`document:${documentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'document_views',
        filter: `document_id=eq.${documentId}`
      }, (payload) => {
        // Update analytics in real-time
        setAnalytics(prev => ({
          ...prev,
          totalViews: prev.totalViews + 1
        }))
      })
      .subscribe()
    
    return () => { channel.unsubscribe() }
  }, [documentId])
  
  return (
    <div>
      <h2>Analytics</h2>
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Total Views" value={analytics?.totalViews} />
        <MetricCard title="Unique Visitors" value={analytics?.uniqueVisitors} />
        <MetricCard title="Avg Duration" value={analytics?.avgDuration} />
        <MetricCard title="Completion Rate" value={analytics?.completionRate} />
      </div>
      
      <ViewsChart data={analytics?.viewsOverTime} />
      <PageEngagement data={analytics?.pageStats} />
      <VisitorTimeline visitors={analytics?.recentVisitors} />
    </div>
  )
}
```

---

## 🔐 Access Control Implementation

### Email Verification

```typescript
// lib/send/access-control.ts
export async function requireEmailVerification(linkId: string, email: string) {
  // Generate verification code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  
  // Store in database
  await supabase
    .from('link_email_verifications')
    .insert({
      link_id: linkId,
      email,
      verification_code: code,
      expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    })
  
  // Send email
  await sendEmail({
    to: email,
    subject: 'Verify your email to view document',
    html: `Your verification code is: <strong>${code}</strong>`
  })
  
  return { success: true }
}

export async function verifyEmail(linkId: string, email: string, code: string) {
  const { data } = await supabase
    .from('link_email_verifications')
    .select()
    .eq('link_id', linkId)
    .eq('email', email)
    .eq('verification_code', code)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (!data) return { verified: false }
  
  // Mark as verified
  await supabase
    .from('link_email_verifications')
    .update({ verified: true })
    .eq('id', data.id)
  
  return { verified: true }
}
```

### TOTP/MFA

```typescript
// lib/send/totp.ts
import * as speakeasy from 'speakeasy'

export async function setupTOTPForLink(linkId: string) {
  const secret = speakeasy.generateSecret({
    name: `SendTusk (${linkId})`
  })
  
  await supabase
    .from('link_totp_secrets')
    .insert({
      link_id: linkId,
      secret: secret.base32
    })
  
  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url
  }
}

export async function verifyTOTP(linkId: string, token: string) {
  const { data } = await supabase
    .from('link_totp_secrets')
    .select('secret')
    .eq('link_id', linkId)
    .single()
  
  if (!data) return false
  
  return speakeasy.totp.verify({
    secret: data.secret,
    encoding: 'base32',
    token,
    window: 2
  })
}
```

---

## 📊 Upstash Redis Analytics

```typescript
// lib/upstash-send-analytics.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export class SendAnalytics {
  // Track document view
  static async trackView(linkId: string, viewData: any) {
    const today = new Date().toISOString().split('T')[0]
    
    await Promise.all([
      // Increment total views
      redis.hincrby(`link:${linkId}:stats`, 'total_views', 1),
      
      // Daily views
      redis.incr(`link:${linkId}:views:${today}`),
      
      // Recent views (sorted set)
      redis.zadd(`link:${linkId}:recent`, Date.now(), JSON.stringify(viewData)),
      
      // Unique visitors (set)
      redis.sadd(`link:${linkId}:visitors`, viewData.email || viewData.ipAddress),
      
      // Set expiration
      redis.expire(`link:${linkId}:views:${today}`, 86400 * 30) // 30 days
    ])
  }
  
  // Get real-time analytics
  static async getAnalytics(linkId: string) {
    const [totalViews, uniqueVisitors, recentViews] = await Promise.all([
      redis.hget(`link:${linkId}:stats`, 'total_views'),
      redis.scard(`link:${linkId}:visitors`),
      redis.zrange(`link:${linkId}:recent`, -10, -1)
    ])
    
    return {
      totalViews: totalViews || 0,
      uniqueVisitors: uniqueVisitors || 0,
      recentViews: recentViews.map(v => JSON.parse(v))
    }
  }
  
  // Publish real-time notification
  static async notifyOwner(userId: string, event: any) {
    await redis.publish(`user:${userId}:send`, JSON.stringify(event))
  }
}
```

---

## 🎨 UI Components Reference

### Share Link Modal

```typescript
// components/features/send/share-link-modal.tsx
export function ShareLinkModal({ documentId }: { documentId: string }) {
  const [link, setLink] = useState('')
  const [settings, setSettings] = useState({
    password: '',
    expiresAt: null,
    requireEmail: false,
    maxViews: null
  })
  
  const generateLink = async () => {
    const { url } = await generateShareLink(documentId, settings)
    setLink(url)
  }
  
  return (
    <Dialog>
      <DialogContent>
        <h2>Share Document</h2>
        
        {!link ? (
          <>
            <Input
              type="password"
              placeholder="Password (optional)"
              value={settings.password}
              onChange={(e) => setSettings({ ...settings, password: e.target.value })}
            />
            
            <DatePicker
              placeholder="Expiration date (optional)"
              value={settings.expiresAt}
              onChange={(date) => setSettings({ ...settings, expiresAt: date })}
            />
            
            <Checkbox
              checked={settings.requireEmail}
              onCheckedChange={(checked) => setSettings({ ...settings, requireEmail: checked })}
            >
              Require email verification
            </Checkbox>
            
            <Button onClick={generateLink}>Generate Link</Button>
          </>
        ) : (
          <>
            <Input value={link} readOnly />
            <Button onClick={() => navigator.clipboard.writeText(link)}>
              Copy Link
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🚀 API Routes

### Document Upload

```typescript
// app/api/send/documents/upload/route.ts
export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('send-documents')
    .upload(`${userId}/${Date.now()}_${file.name}`, file)
  
  if (error) return NextResponse.json({ error }, { status: 500 })
  
  // Create document record
  const { data: doc } = await supabase
    .from('shared_documents')
    .insert({
      user_id: userId,
      title: file.name,
      file_url: data.path,
      file_type: file.type,
      file_size: file.size
    })
    .select()
    .single()
  
  return NextResponse.json(doc)
}
```

### Analytics Endpoint

```typescript
// app/api/send/analytics/[linkId]/route.ts
export async function GET(req: Request, { params }: { params: { linkId: string } }) {
  const { linkId } = params
  
  // Get from Redis (real-time)
  const realtimeStats = await SendAnalytics.getAnalytics(linkId)
  
  // Get from database (detailed)
  const { data: views } = await supabase
    .from('document_views')
    .select('*')
    .eq('link_id', linkId)
  
  const { data: pageViews } = await supabase
    .from('page_views')
    .select('*')
    .in('view_id', views.map(v => v.id))
  
  return NextResponse.json({
    ...realtimeStats,
    views,
    pageStats: calculatePageStats(pageViews),
    engagementScore: calculateEngagement(views, pageViews)
  })
}
```

---

## ✅ Testing Checklist

### Unit Tests
- [ ] Link generation
- [ ] Access control validation
- [ ] Analytics calculations
- [ ] Email verification
- [ ] TOTP verification

### Integration Tests
- [ ] Document upload flow
- [ ] Share link creation
- [ ] View tracking
- [ ] Real-time notifications
- [ ] Access control enforcement

### E2E Tests
- [ ] Complete sharing workflow
- [ ] Public viewer experience
- [ ] Analytics dashboard
- [ ] Password protection
- [ ] Email verification flow

---

## 📝 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email (Resend)
RESEND_API_KEY=

# App
NEXT_PUBLIC_URL=https://yourdomain.com
```

---

## 🎯 Next Steps

1. Review this guide
2. Set up development environment
3. Run database migrations
4. Implement Phase 1 features
5. Test thoroughly
6. Deploy to staging
7. Beta test with users
8. Launch! 🚀

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-03  
**Author:** Development Team  
**Status:** Ready for Implementation

