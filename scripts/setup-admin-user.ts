#!/usr/bin/env tsx

/**
 * Script to set up the admin user for development
 * This ensures the admin user exists in both Supabase auth and user_profiles table
 */

import { supabase } from '../src/lib/supabase'

async function setupAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@signtusk.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!'

  console.log('🔧 Setting up admin user...')
  console.log(`📧 Email: ${adminEmail}`)

  try {
    // First, try to sign up the user (this will fail if user already exists, which is fine)
    console.log('📝 Creating auth user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: 'Admin User',
          first_name: 'Admin',
          last_name: 'User',
        }
      }
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      console.error('❌ Sign up error:', signUpError)
      throw signUpError
    }

    if (signUpData.user) {
      console.log('✅ Auth user created/exists:', signUpData.user.id)
    }

    // Now ensure the user profile exists
    console.log('👤 Setting up user profile...')
    
    // First check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', adminEmail)
      .single()

    if (existingProfile) {
      console.log('✅ User profile already exists')
      console.log('📊 Profile data:', {
        id: existingProfile.id,
        email: existingProfile.email,
        full_name: existingProfile.full_name,
        first_name: existingProfile.first_name,
        last_name: existingProfile.last_name,
        is_admin: existingProfile.is_admin,
        created_at: existingProfile.created_at
      })
    } else {
      // Create the profile
      console.log('📝 Creating user profile...')
      
      // Get the user ID from auth
      const { data: authUser } = await supabase.auth.getUser()
      let userId = authUser?.user?.id

      if (!userId) {
        // Try to sign in to get the user ID
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        })
        userId = signInData?.user?.id
      }

      if (!userId) {
        throw new Error('Could not get user ID')
      }

      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: adminEmail,
          full_name: 'Admin User',
          first_name: 'Admin',
          last_name: 'User',
          company_name: 'SignTusk Inc.',
          company_domain: 'signtusk.com',
          industry_field: 'Technology',
          employee_count: 50,
          job_title: 'System Administrator',
          department: 'IT',
          phone_number: '+1-555-0123',
          account_type: 'corporate',
          email_verified: true,
          company_verified: true,
          onboarding_completed: true,
          plan: 'enterprise',
          subscription_status: 'active',
          documents_count: 0,
          storage_used_mb: 0,
          monthly_documents_used: 0,
          monthly_limit: 1000,
          is_admin: true,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (profileError) {
        console.error('❌ Profile creation error:', profileError)
        throw profileError
      }

      console.log('✅ User profile created successfully')
      console.log('📊 New profile data:', {
        id: newProfile.id,
        email: newProfile.email,
        full_name: newProfile.full_name,
        first_name: newProfile.first_name,
        last_name: newProfile.last_name,
        is_admin: newProfile.is_admin,
        created_at: newProfile.created_at
      })
    }

    console.log('🎉 Admin user setup complete!')
    console.log('🔑 You can now log in with:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
setupAdminUser().then(() => {
  console.log('✅ Setup completed successfully')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})
