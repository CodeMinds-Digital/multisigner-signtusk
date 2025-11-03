# Migration 004: Implementation Checklist

Use this checklist to track your progress implementing Migration 004.

---

## 📋 Pre-Migration Phase

### Planning & Preparation
- [ ] Read **FINAL_SQL_MIGRATION_PACKAGE.md** (overview)
- [ ] Read **MIGRATION_004_SUMMARY.md** (quick start)
- [ ] Review **004_signature_verification_fixes.sql** (understand changes)
- [ ] Identify deployment window (low traffic period)
- [ ] Notify team members of planned migration
- [ ] Review current database performance metrics (baseline)

### Environment Verification
- [ ] Verify Supabase project is accessible
- [ ] Confirm you have database admin access
- [ ] Check current database size and load
- [ ] Verify tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name IN ('signing_requests', 'signing_request_signers');
  ```
- [ ] Check current index count:
  ```sql
  SELECT COUNT(*) FROM pg_indexes 
  WHERE tablename IN ('signing_requests', 'signing_request_signers');
  ```

### Backup & Safety
- [ ] Create full database backup:
  ```bash
  supabase db dump -f backup_before_migration_004_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file exists and is not empty
- [ ] Test backup restoration process (optional but recommended)
- [ ] Document current state (table counts, index counts, etc.)
- [ ] Prepare rollback plan (review rollback script)

---

## 🚀 Migration Phase

### Step 1: Run Main Migration
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Create new query
- [ ] Copy contents of **004_signature_verification_fixes.sql**
- [ ] Paste into SQL Editor
- [ ] Review SQL one more time
- [ ] Click "Run"
- [ ] Wait for completion (should take < 1 minute)
- [ ] Check for success message
- [ ] Note any errors or warnings
- [ ] Record migration timestamp: ________________

### Step 2: Verify Migration Success
- [ ] In SQL Editor, create new query
- [ ] Copy contents of **004_verify_migration.sql**
- [ ] Paste and run
- [ ] Check Section 1: Atomic Function
  - [ ] ✅ Function exists
  - [ ] ✅ Function has correct signature
- [ ] Check Section 2: signing_requests Indexes
  - [ ] ✅ All 7 indexes created
  - [ ] ✅ Total count matches expected
- [ ] Check Section 3: signing_request_signers Indexes
  - [ ] ✅ All 7 indexes created
  - [ ] ✅ Total count matches expected
- [ ] Check Section 4: Old Indexes Removed
  - [ ] ✅ Old indexes removed
  - [ ] ✅ No warnings about remaining old indexes
- [ ] Check Section 5: Summary
  - [ ] ✅ Overall status: MIGRATION SUCCESSFUL
  - [ ] ✅ All components show correct status

### Step 3: Quick Validation
- [ ] Test atomic function:
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'increment_completed_signers';
  ```
- [ ] Count new indexes:
  ```sql
  SELECT COUNT(*) FROM pg_indexes 
  WHERE tablename = 'signing_requests' 
  AND indexname LIKE 'idx_signing_requests_%';
  -- Should return 7
  ```
- [ ] Verify old indexes gone:
  ```sql
  SELECT COUNT(*) FROM pg_indexes 
  WHERE indexname LIKE 'idx_documents_%' 
  OR indexname LIKE 'idx_document_signatures_%';
  -- Should return 0 (or only non-migration indexes)
  ```

---

## 💻 Code Update Phase

### Update SignatureService.signDocument()
- [ ] Open `src/lib/signature/core/signature-service.ts`
- [ ] Locate `signDocument()` method
- [ ] Find completion counter update logic
- [ ] Replace with atomic function call:
  ```typescript
  const { data, error } = await this.client.rpc('increment_completed_signers', {
    p_signing_request_id: requestId,
    p_total_signers: request.total_signers
  });
  
  if (error) throw createDatabaseError('Failed to update counter', error);
  
  const { new_completed_count, should_complete, current_status } = data[0];
  ```
- [ ] Add error handling
- [ ] Update completion notification logic
- [ ] Save file

### Update SignatureService.listRequests()
- [ ] Locate `listRequests()` method
- [ ] Find received requests view logic
- [ ] Replace subquery with join or two-step approach
- [ ] Choose implementation:
  - [ ] Option 1: Join approach (recommended)
  - [ ] Option 2: Two-step query
- [ ] Implement chosen approach
- [ ] Test query returns correct results
- [ ] Save file

### Update Type Definitions (if needed)
- [ ] Check if RPC return type needs to be defined
- [ ] Add type for `increment_completed_signers` result:
  ```typescript
  interface CompletionResult {
    new_completed_count: number;
    should_complete: boolean;
    current_status: string;
  }
  ```
- [ ] Update service method signatures if needed

---

## 🧪 Testing Phase

### Unit Tests
- [ ] Test atomic function directly:
  ```typescript
  describe('increment_completed_signers', () => {
    it('should increment counter atomically', async () => {
      // Test implementation
    });
  });
  ```
- [ ] Test SignatureService.signDocument() with new logic
- [ ] Test SignatureService.listRequests() received view
- [ ] Test error handling for RPC call
- [ ] All unit tests pass

### Integration Tests
- [ ] Test single signer completion
- [ ] Test multiple signers completing sequentially
- [ ] Test concurrent signing (3+ signers simultaneously)
- [ ] Test received requests query with various filters
- [ ] Test status transitions (initiated → in_progress → completed)
- [ ] All integration tests pass

### Performance Tests
- [ ] Measure query performance for user's requests:
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM signing_requests 
  WHERE initiated_by = 'user-id' AND status = 'in_progress';
  ```
