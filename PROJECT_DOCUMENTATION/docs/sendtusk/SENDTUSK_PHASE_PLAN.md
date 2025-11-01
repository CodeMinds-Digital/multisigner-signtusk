# SendTusk Implementation Phase Plan
## DocSend/PaperMark Alternative - Complete Roadmap

---

## 📊 Executive Summary

**Vision:** Build SendTusk as a modern, secure document-sharing platform with advanced analytics, positioning it as the open-source alternative to DocSend with TuskHub integration.

**Timeline:** 10-12 weeks (5 phases)

**Target Launch:** Month 3-4 of TuskHub roadmap

**Key Differentiators:**
- Seamless integration with SignTusk (share → sign workflow)
- Advanced security with TOTP/MFA and QR verification
- Real-time analytics powered by Upstash Redis
- Modern tech stack (Next.js, Supabase, TypeScript)
- Open-source foundation with enterprise features

---

## 🎯 Competitive Analysis Summary

### DocSend Core Features
✅ Document tracking with real-time notifications
✅ Page-by-page analytics
✅ Stakeholder discovery (forwarded link tracking)
✅ Custom branding and domains
✅ Dynamic watermarking
✅ Virtual data rooms
✅ Access controls (email, password, expiration)
✅ Video analytics
✅ Team collaboration
✅ Gmail/Outlook extensions

### PaperMark Core Features
✅ Shareable links with analytics
✅ Custom domains and branding
✅ Open-source, self-hosted
✅ Modern tech stack (Next.js, Prisma, PostgreSQL)
✅ Tinybird analytics integration
✅ Page-by-page tracking (in development)

### SendTusk Unique Advantages
🚀 Integration with SignTusk (share-to-sign workflow)
🚀 QR code verification for documents
🚀 TOTP/MFA for sensitive document access
🚀 Upstash Redis for real-time analytics
🚀 Supabase for scalable storage
🚀 Cross-service analytics with TuskHub
🚀 AI-powered engagement insights (future)

---

## 📅 Phase 1: Foundation & MVP (Weeks 1-2)

### Objective
Build the core document sharing infrastructure with basic analytics.

### Database Schema

```sql
-- Shared Documents Table
CREATE TABLE shared_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  thumbnail_url TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document Links Table
CREATE TABLE document_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
  link_id VARCHAR(100) UNIQUE NOT NULL, -- Short, shareable ID
  name VARCHAR(255), -- Optional link name
  is_active BOOLEAN DEFAULT true,
  password_hash TEXT, -- Optional password protection
  expires_at TIMESTAMP,
  max_views INTEGER, -- Optional view limit
  allow_download BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Basic View Tracking
CREATE TABLE document_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES document_links(id) ON DELETE CASCADE,
  viewer_id VARCHAR(255), -- Anonymous or user ID
  viewer_email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  viewed_at TIMESTAMP DEFAULT NOW(),
  duration_seconds INTEGER,
  completed_percentage INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_shared_documents_user ON shared_documents(user_id);
CREATE INDEX idx_document_links_document ON document_links(document_id);
CREATE INDEX idx_document_views_link ON document_views(link_id);
CREATE INDEX idx_document_views_viewed_at ON document_views(viewed_at);
```

### Features
- [ ] Document upload (PDF, DOCX, PPTX, images)
- [ ] File storage in Supabase Storage
- [ ] Shareable link generation with short IDs
- [ ] Public document viewer page
- [ ] Basic view tracking (who, when, IP)
- [ ] Simple analytics dashboard
- [ ] Document list view (My Documents)
- [ ] Link management (activate/deactivate)

### API Endpoints
```typescript
POST   /api/send/documents/upload
GET    /api/send/documents
GET    /api/send/documents/:id
DELETE /api/send/documents/:id
POST   /api/send/documents/:id/links
GET    /api/send/documents/:id/links
PATCH  /api/send/links/:linkId
DELETE /api/send/links/:linkId
GET    /api/send/links/:linkId/analytics
GET    /api/send/view/:linkId (public viewer)
POST   /api/send/track/view (tracking endpoint)
```

