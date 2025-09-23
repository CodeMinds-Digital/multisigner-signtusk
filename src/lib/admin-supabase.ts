import { createClient } from '@supabase/supabase-js'

// =====================================================
// ADMIN SUPABASE CLIENT
// Uses service role key for admin operations
// =====================================================

// Create admin Supabase client with service role key (server-side only)
export function getAdminSupabase() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin Supabase client can only be used on the server side')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Export a singleton instance for convenience
let adminSupabaseInstance: ReturnType<typeof createClient> | null = null

export function getAdminSupabaseInstance() {
  if (!adminSupabaseInstance) {
    adminSupabaseInstance = getAdminSupabase()
  }
  return adminSupabaseInstance
}