- [ ] Measure query performance for received requests:
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM signing_request_signers 
  WHERE signer_email = 'user@example.com' AND status = 'pending';
  ```
- [ ] Compare with baseline metrics
- [ ] Verify performance improvement (should be 40-225x faster)
- [ ] Document performance gains

### Edge Cases
- [ ] Test with 0 signers (should handle gracefully)
- [ ] Test with 1 signer (should complete immediately)
- [ ] Test with 100+ signers (should scale)
- [ ] Test expired requests
- [ ] Test cancelled requests
- [ ] Test concurrent completion of last 2 signers
- [ ] All edge cases handled correctly

---

## 📊 Monitoring Phase

### Database Monitoring
- [ ] Check index usage:
  ```sql
  SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  WHERE tablename IN ('signing_requests', 'signing_request_signers')
  ORDER BY idx_scan DESC;
  ```
- [ ] Monitor function calls:
  ```sql
  SELECT proname, calls, total_time, mean_time
  FROM pg_stat_user_functions
  WHERE proname = 'increment_completed_signers';
  ```
- [ ] Check slow queries:
  ```sql
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE query LIKE '%signing_requests%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  ```

### Application Monitoring
- [ ] Monitor error rates in application logs
- [ ] Check for RPC-related errors
- [ ] Monitor signature completion success rate
- [ ] Track query response times
- [ ] Monitor concurrent signing scenarios
- [ ] Set up alerts for anomalies

### Performance Metrics
- [ ] Record average query time for user requests
- [ ] Record average query time for received requests
- [ ] Record average completion time
- [ ] Compare with pre-migration baseline
- [ ] Document improvements
- [ ] Share metrics with team

---

## 📝 Documentation Phase

### Update Documentation
- [ ] Update API documentation with new RPC function
- [ ] Document atomic completion counter behavior
- [ ] Update architecture diagrams if needed
- [ ] Document performance improvements
- [ ] Update troubleshooting guides

### Team Communication
- [ ] Notify team of successful migration
- [ ] Share performance metrics
- [ ] Document any issues encountered
- [ ] Update runbooks with new procedures
- [ ] Schedule knowledge sharing session

---

## ✅ Post-Migration Validation

### 24-Hour Check
- [ ] No errors in application logs
- [ ] No database errors
- [ ] Performance metrics stable
- [ ] No user complaints
- [ ] Concurrent signing working correctly

### 1-Week Check
- [ ] Index usage statistics look good
- [ ] Function call statistics normal
- [ ] No race conditions observed
- [ ] Performance improvements sustained
- [ ] All features working as expected

---

## 🎯 Success Criteria

Migration is considered successful when:

- [ ] ✅ All verification checks pass
- [ ] ✅ Code updated and deployed
- [ ] ✅ All tests pass
- [ ] ✅ Performance improved 40-225x
- [ ] ✅ No race conditions in concurrent signing
- [ ] ✅ No errors in production
- [ ] ✅ Team notified and trained
- [ ] ✅ Documentation updated

---

## 🔄 Rollback Criteria

Consider rollback if:

- [ ] ❌ Migration verification fails
- [ ] ❌ Critical errors in production
- [ ] ❌ Performance degradation
- [ ] ❌ Data corruption detected
- [ ] ❌ Unresolvable bugs introduced

### Rollback Procedure
If rollback is needed:

1. [ ] Backup current state
2. [ ] Run **004_signature_verification_fixes_rollback.sql**
3. [ ] Verify rollback success
4. [ ] Revert code changes
5. [ ] Notify team
6. [ ] Investigate issues
7. [ ] Plan re-migration

---

## 📞 Support Contacts

- **Database Admin**: ________________
- **Backend Lead**: ________________
- **DevOps**: ________________
- **On-Call**: ________________

---

## 📅 Timeline

- **Planning Started**: ________________
- **Migration Executed**: ________________
- **Code Deployed**: ________________
- **Verification Complete**: ________________
- **24-Hour Check**: ________________
- **1-Week Check**: ________________
- **Sign-Off**: ________________

---

## 📝 Notes

Use this space to record any issues, observations, or important information:

```
[Your notes here]
```

---

## ✨ Completion

- [ ] All checklist items completed
- [ ] Migration successful
- [ ] Team notified
- [ ] Documentation updated
- [ ] Monitoring in place
- [ ] **MIGRATION 004 COMPLETE! 🎉**

---

**Next Steps**: Address remaining verification comments (1-3, 5-11, 13-18)

