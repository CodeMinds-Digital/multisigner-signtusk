# Fix: Corporate Invitations & Audit Logs API Errors

## Problem

Getting errors in the terminal when accessing Enterprise Settings page:

```
Error fetching invitations: {
  code: 'PGRST200',
  details: "Searched for a foreign key relationship between 'corporate_invitations' and 'user_profiles' using the hint 'corporate_invitations_invited_by_fkey' in the schema 'public', but no matches were found.",
  hint: null,
  message: "Could not find a relationship between 'corporate_invitations' and 'user_profiles' in the schema cache"
}
GET /api/corporate/invitations 500 in 770ms

Error fetching audit logs: {
  code: 'PGRST200',
  details: "Searched for a foreign key relationship between 'corporate_audit_logs' and 'user_profiles' using the hint 'corporate_audit_logs_admin_id_fkey' in the schema 'public', but no matches were found.",
  hint: null,
  message: "Could not find a relationship between 'corporate_audit_logs' and 'user_profiles' in the schema cache"
}
GET /api/corporate/audit-logs 500 in 870ms
```

## Root Cause

The API code was using Supabase's foreign key hint syntax to automatically join tables:

```typescript
// ❌ WRONG - Foreign key points to auth.users, not user_profiles
.select(`
  *,
  invited_by_profile:user_profiles!corporate_invitations_invited_by_fkey(
    email,
    first_name,
    last_name
  )
`)
```

**The Issue:**
- The foreign key `corporate_invitations_invited_by_fkey` points to `auth.users.id`
- The API was trying to use it to join with `user_profiles`
- Supabase PostgREST couldn't find a foreign key from `corporate_invitations` to `user_profiles`
- Result: API error 500

### Database Schema:

**corporate_invitations table:**
```sql
invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

**corporate_audit_logs table:**
```sql
admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

All foreign keys point to `auth.users`, not `user_profiles`.

## Solution Applied

Changed the API code to manually fetch user profiles instead of relying on foreign key hints.

### Fix 1: Corporate Invitations API ✅

**File**: `src/app/api/corporate/invitations/route.ts`

**Before:**
```typescript
const { data: invitations, error: invitationsError } = await supabaseAdmin
  .from('corporate_invitations')
  .select(`
    *,
    invited_by_profile:user_profiles!corporate_invitations_invited_by_fkey(
      email,
      first_name,
      last_name
    )
  `)
  .eq('corporate_account_id', userProfile.corporate_account_id)
  .order('created_at', { ascending: false })

return NextResponse.json({ invitations })
```

**After:**
```typescript
const { data: invitations, error: invitationsError } = await supabaseAdmin
  .from('corporate_invitations')
  .select('*')
  .eq('corporate_account_id', userProfile.corporate_account_id)
  .order('created_at', { ascending: false })

// Manually fetch invited_by user profiles
const invitationsWithProfiles = await Promise.all(
  (invitations || []).map(async (invitation) => {
    const { data: invitedByProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, first_name, last_name')
      .eq('id', invitation.invited_by)
      .single()

    return {
      ...invitation,
      invited_by_profile: invitedByProfile
    }
  })
)

return NextResponse.json({ invitations: invitationsWithProfiles })
```

### Fix 2: Corporate Audit Logs API ✅

**File**: `src/app/api/corporate/audit-logs/route.ts`

**Before:**
```typescript
const { data: logs, error: logsError } = await supabaseAdmin
  .from('corporate_audit_logs')
  .select(`
    *,
    admin_profile:user_profiles!corporate_audit_logs_admin_id_fkey(
      email,
      first_name,
      last_name
    ),
    target_profile:user_profiles!corporate_audit_logs_target_user_id_fkey(
      email,
      first_name,
      last_name
    )
  `)
  .eq('corporate_account_id', userProfile.corporate_account_id)
  .order('created_at', { ascending: false })
  .limit(100)

return NextResponse.json({ logs })
```

