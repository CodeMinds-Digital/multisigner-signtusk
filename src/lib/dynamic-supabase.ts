import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Global Supabase client instance
let supabaseClient: SupabaseClient | null = null

// Expected project ID from process.env (for reference, not strict validation)
const PROCESS_ENV_PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  : null

// Check if a URL is a valid Supabase URL format
function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname.includes('.supabase.co') && parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

// Check if URL matches process.env project (for warnings, not blocking)
function matchesProcessEnvProject(url: string): boolean {
  if (!url || !PROCESS_ENV_PROJECT_ID) return true

  try {
    const projectId = new URL(url).hostname.split('.')[0]
    return projectId === PROCESS_ENV_PROJECT_ID
  } catch {
    return false
  }
}

// Clear localStorage values (reset to defaults)
export function clearAdminEnvironmentOverrides() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_env_NEXT_PUBLIC_SUPABASE_URL')
    localStorage.removeItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY')
    localStorage.removeItem('admin_env_NEXT_PUBLIC_SUPABASE_URL_updated')
    localStorage.removeItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY_updated')
    console.log('Cleared admin environment overrides, reset to process.env defaults')
  }
}

// Get current environment values (from admin management or process.env)
function getCurrentEnvValues() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Check for admin overrides in localStorage
  if (typeof window !== 'undefined') {
    const adminUrl = localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL')
    const adminKey = localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY')

    // Use admin URL if it exists and is a valid Supabase URL
    if (adminUrl && isValidSupabaseUrl(adminUrl)) {
      url = adminUrl

      // Warn if it's a different project than process.env
      if (!matchesProcessEnvProject(adminUrl)) {
        const adminProjectId = new URL(adminUrl).hostname.split('.')[0]
        console.warn(`Using admin override for different project: ${adminProjectId} (process.env: ${PROCESS_ENV_PROJECT_ID})`)
      }
    } else if (adminUrl) {
      console.warn('Invalid admin URL format detected, using process.env instead')
    }

    // Use admin key if it exists
    if (adminKey && adminUrl && url === adminUrl) {
      anonKey = adminKey
    }
  }

  console.log('getCurrentEnvValues:', {
    isClient: typeof window !== 'undefined',
    processEnvProjectId: PROCESS_ENV_PROJECT_ID,
    url: url ? `${url.substring(0, 30)}...` : 'NOT SET',
    anonKey: anonKey ? `${anonKey.substring(0, 20)}...` : 'NOT SET',
    source: {
      url: typeof window !== 'undefined' && localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL') ? 'localStorage' : 'process.env',
      key: typeof window !== 'undefined' && localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'localStorage' : 'process.env'
    },
    validation: {
      urlValid: isValidSupabaseUrl(url),
      projectMatch: matchesProcessEnvProject(url)
    }
  })

  return { url, anonKey }
}

// Create or recreate Supabase client with current environment values
export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getCurrentEnvValues()

  if (!url || !anonKey) {
    console.error('Missing Supabase configuration:', { url: !!url, anonKey: !!anonKey })
    throw new Error(`Supabase configuration missing: ${!url ? 'URL' : ''} ${!anonKey ? 'ANON_KEY' : ''}`)
  }

  // Always check if we need to recreate the client
  const needsRecreation = !supabaseClient ||
    supabaseClient.supabaseUrl !== url ||
    supabaseClient.supabaseKey !== anonKey

  if (needsRecreation) {
    console.log('🔄 Creating new Supabase client with configuration:', {
      url,
      keyLength: anonKey.length,
      keyPrefix: anonKey.substring(0, 10) + '...',
      reason: !supabaseClient ? 'No existing client' : 'Configuration changed',
      previousUrl: supabaseClient?.supabaseUrl,
      newUrl: url
    })

    try {
      // Clear the old client
      supabaseClient = null

      // Create new client
      supabaseClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })

      console.log('✅ Supabase client created successfully:', {
        url: supabaseClient.supabaseUrl,
        keyLength: supabaseClient.supabaseKey.length
      })

      // Trigger a custom event to notify components of client change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-client-updated', {
          detail: { url, keyLength: anonKey.length }
        }))
      }

    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error)
      throw error
    }
  } else {
    console.log('♻️ Reusing existing Supabase client:', {
      url: supabaseClient.supabaseUrl,
      keyLength: supabaseClient.supabaseKey.length
    })
  }

  return supabaseClient
}

