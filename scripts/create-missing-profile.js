// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createMissingProfile() {
  const userId = '9779f658-d646-449b-ba55-c036ce58831b'
  const email = 'ramalai13@gmail.com'

  console.log('🔍 Checking if profile exists for user:', userId)

  // Check if profile already exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    console.log('✅ Profile already exists:', existingProfile)
    return
  }

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('❌ Error checking profile:', checkError)
    return
  }

  console.log('🔧 Creating new profile for user:', email)

  // Create the profile
  const emailName = email.split('@')[0]
  const { data: newProfile, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email: email,
      full_name: `${emailName} User`,
      first_name: emailName,
      last_name: 'User',
      account_type: 'personal',
      email_verified: true,
      onboarding_completed: false,
      plan: 'free',
      subscription_status: 'active',
      documents_count: 0,
      storage_used_mb: 0,
      monthly_documents_used: 0,
      monthly_limit: 10,
      is_admin: email === 'admin@signtusk.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (createError) {
    console.error('❌ Failed to create profile:', createError)
    return
  }

  console.log('✅ Profile created successfully:', newProfile)
}

createMissingProfile()
  .then(() => {
    console.log('🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
