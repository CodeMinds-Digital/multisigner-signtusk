// Debug utility to check Supabase configuration
export function debugSupabaseConfig() {
  console.log('=== SUPABASE DEBUG INFO ===')

  // Check environment variables
  console.log('Process.env values:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')

  // Check localStorage values (admin-managed)
  if (typeof window !== 'undefined') {
    console.log('LocalStorage values:')
    console.log('admin_env_NEXT_PUBLIC_SUPABASE_URL:', localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL'))
    console.log('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY:', localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'SET' : 'NOT SET')
  }

  // Check what values are actually being used
  const url = typeof window !== 'undefined'
    ? localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_URL

  const anonKey = typeof window !== 'undefined'
    ? localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('Final values being used:')
  console.log('URL:', url)
  console.log('Key:', anonKey ? 'SET' : 'NOT SET')

  console.log('=== END DEBUG INFO ===')

  return { url, anonKey }
}

// Simple test function
export async function testSupabaseSimple() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const { url, anonKey } = debugSupabaseConfig()

    if (!url || !anonKey) {
      return {
        success: false,
        message: 'Missing Supabase URL or anonymous key',
        debug: { url: !!url, anonKey: !!anonKey }
      }
    }

    console.log('Creating Supabase client with:', { url, keyLength: anonKey.length })

    const client = createClient(url, anonKey)

    // Test connection with auth session
    const { data, error } = await client.auth.getSession()

    if (error) {
      console.log('Supabase error:', error)
      return {
        success: false,
        message: error.message,
        debug: { error }
      }
    }

    return {
      success: true,
      message: 'Connection successful',
      debug: { data, auth: 'available' }
    }

  } catch (error: any) {
    console.error('Test failed:', error)
    return {
      success: false,
      message: error.message,
      debug: { error }
    }
  }
}
