import { updateSupabaseConfiguration, testSupabaseConfiguration, refreshSupabaseClient, clearAdminEnvironmentOverrides, detectAndFixConfigurationMismatch } from './dynamic-supabase'

export interface EnvironmentVariable {
  key: string
  value: string
  description: string
  required: boolean
  category: 'database' | 'email' | 'auth' | 'storage' | 'api' | 'app'
  sensitive: boolean
  status: 'configured' | 'missing' | 'invalid'
  lastUpdated?: string
}

// Define all environment variables that should be managed
export const ENV_VARIABLES: Record<string, Omit<EnvironmentVariable, 'value' | 'status' | 'lastUpdated'>> = {
  NEXT_PUBLIC_SUPABASE_URL: {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL for database and authentication',
    required: true,
    category: 'database',
    sensitive: false
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key for client-side access',
    required: true,
    category: 'database',
    sensitive: true
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key for admin operations',
    required: false,
    category: 'database',
    sensitive: true
  },
  RESEND_API_KEY: {
    key: 'RESEND_API_KEY',
    description: 'Resend API key for email delivery service',
    required: true,
    category: 'email',
    sensitive: true
  },
  NEXT_PUBLIC_APP_URL: {
    key: 'NEXT_PUBLIC_APP_URL',
    description: 'Application base URL for redirects and links',
    required: true,
    category: 'app',
    sensitive: false
  },
  NEXTAUTH_SECRET: {
    key: 'NEXTAUTH_SECRET',
    description: 'NextAuth.js secret for session encryption',
    required: false,
    category: 'auth',
    sensitive: true
  },
  NEXTAUTH_URL: {
    key: 'NEXTAUTH_URL',
    description: 'NextAuth.js canonical URL',
    required: false,
    category: 'auth',
    sensitive: false
  },
  STRIPE_SECRET_KEY: {
    key: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key for payment processing',
    required: false,
    category: 'api',
    sensitive: true
  },
  STRIPE_PUBLISHABLE_KEY: {
    key: 'STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key for client-side payments',
    required: false,
    category: 'api',
    sensitive: false
  },
  WEBHOOK_SECRET: {
    key: 'WEBHOOK_SECRET',
    description: 'Secret for webhook verification',
    required: false,
    category: 'api',
    sensitive: true
  },
  NODE_ENV: {
    key: 'NODE_ENV',
    description: 'Node.js environment (development, production, test)',
    required: true,
    category: 'app',
    sensitive: false
  }
}

// Get current environment variables status
export function getEnvironmentVariables(): EnvironmentVariable[] {
  const envVars: EnvironmentVariable[] = []

  for (const [key, config] of Object.entries(ENV_VARIABLES)) {
    let value = ''
    let status: 'configured' | 'missing' | 'invalid' = 'missing'

    // Try to get value from different sources
    if (typeof window !== 'undefined') {
      // Client-side: check localStorage for admin-managed values
      const storedValue = localStorage.getItem(`admin_env_${key}`)
      if (storedValue) {
        value = storedValue
        status = 'configured'
      } else if (key.startsWith('NEXT_PUBLIC_')) {
        // Public env vars are available on client
        const publicValue = (process.env as any)[key]
        if (publicValue) {
          value = publicValue
          status = 'configured'
        }
      }
    } else {
      // Server-side: check actual environment
      const envValue = (process.env as any)[key]
      if (envValue) {
        value = envValue
        status = 'configured'
      }
    }

    // Validate value if configured
    if (status === 'configured' && value) {
      if (key.includes('URL') && !isValidUrl(value)) {
        status = 'invalid'
      } else if (key.includes('KEY') && value.length < 10) {
        status = 'invalid'
      }
    }

    envVars.push({
      ...config,
      value,
      status,
      lastUpdated: localStorage.getItem(`admin_env_${key}_updated`) || undefined
    })
  }

  return envVars
}

