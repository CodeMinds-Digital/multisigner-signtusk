# Quick Start Guide - Send Module Implementation

## 🚀 Getting Started

This guide helps you quickly start implementing the Send module improvements to achieve DocSend/Papermark 2025 parity.

---

## 📋 Step 1: Verify Database Setup (5 minutes)

### Run the verification script

1. Open Supabase SQL Editor
2. Run the verification script:
   ```sql
   \i database/VERIFY_SEND_MODULE_COMPLETE.sql
   ```
3. Check the output for any missing components

### If verification fails:

**Missing `send_export_jobs` table?**
```sql
\i database/migrations/20250109_add_send_export_jobs_table.sql
```

**Missing other tables?**
```sql
\i database/SEND_TAB_SCHEMA.sql
\i database/migrations/20250107_add_document_versioning.sql
\i database/ADD_GRANULAR_PERMISSIONS_SYSTEM.sql
\i database/INTEGRATION_COMPLIANCE_SCHEMA_UPDATE.sql
```

**Missing storage buckets?**
```sql
\i database/SEND_TAB_STORAGE_BUCKETS.sql
```

**Missing RLS policies?**
```sql
\i database/SEND_TAB_RLS_POLICIES.sql
```

---

## 📋 Step 2: Environment Setup (10 minutes)

### Required Environment Variables

Add these to your `.env.local`:

```bash
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Redis (Already configured)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Upstash QStash (Already configured)
QSTASH_URL=your_qstash_url
QSTASH_TOKEN=your_qstash_token

# Resend Email (Already configured)
RESEND_API_KEY=your_resend_key

# NEW: IP Geolocation (Choose one)
# Option 1: MaxMind (Recommended)
MAXMIND_LICENSE_KEY=your_maxmind_key

# Option 2: ipapi.co
IPAPI_KEY=your_ipapi_key

# Option 3: ip-api.com (Free, no key needed)
# No configuration required

# NEW: AI Provider (For Phase 3 - Optional)
# Option 1: OpenAI
OPENAI_API_KEY=your_openai_key

# Option 2: Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# NEW: Vector Database (For Phase 3 - Optional)
# Option 1: Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX=your_index_name

# Option 2: Supabase pgvector (Already available)
# No additional configuration needed
```

---

## 📋 Step 3: Choose Your Implementation Path

### Path A: Full Implementation (8 weeks)

Follow the complete plan in `mds/plan-compare-docsend-and-papermark-0.md`

**Timeline**:
- Week 1: Security Fixes
- Week 2: File Format Support
- Week 3: Recipient Features
- Week 4: Bulk Operations & Versioning
- Week 5-6: Permissions & Analytics Export
- Week 7-8: Enterprise Features (Optional)

**Best for**: Production-ready application with all features

### Path B: Security-First (1 week)

Implement only Phase 1 (Critical Security Fixes)

**Files to modify**:
1. `src/lib/access-control-enforcer.ts` (NEW)
2. `src/app/api/send/links/[linkId]/route.ts`
3. `src/app/api/send/dataroom-links/[slug]/route.ts`

**Best for**: Immediate security improvements

### Path C: Core Features (4 weeks)

Implement Phase 1 + Phase 2 (Security + Core Features)

**Best for**: Balanced approach with essential features

### Path D: Cherry-Pick Features

Pick individual features from the plan

**Best for**: Specific feature requirements

---

## 📋 Step 4: Start Implementation

### Week 1: Security Fixes (Recommended Start)

#### Day 1-2: Access Control Enforcer

Create `src/lib/access-control-enforcer.ts`:

```typescript
// Centralized access control enforcement
export class AccessControlEnforcer {
  // Password verification (NOT in URL)
  static async verifyPassword(linkId: string, password: string): Promise<boolean>
  
  // IP restriction check
  static async checkIPRestriction(linkId: string, ipAddress: string): Promise<boolean>
  
  // Country restriction check
  static async checkCountryRestriction(linkId: string, country: string): Promise<boolean>
  
  // Domain restriction check
  static async checkDomainRestriction(linkId: string, email: string): Promise<boolean>
  
  // Email verification check
  static async checkEmailVerification(linkId: string, email: string): Promise<boolean>
  
  // Rate limiting
  static async checkRateLimit(linkId: string, ipAddress: string): Promise<boolean>
}
```