### UI Components
- `DocumentUploadModal` - Drag & drop upload
- `DocumentList` - Grid/list view of documents
- `ShareLinkModal` - Generate and copy link
- `PublicViewer` - Document viewing page
- `BasicAnalyticsDashboard` - View count, unique visitors
- `LinkSettingsPanel` - Basic link configuration

### Success Metrics
- Document upload success rate > 99%
- Link generation time < 500ms
- View tracking accuracy > 95%
- Page load time < 2s

---

## 📅 Phase 2: Core Analytics (Weeks 3-4)

### Objective
Implement advanced analytics with page-by-page tracking and real-time notifications.

### Database Schema Extensions

```sql
-- Page-Level Analytics
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  view_id UUID NOT NULL REFERENCES document_views(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Visitor Sessions
CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES document_links(id),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  viewer_id VARCHAR(255),
  viewer_email VARCHAR(255),
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  total_duration_seconds INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100)
);

-- Document Versions
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES shared_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  changes_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(document_id, version_number)
);
```

### Features
- [ ] Page-by-page view tracking
- [ ] Time spent per page analytics
- [ ] Visitor session tracking
- [ ] Real-time view notifications (Upstash)
- [ ] Document version management
- [ ] Download tracking
- [ ] Engagement scoring (completion %, time)
- [ ] Visitor timeline view
- [ ] Export analytics to CSV/PDF
- [ ] Email notifications for views

### Upstash Redis Integration
```typescript
// Real-time analytics tracking
await redis.hincrby(`doc:${linkId}:stats`, 'total_views', 1)
await redis.zadd(`doc:${linkId}:recent_views`, Date.now(), viewerId)
await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData))

// Publish real-time notifications
await redis.publish(`user:${userId}:notifications`, {
  type: 'document_viewed',
  documentId,
  viewerEmail,
  timestamp: Date.now()
})
```

### UI Components
- `AdvancedAnalyticsDashboard` - Charts and graphs
- `PageHeatmap` - Visual page engagement
- `VisitorTimeline` - Chronological view history
- `EngagementScore` - Completion and time metrics
- `RealTimeNotifications` - Live view alerts
- `VersionComparison` - Side-by-side version diff

### Success Metrics
- Page tracking accuracy > 98%
- Real-time notification latency < 1s
- Analytics query performance < 500ms
- Session tracking accuracy > 95%

---

## 📅 Phase 3: Access Controls & Security (Weeks 5-6)

### Objective
Implement comprehensive access controls and security features.

### Database Schema Extensions

```sql
-- Link Access Controls
CREATE TABLE link_access_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES document_links(id) ON DELETE CASCADE,
  require_email BOOLEAN DEFAULT false,
  allowed_emails TEXT[], -- Whitelist
  blocked_emails TEXT[], -- Blacklist
  allowed_domains TEXT[], -- e.g., ['company.com']
  blocked_domains TEXT[],
  require_totp BOOLEAN DEFAULT false,
  watermark_enabled BOOLEAN DEFAULT false,
  watermark_text VARCHAR(255),
  prevent_download BOOLEAN DEFAULT false,
  prevent_print BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Verifications
CREATE TABLE link_email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES document_links(id),
  email VARCHAR(255) NOT NULL,
  verification_code VARCHAR(10) NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TOTP for Links
CREATE TABLE link_totp_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES document_links(id) UNIQUE,
  secret VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Features
- [ ] Email verification for viewers
- [ ] Password protection for links
- [ ] Link expiration (date/time)
- [ ] View limits (max views per link)
- [ ] Domain whitelisting/blacklisting
- [ ] TOTP/MFA for sensitive documents
- [ ] IP-based access control
- [ ] Geographic restrictions
- [ ] Download prevention
- [ ] Print prevention
- [ ] Screenshot detection (watermark)
- [ ] Audit logs for access attempts

### UI Components
- `AccessControlPanel` - Comprehensive settings
- `EmailVerificationModal` - Viewer email verification
- `PasswordProtectionModal` - Set/enter password
- `TOTPSetupModal` - Configure MFA for link
- `SecurityAuditLog` - Access attempt history
- `GeographicRestrictions` - Country/region selector

### Success Metrics
- Access control effectiveness > 99%
- Email verification delivery rate > 98%
- TOTP authentication success rate > 95%
- Zero unauthorized access incidents

---

## 📅 Phase 4: Advanced Features (Weeks 7-8)

### Objective
Implement custom branding, data rooms, and team collaboration.

### Database Schema Extensions

```sql
-- Custom Branding
CREATE TABLE link_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID REFERENCES document_links(id) UNIQUE,
  team_id UUID REFERENCES teams(id),
  logo_url TEXT,
  brand_color VARCHAR(7), -- Hex color
  custom_domain VARCHAR(255),
  custom_message TEXT,
  show_powered_by BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data Rooms
