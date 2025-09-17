#!/usr/bin/env node

/**
 * Setup Reminder Database Functions
 * This script creates the necessary database functions and tables for the reminder system
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupReminderFunctions() {
  try {
    console.log('🚀 Setting up reminder database functions...')

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'src', 'lib', 'reminder-analytics.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 Executing SQL script...')

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    })

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not found, trying direct execution...')

      // Split SQL into individual statements and execute them
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`📝 Executing: ${statement.substring(0, 50)}...`)

          // Direct SQL execution not available via client, skip error handling
          console.log('⚠️  Direct SQL execution not available via client')
          break
        }
      }

      console.log('\n📋 Please execute the following SQL manually in your Supabase SQL Editor:')
      console.log('=' * 80)
      console.log(sqlContent)
      console.log('=' * 80)

    } else {
      console.log('✅ SQL script executed successfully!')
    }

    // Test the functions
    console.log('\n🧪 Testing reminder functions...')

    // Test can_send_reminder function
    const { error: testError } = await supabase
      .rpc('can_send_reminder', {
        p_signing_request_id: '00000000-0000-0000-0000-000000000000',
        p_initiated_by: '00000000-0000-0000-0000-000000000000'
      })

    if (testError) {
      console.log('❌ Function test failed:', testError.message)
      console.log('\n📋 Please execute the SQL file manually in Supabase SQL Editor:')
      console.log(`   File: ${sqlPath}`)
    } else {
      console.log('✅ Functions are working correctly!')
    }

  } catch (error) {
    console.error('❌ Error setting up reminder functions:', error)

    console.log('\n📋 Manual Setup Required:')
    console.log('1. Open Supabase Dashboard > SQL Editor')
    console.log('2. Copy and paste the contents of: src/lib/reminder-analytics.sql')
    console.log('3. Execute the SQL script')
    console.log('4. Restart your Next.js development server')
  }
}

// Run the setup
setupReminderFunctions()