// Force refresh the Supabase client (call after updating environment variables)
export function refreshSupabaseClient(): SupabaseClient {
  supabaseClient = null // Force recreation
  return getSupabaseClient()
}

// Test the current Supabase configuration
export async function testSupabaseConfiguration(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('Testing Supabase configuration...')
    const { url, anonKey } = getCurrentEnvValues()

    if (!url || !anonKey) {
      return {
        success: false,
        message: 'Missing Supabase configuration',
        details: { url: !!url, anonKey: !!anonKey }
      }
    }

    const client = getSupabaseClient()
    console.log('Got Supabase client, testing connection...')

    // Test with auth session which should always be available
    const { data, error } = await client.auth.getSession()

    console.log('Supabase test query result:', { data, error })

    if (error) {
      console.error('Supabase connection error:', error)
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: {
          error: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      }
    }

    console.log('Connection successful, auth available')
    return {
      success: true,
      message: 'Supabase connection successful',
      details: {
        url: client.supabaseUrl,
        connected: true,
        timestamp: new Date().toISOString(),
        auth: 'available',
        session: data?.session ? 'active' : 'none'
      }
    }

  } catch (error: any) {
    console.error('Connection test exception:', error)
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack
      }
    }
  }
}

// Get current Supabase configuration info
export function getSupabaseInfo() {
  const { url, anonKey } = getCurrentEnvValues()

  return {
    url: url || 'Not configured',
    anonKey: anonKey || 'Not configured',
    isConfigured: !!(url && anonKey),
    client: supabaseClient ? {
      url: supabaseClient.supabaseUrl,
      key: supabaseClient.supabaseKey
    } : null
  }
}

// Update Supabase configuration and refresh client
export async function updateSupabaseConfiguration(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate URL format
    if (url && !url.startsWith('https://') && !url.includes('.supabase.co')) {
      return {
        success: false,
        message: 'Invalid Supabase URL format. Should be https://your-project.supabase.co'
      }
    }

    // Validate key format
    if (anonKey && !anonKey.startsWith('eyJ')) {
      return {
        success: false,
        message: 'Invalid Supabase anonymous key format'
      }
    }

    // Store in localStorage for admin management
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_URL', url)
        localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_URL_updated', new Date().toISOString())
      }

      if (anonKey) {
        localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey)
        localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY_updated', new Date().toISOString())
      }
    }

    // Refresh the Supabase client with new configuration
    refreshSupabaseClient()

    // Test the new configuration
    const testResult = await testSupabaseConfiguration()

    if (!testResult.success) {
      return {
        success: false,
        message: `Configuration updated but connection test failed: ${testResult.message}`
      }
    }

    return {
      success: true,
      message: 'Supabase configuration updated and tested successfully'
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update configuration: ${error.message}`
    }
  }
}

// Detect configuration status and provide information
export function detectAndFixConfigurationMismatch(): { fixed: boolean; message: string } {
  if (typeof window === 'undefined') {
    return { fixed: false, message: 'Server-side, no localStorage to check' }
  }

  const processUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const adminUrl = localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL')

  if (!adminUrl) {
    return { fixed: false, message: 'Using process.env defaults (no admin overrides)' }
  }

  // Check if admin URL is valid Supabase URL
  if (!isValidSupabaseUrl(adminUrl)) {
    console.warn('Invalid admin URL format detected, clearing')
    clearAdminEnvironmentOverrides()
    refreshSupabaseClient()

    return {
      fixed: true,
      message: 'Fixed invalid URL format: cleared localStorage and reset to process.env'
    }
  }

  // Check if it's a different project (informational, not an error)
  if (processUrl && !matchesProcessEnvProject(adminUrl)) {
    const processProjectId = processUrl ? new URL(processUrl).hostname.split('.')[0] : 'unknown'
    const adminProjectId = adminUrl ? new URL(adminUrl).hostname.split('.')[0] : 'unknown'

    return {
      fixed: false,
      message: `Using admin override: ${adminProjectId} (process.env: ${processProjectId})`
    }
  }

  return { fixed: false, message: 'Configuration is consistent with process.env' }
}

// Export a getter function instead of creating client immediately
export function getSupabase() {
  return getSupabaseClient()
}