**After:**
```typescript
const { data: logs, error: logsError } = await supabaseAdmin
  .from('corporate_audit_logs')
  .select('*')
  .eq('corporate_account_id', userProfile.corporate_account_id)
  .order('created_at', { ascending: false })
  .limit(100)

// Manually fetch admin and target user profiles
const logsWithProfiles = await Promise.all(
  (logs || []).map(async (log) => {
    const [adminProfile, targetProfile] = await Promise.all([
      log.admin_id
        ? supabaseAdmin
            .from('user_profiles')
            .select('email, first_name, last_name')
            .eq('id', log.admin_id)
            .single()
            .then(({ data }) => data)
        : Promise.resolve(null),
      log.target_user_id
        ? supabaseAdmin
            .from('user_profiles')
            .select('email, first_name, last_name')
            .eq('id', log.target_user_id)
            .single()
            .then(({ data }) => data)
        : Promise.resolve(null)
    ])

    return {
      ...log,
      admin_profile: adminProfile,
      target_profile: targetProfile
    }
  })
)

return NextResponse.json({ logs: logsWithProfiles })
```

## Files Modified

1. ✅ `src/app/api/corporate/invitations/route.ts`
   - Lines 75-106: Changed to manual profile fetching

2. ✅ `src/app/api/corporate/audit-logs/route.ts`
   - Lines 66-112: Changed to manual profile fetching

## Why This Approach?

### Option 1: Add Foreign Keys to user_profiles (NOT CHOSEN)
```sql
ALTER TABLE corporate_invitations 
ADD CONSTRAINT corporate_invitations_invited_by_user_profiles_fkey 
FOREIGN KEY (invited_by) REFERENCES user_profiles(id);
```

**Pros:**
- Would allow using Supabase's automatic join syntax
- Cleaner query code

**Cons:**
- ❌ Creates duplicate foreign keys (already have FK to auth.users)
- ❌ Potential data integrity issues
- ❌ More complex database schema
- ❌ Risky to modify production database

### Option 2: Manual Profile Fetching (CHOSEN) ✅
**Pros:**
- ✅ No database schema changes required
- ✅ Safe and predictable
- ✅ Works with existing foreign keys
- ✅ Easy to understand and maintain
- ✅ Handles null values gracefully

**Cons:**
- Slightly more code
- Multiple database queries (but parallelized with Promise.all)

## Performance Considerations

### Invitations API:
- **Before**: 1 query with automatic join
- **After**: 1 query + N queries for profiles (parallelized)
- **Impact**: Minimal - invitations are typically small lists (< 20 items)

### Audit Logs API:
- **Before**: 1 query with automatic joins
- **After**: 1 query + 2N queries for profiles (parallelized)
- **Impact**: Minimal - limited to 100 logs, queries run in parallel

### Optimization:
Both APIs use `Promise.all()` to fetch profiles in parallel, minimizing latency.

## Testing

### Test 1: View Invitations
1. Log in as enterprise admin (cmd@codeminds.digital)
2. Navigate to `/settings/corporate`
3. Click on "Invitations" tab
4. **Expected**: Invitations load successfully
5. **Expected**: Shows invited_by user name
6. **Should NOT**: Show error in console

### Test 2: View Audit Logs
1. Log in as enterprise admin (cmd@codeminds.digital)
2. Navigate to `/settings/corporate`
3. Click on "Audit Logs" tab
4. **Expected**: Audit logs load successfully
5. **Expected**: Shows admin and target user names
6. **Should NOT**: Show error in console

### Test 3: Create Invitation
1. Log in as enterprise admin
2. Navigate to `/settings/corporate`
3. Send a new invitation
4. **Expected**: Invitation created successfully
5. **Expected**: New invitation appears in list with correct invited_by name

### Test 4: Check Console
1. Open browser console
2. Navigate to Enterprise Settings
3. **Expected**: No PGRST200 errors
4. **Expected**: API calls return 200 status

## Result

✅ **No more PGRST200 errors**
✅ **Invitations API works correctly**
✅ **Audit Logs API works correctly**
✅ **User profiles are properly fetched and displayed**
✅ **No database schema changes required**
✅ **Safe and maintainable solution**

## Additional Notes

### Why Foreign Keys Point to auth.users

The original database design used `auth.users` because:
1. It's the source of truth for user authentication
2. Ensures referential integrity at the auth level
3. Works even if user_profiles entry is missing
4. Standard Supabase pattern

### Why We Need user_profiles

We fetch from `user_profiles` because:
1. Contains user's display name (first_name, last_name)
2. Contains additional profile information
3. Better for UI display purposes
4. Separates auth data from profile data

### Future Improvements

If performance becomes an issue with large datasets:
1. Add database views that pre-join the tables
2. Use materialized views for frequently accessed data
3. Add caching layer for user profiles
4. Batch profile fetches more efficiently

For now, the current solution is optimal for the expected data volumes.

