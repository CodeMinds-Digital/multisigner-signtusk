#!/usr/bin/env node

/**
 * Verification script for Migration 004 code changes
 * Checks that the code changes were applied correctly
 */

const fs = require('fs')
const path = require('path')

console.log('╔══════════════════════════════════════════════════════════════════════════════╗')
console.log('║           Migration 004: Code Changes Verification                          ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════╝')
console.log('')

const filePath = path.join(__dirname, 'src/lib/signature/core/signature-service.ts')

// Read the file
const fileContent = fs.readFileSync(filePath, 'utf-8')

let allPassed = true

// Test 1: Check for atomic RPC call
console.log('Test 1: Checking for atomic RPC call in signDocument()...')
if (fileContent.includes("rpc('increment_completed_signers'")) {
  console.log('  ✅ PASS: Atomic RPC call found')
} else {
  console.log('  ❌ FAIL: Atomic RPC call NOT found')
  allPassed = false
}

// Test 2: Check for proper RPC parameters
console.log('\nTest 2: Checking RPC parameters...')
if (fileContent.includes('p_signing_request_id') && fileContent.includes('p_total_signers')) {
  console.log('  ✅ PASS: Correct RPC parameters found')
} else {
  console.log('  ❌ FAIL: RPC parameters incorrect or missing')
  allPassed = false
}

// Test 3: Check that old race condition code is removed
console.log('\nTest 3: Checking old race condition code is removed...')
const hasOldPattern = fileContent.includes('completed_signers: request.completed_signers + 1')
if (!hasOldPattern) {
  console.log('  ✅ PASS: Old race condition code removed')
} else {
  console.log('  ❌ FAIL: Old race condition code still present')
  allPassed = false
}

// Test 4: Check for two-step received requests query
console.log('\nTest 4: Checking for two-step received requests query...')
if (fileContent.includes("from('signing_request_signers')") && 
    fileContent.includes("select('signing_request_id')") &&
    fileContent.includes('requestIds')) {
  console.log('  ✅ PASS: Two-step query implementation found')
} else {
  console.log('  ❌ FAIL: Two-step query implementation NOT found')
  allPassed = false
}

// Test 5: Check for early return on empty signer records
console.log('\nTest 5: Checking for early return optimization...')
if (fileContent.includes('requestIds.length === 0')) {
  console.log('  ✅ PASS: Early return optimization found')
} else {
  console.log('  ❌ FAIL: Early return optimization NOT found')
  allPassed = false
}

// Test 6: Check that old subquery pattern is removed
console.log('\nTest 6: Checking old subquery pattern is removed...')
const hasOldSubquery = fileContent.match(/query\s*=\s*query\.in\('id',\s*this\.client/)
if (!hasOldSubquery) {
  console.log('  ✅ PASS: Old subquery pattern removed')
} else {
  console.log('  ❌ FAIL: Old subquery pattern still present')
  allPassed = false
}

// Test 7: Check for proper error handling
console.log('\nTest 7: Checking error handling...')
if (fileContent.includes('completionError') && fileContent.includes('signerError')) {
  console.log('  ✅ PASS: Proper error handling found')
} else {
  console.log('  ❌ FAIL: Error handling incomplete')
  allPassed = false
}

// Test 8: Check for comments explaining changes
console.log('\nTest 8: Checking for explanatory comments...')
if (fileContent.includes('atomic') || fileContent.includes('two-step')) {
  console.log('  ✅ PASS: Explanatory comments found')
} else {
  console.log('  ⚠️  WARNING: Consider adding comments explaining the changes')
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (allPassed) {
  console.log('\n✅ ALL TESTS PASSED!')
  console.log('\nMigration 004 code changes have been successfully applied.')
  console.log('\nNext steps:')
  console.log('  1. Test the application manually')
  console.log('  2. Test concurrent signing scenarios')
  console.log('  3. Test received requests view')
  console.log('  4. Monitor database performance')
  console.log('  5. Deploy to staging for testing')
} else {
  console.log('\n❌ SOME TESTS FAILED!')
  console.log('\nPlease review the failed tests and fix the issues.')
  process.exit(1)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

// Additional checks
console.log('Additional Information:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Count lines changed
const lines = fileContent.split('\n')
console.log(`\nFile: ${filePath}`)
console.log(`Total lines: ${lines.length}`)

// Find the signDocument method
const signDocumentMatch = fileContent.match(/async signDocument\([^)]+\)[^{]*{([\s\S]*?)(?=\n  \/\*\*|\n  async )/m)
if (signDocumentMatch) {
  const methodLines = signDocumentMatch[0].split('\n').length
  console.log(`signDocument method: ~${methodLines} lines`)
}

// Find the listRequests method
const listRequestsMatch = fileContent.match(/async listRequests\([^)]+\)[^{]*{([\s\S]*?)(?=\n  \/\*\*|\n  async )/m)
if (listRequestsMatch) {
  const methodLines = listRequestsMatch[0].split('\n').length
  console.log(`listRequests method: ~${methodLines} lines`)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('\n✨ Verification Complete!')
console.log('')

