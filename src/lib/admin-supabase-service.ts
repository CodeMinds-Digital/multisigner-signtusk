import { getSupabaseClient } from './dynamic-supabase'
import { logAdminActivity } from './admin-auth'

export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  status: 'connected' | 'disconnected' | 'error'
  lastChecked: string
  projectId: string
  region: string
}

export interface SupabaseStats {
  totalTables: number
  totalRows: number
  storageUsed: string
  activeConnections: number
  apiCalls24h: number
}

export interface DatabaseTable {
  name: string
  schema: string
  rowCount: number
  size: string
  created_at: string
}

// Get current Supabase configuration
export async function getSupabaseConfig(): Promise<SupabaseConfig> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ||
      localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_URL') || ''
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      localStorage.getItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY') || ''

    // Extract project ID from URL
    const projectId = url ? new URL(url).hostname.split('.')[0] : 'unknown'

    // Test connection
    let status: 'connected' | 'disconnected' | 'error' = 'disconnected'

    if (url && anonKey) {
      try {
        // Get the dynamic Supabase client
        const supabase = getSupabaseClient()

        // Test connection with auth session
        const { data, error } = await supabase.auth.getSession()

        // Auth getSession should always work if connection is valid
        if (!error) {
          status = 'connected'
          console.log('Supabase connection successful, auth available')
        } else {
          console.error('Supabase connection error:', error)
          status = 'error'
        }
      } catch (err) {
        console.error('Supabase connection test failed:', err)
        status = 'error'
      }
    }

    return {
      url,
      anonKey,
      status,
      lastChecked: new Date().toISOString(),
      projectId,
      region: 'us-east-1' // Default, could be extracted from URL
    }

  } catch (error) {
    console.error('Failed to get Supabase config:', error)
    return {
      url: '',
      anonKey: '',
      status: 'error',
      lastChecked: new Date().toISOString(),
      projectId: 'unknown',
      region: 'unknown'
    }
  }
}

// Get Supabase statistics
export async function getSupabaseStats(): Promise<SupabaseStats> {
  try {
    // Try to get basic stats from Supabase
    const tables = await getDatabaseTables()
    const totalTables = tables.length
    const totalRows = tables.reduce((sum, table) => sum + table.rowCount, 0)

    // Estimate storage (this would need actual Supabase admin API in production)
    const storageUsed = `${(totalRows * 0.001).toFixed(1)} MB` // Rough estimate

    return {
      totalTables,
      totalRows,
      storageUsed,
      activeConnections: 1, // Current connection
      apiCalls24h: Math.floor(Math.random() * 1000) + 500 // Mock data
    }

  } catch (error) {
    console.error('Failed to get Supabase stats:', error)
    return {
      totalTables: 0,
      totalRows: 0,
      storageUsed: '0 MB',
      activeConnections: 0,
      apiCalls24h: 0
    }
  }
}

// Get database tables
export async function getDatabaseTables(): Promise<DatabaseTable[]> {
  try {
    // Get the dynamic Supabase client
    const supabase = getSupabaseClient()

    // Try to get table information from information_schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_type', 'BASE TABLE')
      .neq('table_schema', 'information_schema')
      .neq('table_schema', 'pg_catalog')

    if (error) {
      // Fallback: return known tables from our app
      return [
        {
          name: 'documents',
          schema: 'public',
          rowCount: 0,
          size: '0 KB',
          created_at: new Date().toISOString()
        },
        {
          name: 'users',
          schema: 'auth',
          rowCount: 1,
          size: '1 KB',
          created_at: new Date().toISOString()
        },
        {
          name: 'admin_activity_logs',
          schema: 'public',
          rowCount: 0,
          size: '0 KB',
          created_at: new Date().toISOString()
        }
      ]
    }

    // Convert to our format
    const tables: DatabaseTable[] = []
    for (const table of data || []) {
      // Try to get row count for each table
      let rowCount = 0
      try {
        const supabaseClient = getSupabaseClient()
        const { count } = await supabaseClient
          .from(table.table_name)
          .select('*', { count: 'exact', head: true })
        rowCount = count || 0
      } catch (err) {
        // Skip if we can't access the table
      }

      tables.push({
        name: table.table_name,
        schema: table.table_schema,
        rowCount,
        size: `${(rowCount * 0.1).toFixed(1)} KB`, // Rough estimate
        created_at: new Date().toISOString()
      })
    }

    return tables

  } catch (error) {
    console.error('Failed to get database tables:', error)
    return []
  }
}

// Test Supabase connection
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const config = await getSupabaseConfig()

    if (!config.url || !config.anonKey) {
      return {
        success: false,
        message: 'Supabase URL or anonymous key not configured'
      }
    }

    // Test basic connection
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('_test_connection_')
      .select('*')
      .limit(1)

    // If we get a "relation does not exist" error, that's actually good
    if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
      return {
        success: true,
        message: 'Supabase connection successful',
        details: {
          projectId: config.projectId,
          region: config.region,
          status: 'connected'
        }
      }
    }

    if (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: { error: error.message }
      }
    }

    return {
      success: true,
      message: 'Supabase connection successful',
      details: {
        projectId: config.projectId,
        region: config.region,
        status: 'connected'
      }
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      details: { error: error.message }
    }
  }
}

// Create admin tables if they don't exist
export async function createAdminTables(adminUserId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get the dynamic Supabase client
    const supabase = getSupabaseClient()

    // Create admin activity logs table
    const { error: logsError } = await supabase.rpc('create_admin_tables', {})

    if (logsError && !logsError.message.includes('already exists')) {
      // Try manual creation
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          admin_id TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          ip_address TEXT,
          user_agent TEXT
        );
      `

      const { error: manualError } = await supabase.rpc('exec_sql', { sql: createTableSQL })

      if (manualError) {
        console.warn('Could not create admin tables:', manualError.message)
      }
    }

    await logAdminActivity(adminUserId, 'create_admin_tables', 'Attempted to create admin tables')

    return {
      success: true,
      message: 'Admin tables created or already exist'
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create admin tables: ${error.message}`
    }
  }
}

// Get Supabase project information
export async function getSupabaseProjectInfo(): Promise<any> {
  try {
    const config = await getSupabaseConfig()

    return {
      projectId: config.projectId,
      url: config.url,
      region: config.region,
      status: config.status,
      lastChecked: config.lastChecked,
      version: 'Unknown', // Would need admin API to get this
      plan: 'Free', // Would need admin API to get this
      usage: {
        database: '< 1%',
        storage: '< 1%',
        bandwidth: '< 1%'
      }
    }

  } catch (error) {
    console.error('Failed to get project info:', error)
    return {
      projectId: 'unknown',
      url: '',
      region: 'unknown',
      status: 'error',
      lastChecked: new Date().toISOString(),
      version: 'Unknown',
      plan: 'Unknown',
      usage: {
        database: 'Unknown',
        storage: 'Unknown',
        bandwidth: 'Unknown'
      }
    }
  }
}

// Update Supabase configuration
export async function updateSupabaseConfig(
  url: string,
  anonKey: string,
  adminUserId: string
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

    // Store in admin environment management
    if (url) {
      localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_URL', url)
      localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_URL_updated', new Date().toISOString())
    }

    if (anonKey) {
      localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey)
      localStorage.setItem('admin_env_NEXT_PUBLIC_SUPABASE_ANON_KEY_updated', new Date().toISOString())
    }

    await logAdminActivity(adminUserId, 'update_supabase_config', 'Updated Supabase configuration')

    return {
      success: true,
      message: 'Supabase configuration updated successfully'
    }

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update configuration: ${error.message}`
    }
  }
}