CREATE TABLE data_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Room Documents
CREATE TABLE data_room_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES shared_documents(id),
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_room_id, document_id)
);

-- Data Room Links
CREATE TABLE data_room_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  link_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  password_hash TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Features
- [ ] Custom branding (logo, colors)
- [ ] Custom domains (send.yourdomain.com)
- [ ] Dynamic watermarking with viewer info
- [ ] Data rooms (multi-document collections)
- [ ] Data room analytics
- [ ] Team collaboration (shared documents)
- [ ] Document folders/organization
- [ ] Bulk link generation
- [ ] Link templates
- [ ] Custom CTAs on viewer page
- [ ] Viewer feedback collection
- [ ] NDA acceptance tracking

### UI Components
- `BrandingCustomizer` - Logo, colors, domain
- `WatermarkConfigurator` - Dynamic watermark settings
- `DataRoomBuilder` - Drag & drop document organization
- `DataRoomViewer` - Multi-document navigation
- `TeamCollaboration` - Share with team members
- `LinkTemplates` - Reusable link configurations
- `ViewerFeedbackForm` - Collect viewer responses

### Success Metrics
- Custom branding adoption > 30%
- Data room usage > 20% of users
- Team collaboration engagement > 40%
- Watermark effectiveness (screenshot deterrence)

---

## 📅 Phase 5: Integration & Polish (Weeks 9-10)

### Objective
Complete TuskHub integration, API, and enterprise features.

### Features
- [ ] Cross-service analytics (SendTusk + SignTusk)
- [ ] Unified TuskHub dashboard
- [ ] Share-to-Sign workflow integration
- [ ] Public API with authentication
- [ ] Webhooks for events
- [ ] Zapier integration
- [ ] Gmail extension
- [ ] Outlook extension
- [ ] Slack notifications
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Advanced reporting
- [ ] White-label options
- [ ] SSO/SAML support
- [ ] Compliance certifications prep

### API Documentation
```typescript
// Public API Endpoints
GET    /api/v1/send/documents
POST   /api/v1/send/documents
GET    /api/v1/send/documents/:id
PATCH  /api/v1/send/documents/:id
DELETE /api/v1/send/documents/:id
POST   /api/v1/send/documents/:id/links
GET    /api/v1/send/analytics/:linkId

// Webhooks
POST   /api/v1/webhooks (configure)
Events: document.viewed, document.downloaded, link.expired, 
        viewer.verified, data_room.accessed
```

### UI Components
- `UnifiedDashboard` - TuskHub cross-service view
- `APIDocumentation` - Interactive API docs
- `WebhookConfigurator` - Event subscriptions
- `IntegrationMarketplace` - Available integrations
- `AdvancedReporting` - Custom report builder
- `ComplianceCenter` - Security & compliance status