// Update environment variable
export async function updateEnvironmentVariable(
  key: string,
  value: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate the key exists in our configuration
    if (!ENV_VARIABLES[key]) {
      return { success: false, error: 'Unknown environment variable' }
    }

    // Validate value based on type
    const config = ENV_VARIABLES[key]
    if (config.required && !value.trim()) {
      return { success: false, error: 'This environment variable is required' }
    }

    if (key.includes('URL') && value && !isValidUrl(value)) {
      return { success: false, error: 'Invalid URL format' }
    }

    // Special validation for Supabase URL
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && value) {
      try {
        // Validate URL format
        const parsedUrl = new URL(value)
        if (!parsedUrl.hostname.includes('.supabase.co') || parsedUrl.protocol !== 'https:') {
          return { success: false, error: 'Invalid Supabase URL format. Must be https://your-project.supabase.co' }
        }

        // Check for project change (informational)
        const processUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (processUrl) {
          const processProjectId = new URL(processUrl).hostname.split('.')[0]
          const newProjectId = parsedUrl.hostname.split('.')[0]

          if (processProjectId !== newProjectId) {
            console.log(`Project change: ${processProjectId} → ${newProjectId}`)
          }
        }
      } catch (error) {
        return { success: false, error: 'Invalid Supabase URL format' }
      }
    }

    if (key.includes('KEY') && value && value.length < 10) {
      return { success: false, error: 'API key appears to be too short' }
    }

    // Store in localStorage for admin management
    console.log(`🔄 Storing environment variable ${key} in localStorage`)
    localStorage.setItem(`admin_env_${key}`, value)
    localStorage.setItem(`admin_env_${key}_updated`, new Date().toISOString())

    // Special handling for Supabase configuration updates
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      console.log(`🔄 Processing Supabase configuration update for ${key}`)

      try {
        // Get both URL and key values
        const url = key === 'NEXT_PUBLIC_SUPABASE_URL'
          ? value
          : localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || ''

        const anonKey = key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
          ? value
          : localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

        console.log('🔄 Current Supabase configuration:', {
          url: url ? `${url.substring(0, 30)}...` : 'NOT SET',
          anonKey: anonKey ? `${anonKey.substring(0, 20)}...` : 'NOT SET'
        })

        // Force refresh Supabase client immediately
        try {
          const { refreshSupabaseClient } = await import('./dynamic-supabase')
          refreshSupabaseClient()
          console.log('✅ Supabase client refreshed successfully')
        } catch (refreshError: any) {
          console.error('❌ Failed to refresh Supabase client:', refreshError)
        }

        // Update Supabase configuration if both values are available
        if (url && anonKey) {
          const supabaseResult = await updateSupabaseConfiguration(url, anonKey)
          if (!supabaseResult.success) {
            return { success: false, error: `Supabase configuration error: ${supabaseResult.message}` }
          }
          console.log('✅ Supabase configuration updated successfully')
        }

        // Dispatch custom event for real-time updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('supabase-config-updated', {
            detail: { key, value: value.substring(0, 20) + '...', timestamp: Date.now() }
          }))
        }

      } catch (supabaseError: any) {
        console.warn('⚠️ Failed to update Supabase configuration:', supabaseError.message)
        // Don't fail the entire operation, just log the warning
      }
    }



    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Delete environment variable
export async function deleteEnvironmentVariable(
  key: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Don't allow deletion of required variables
    const config = ENV_VARIABLES[key]
    if (config?.required) {
      return { success: false, error: 'Cannot delete required environment variable' }
    }

    // Remove from localStorage
    localStorage.removeItem(`admin_env_${key}`)
    localStorage.removeItem(`admin_env_${key}_updated`)



    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Test environment variable configuration
export async function testEnvironmentVariable(key: string): Promise<{ success: boolean; message: string }> {
  try {
    const envVars = getEnvironmentVariables()
    const envVar = envVars.find(v => v.key === key)

    if (!envVar || !envVar.value) {
      return { success: false, message: 'Environment variable not configured' }
    }

    switch (key) {
      case 'NEXT_PUBLIC_SUPABASE_URL':
      case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
        return await testSupabaseConfiguration()

      case 'RESEND_API_KEY':
        return await testResendConnection(envVar.value)

      case 'NEXT_PUBLIC_APP_URL':
        return testAppUrl(envVar.value)

      default:
        return { success: true, message: 'Environment variable is configured' }
    }

  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Helper function to validate URLs
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// Test Supabase connection
async function testSupabaseConnection(envVars: EnvironmentVariable[]): Promise<{ success: boolean; message: string }> {
  try {
    const url = envVars.find(v => v.key === 'NEXT_PUBLIC_SUPABASE_URL')?.value
    const key = envVars.find(v => v.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY')?.value

    if (!url || !key) {
      return { success: false, message: 'Supabase URL or key not configured' }
    }

    // Simple test: try to create a Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)

    // Test connection with a simple query
    const { error } = await supabase.from('_test_').select('*').limit(1)

    // If we get a "relation does not exist" error, that's actually good - it means we connected
    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      return { success: true, message: 'Supabase connection successful' }
    }

    if (error) {
      return { success: false, message: `Supabase connection failed: ${error.message}` }
    }

    return { success: true, message: 'Supabase connection successful' }

  } catch (error: any) {
    return { success: false, message: `Supabase test failed: ${error.message}` }
  }
}

// Test Resend connection
async function testResendConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    // Simple validation - check if key format looks correct
    if (!apiKey.startsWith('re_')) {
      return { success: false, message: 'Resend API key format appears invalid' }
    }

    if (apiKey.length < 20) {
      return { success: false, message: 'Resend API key appears too short' }
    }

    return { success: true, message: 'Resend API key format is valid' }

  } catch (error: any) {
    return { success: false, message: `Resend test failed: ${error.message}` }
  }
}

// Test App URL
function testAppUrl(url: string): { success: boolean; message: string } {
  try {
    const parsedUrl = new URL(url)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { success: false, message: 'App URL must use HTTP or HTTPS protocol' }
    }

    return { success: true, message: 'App URL format is valid' }

  } catch (error: any) {
    return { success: false, message: 'Invalid App URL format' }
  }
}