**Reference**: See plan section "Phase 1: Critical Security Fixes"

#### Day 3-4: Update Link Access Route

Modify `src/app/api/send/links/[linkId]/route.ts`:

1. Remove password from URL parameters
2. Add POST endpoint for password verification
3. Integrate AccessControlEnforcer
4. Add rate limiting
5. Add comprehensive logging

**Reference**: See plan lines 200-250

#### Day 5: Update Data Room Access Route

Modify `src/app/api/send/dataroom-links/[slug]/route.ts`:

1. Enforce email verification
2. Integrate AccessControlEnforcer
3. Add rate limiting

**Reference**: See plan lines 251-300

---

## 📋 Step 5: Testing

### Test Security Fixes

```bash
# Test password protection
curl -X POST http://localhost:3000/api/send/links/abc123/verify-password \
  -H "Content-Type: application/json" \
  -d '{"password": "test123"}'

# Test rate limiting (should fail after 10 requests)
for i in {1..15}; do
  curl http://localhost:3000/api/send/links/abc123
done

# Test IP restriction
curl http://localhost:3000/api/send/links/abc123 \
  -H "X-Forwarded-For: 192.168.1.1"
```

### Test File Format Support

1. Upload Office document (.docx, .xlsx, .pptx)
2. Upload video file (.mp4, .webm)
3. Upload audio file (.mp3, .wav)
4. Verify rendering in viewer

### Test Recipient Dashboard

1. Share document with test email
2. Login as recipient
3. Navigate to `/send/shared-with-me`
4. Verify documents appear
5. Test filtering and search

---

## 📋 Step 6: Monitor Progress

### Use the task checklist in the plan

The plan includes a comprehensive checklist:
- [ ] Pre-implementation checklist
- [ ] Week-by-week tasks
- [ ] Testing checklist
- [ ] Success criteria

### Track completion

Update the plan document as you complete each section.

---

## 🆘 Troubleshooting

### Database Issues

**Problem**: Tables don't exist
**Solution**: Run `database/VERIFY_SEND_MODULE_COMPLETE.sql` and follow the output

**Problem**: RLS policies blocking access
**Solution**: Check user authentication and RLS policies in `database/SEND_TAB_RLS_POLICIES.sql`

### File Upload Issues

**Problem**: File upload fails
**Solution**: 
1. Check storage bucket exists
2. Check file size limits
3. Check MIME type restrictions
4. Check RLS policies on storage buckets

### Authentication Issues

**Problem**: User can't access documents
**Solution**:
1. Verify user is authenticated
2. Check RLS policies
3. Check document ownership
4. Check share link permissions

---

## 📚 Reference Documents

| Document | Purpose |
|----------|---------|
| `mds/plan-compare-docsend-and-papermark-0.md` | Complete implementation plan |
| `mds/PLAN_COMPLETION_SUMMARY.md` | Summary of what was completed |
| `mds/QUICK_START_GUIDE.md` | This guide |
| `database/VERIFY_SEND_MODULE_COMPLETE.sql` | Database verification script |
| `database/migrations/20250109_add_send_export_jobs_table.sql` | Export jobs table migration |

---

## ✅ Success Checklist

Before going to production:

- [ ] All database tables exist
- [ ] All storage buckets exist
- [ ] All RLS policies enabled
- [ ] Environment variables configured
- [ ] Security fixes implemented
- [ ] File format support working
- [ ] Recipient dashboard working
- [ ] Bulk operations working
- [ ] Version control working
- [ ] Analytics export working
- [ ] All tests passing
- [ ] Performance tested
- [ ] Security audited

---

## 🎯 Next Steps

1. ✅ Run database verification script
2. ✅ Configure environment variables
3. ✅ Choose implementation path
4. ✅ Start with Week 1 (Security Fixes)
5. ✅ Test each feature as you build
6. ✅ Monitor progress with checklist
7. ✅ Deploy to production when ready

---

**Good luck with your implementation! 🚀**

For detailed implementation notes, refer to:
`mds/plan-compare-docsend-and-papermark-0.md`