### Success Metrics
- Cross-service usage > 30%
- API adoption > 15% of users
- Integration usage > 25%
- Enterprise feature adoption > 10%

---

## 🛠️ Technical Architecture

### Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Supabase Edge Functions
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Analytics:** Upstash Redis
- **Email:** Resend
- **Authentication:** NextAuth.js
- **Payments:** Stripe
- **Hosting:** Vercel

### Reusable Components from SignTusk
✅ Document upload system
✅ Storage integration
✅ Analytics infrastructure (Upstash)
✅ Email system (Resend)
✅ Authentication (NextAuth)
✅ UI component library
✅ TOTP/MFA system
✅ QR verification system

### New Components Required
🆕 Link sharing system
🆕 Visitor tracking (anonymous)
🆕 Page-level analytics
🆕 Data room structure
🆕 Watermarking system
🆕 Public viewer interface
🆕 Access control engine

---

## 📊 Success Metrics & KPIs

### Platform Metrics
- **User Adoption:** 1,000+ active users in first 3 months
- **Document Shares:** 10,000+ documents shared
- **Link Views:** 100,000+ total views
- **Conversion Rate:** 5% free to paid
- **Retention:** 60% monthly active users

### Performance Metrics
- **Upload Speed:** < 3s for 10MB file
- **Link Generation:** < 500ms
- **Analytics Query:** < 500ms
- **Page Load:** < 2s
- **Uptime:** 99.9%

### Engagement Metrics
- **Avg Views per Document:** 15+
- **Avg Time per View:** 3+ minutes
- **Completion Rate:** 60%+
- **Share-to-Sign Conversion:** 10%+

---

## 🚀 Launch Checklist

### Pre-Launch (Week 9)
- [ ] Complete all Phase 1-4 features
- [ ] Security audit
- [ ] Performance testing
- [ ] Load testing (1000 concurrent viewers)
- [ ] Browser compatibility testing
- [ ] Mobile responsiveness
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Documentation complete
- [ ] Marketing materials ready
- [ ] Support team trained

### Launch Day (Week 10)
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Enable feature flags
- [ ] Send announcement emails
- [ ] Social media posts
- [ ] Product Hunt launch
- [ ] Update website
- [ ] Enable analytics tracking

### Post-Launch (Week 11-12)
- [ ] Collect user feedback
- [ ] Monitor key metrics
- [ ] Fix critical bugs
- [ ] Plan iteration 2
- [ ] Case studies
- [ ] Celebrate! 🎉

---

## 💰 Pricing Strategy

### Free Tier
- 5 documents/month
- 100 views/month
- Basic analytics
- 7-day link expiration
- TuskHub branding

### Starter ($15/user/month)
- 50 documents/month
- 1,000 views/month
- Advanced analytics
- Custom expiration
- Email verification
- Password protection

### Professional ($30/user/month)
- Unlimited documents
- Unlimited views
- Page-by-page analytics
- Custom branding
- Data rooms
- TOTP/MFA
- Custom domains
- Team collaboration

### Enterprise (Custom)
- Everything in Pro
- SSO/SAML
- White-label
- API access
- Webhooks
- Dedicated support
- SLA guarantee
- Compliance certifications

---

## 🎯 Next Steps

1. **Week 1:** Review and approve phase plan
2. **Week 1:** Set up development environment
3. **Week 1-2:** Implement Phase 1 (Foundation & MVP)
4. **Week 3:** Internal testing and feedback
5. **Week 3-4:** Implement Phase 2 (Core Analytics)
6. **Week 5:** Beta testing with select users
7. **Week 5-6:** Implement Phase 3 (Access Controls)
8. **Week 7-8:** Implement Phase 4 (Advanced Features)
9. **Week 9-10:** Implement Phase 5 (Integration & Polish)
10. **Week 10:** Public launch

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-03  
**Author:** Product Strategy Team  
**Status:** Ready for Implementation