// Generate .env file content
export function generateEnvFileContent(): string {
  const envVars = getEnvironmentVariables()
  let content = '# SignTusk Environment Variables\n'
  content += '# Generated by Admin Panel\n'
  content += `# Generated on: ${new Date().toISOString()}\n\n`

  const categories = ['app', 'database', 'email', 'auth', 'api', 'storage']

  for (const category of categories) {
    const categoryVars = envVars.filter(v => v.category === category)
    if (categoryVars.length === 0) continue

    content += `# ${category.toUpperCase()} CONFIGURATION\n`

    for (const envVar of categoryVars) {
      content += `# ${envVar.description}\n`
      if (envVar.required) {
        content += `# REQUIRED\n`
      }
      content += `${envVar.key}=${envVar.value || ''}\n\n`
    }
  }

  return content
}

// Reset environment variables to process.env defaults
export async function resetEnvironmentVariablesToDefaults(
  adminUserId: string
): Promise<{ success: boolean; error?: string; resetCount?: number }> {
  try {
    let resetCount = 0

    // Clear all admin environment overrides
    clearAdminEnvironmentOverrides()

    // Count how many were reset
    Object.keys(ENV_VARIABLES).forEach(key => {
      if (typeof window !== 'undefined' && localStorage.getItem(`admin_env_${key}`)) {
        resetCount++
      }
    })

    // Refresh Supabase client if Supabase variables were reset
    refreshSupabaseClient()



    return { success: true, resetCount }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Detect and fix configuration mismatches
export async function fixConfigurationMismatch(
  adminUserId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const result = detectAndFixConfigurationMismatch()

    if (result.fixed) {
      // Configuration mismatch was fixed
    }

    return { success: true, message: result.message }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Switch to a different Supabase project (helper function)
export async function switchSupabaseProject(
  newUrl: string,
  newAnonKey: string,
  adminUserId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Validate URL format
    if (!newUrl.includes('.supabase.co')) {
      return { success: false, error: 'Invalid Supabase URL format' }
    }

    // Update both URL and key
    const urlResult = await updateEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL', newUrl, adminUserId)
    if (!urlResult.success) {
      return { success: false, error: urlResult.error }
    }

    const keyResult = await updateEnvironmentVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY', newAnonKey, adminUserId)
    if (!keyResult.success) {
      return { success: false, error: keyResult.error }
    }

    const projectId = new URL(newUrl).hostname.split('.')[0]



    return {
      success: true,
      message: `Successfully switched to Supabase project: ${projectId}`
    }

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Export environment variables for backup
export function exportEnvironmentVariables(): string {
  const envVars = getEnvironmentVariables()
  const exportData = {
    exported_at: new Date().toISOString(),
    variables: envVars.map(v => ({
      key: v.key,
      value: v.sensitive ? '***REDACTED***' : v.value,
      description: v.description,
      required: v.required,
      category: v.category,
      status: v.status
    }))
  }

  return JSON.stringify(exportData, null, 2)
}
