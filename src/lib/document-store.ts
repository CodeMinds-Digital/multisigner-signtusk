import { supabase } from './supabase'
import { createAuthenticatedSupabaseCall } from './auth-interceptor'

// Mock data for development when database tables don't exist
function getMockDocuments(): Document[] {
  return [
    {
      id: '1',
      title: 'Sample Contract.pdf',
      file_name: 'Sample Contract.pdf',
      file_url: '/mock/sample-contract.pdf',
      status: 'completed',
      user_id: 'mock-user',
      user_email: 'user@example.com',
      signers: [{ name: 'John Doe', email: 'john@example.com' }],
      signature_fields: [],
      settings: { document_type: 'contract' },
      completion_percentage: 100,
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      // Legacy fields for backward compatibility
      name: 'Sample Contract.pdf',
      document_type: 'contract',
      recipients: ['john@example.com'],
      due_date: new Date(Date.now() + 86400000).toISOString(),
      public_url: '/mock/sample-contract.pdf'
    },
    {
      id: '2',
      title: 'NDA Agreement.pdf',
      file_name: 'NDA Agreement.pdf',
      file_url: '/mock/nda-agreement.pdf',
      status: 'pending',
      user_id: 'mock-user',
      user_email: 'user@example.com',
      signers: [{ name: 'Jane Smith', email: 'jane@example.com' }],
      signature_fields: [],
      settings: { document_type: 'nda' },
      completion_percentage: 50,
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 172800000).toISOString(),
      // Legacy fields for backward compatibility
      name: 'NDA Agreement.pdf',
      document_type: 'nda',
      recipients: ['jane@example.com'],
      due_date: new Date(Date.now() + 172800000).toISOString(),
      public_url: '/mock/nda-agreement.pdf'
    },
    {
      id: '3',
      title: 'Service Agreement.pdf',
      file_name: 'Service Agreement.pdf',
      file_url: '/mock/service-agreement.pdf',
      status: 'draft',
      user_id: 'mock-user',
      user_email: 'user@example.com',
      signers: [],
      signature_fields: [],
      settings: { document_type: 'service' },
      completion_percentage: 0,
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      updated_at: new Date(Date.now() - 259200000).toISOString(),
      // Legacy fields for backward compatibility
      name: 'Service Agreement.pdf',
      document_type: 'service',
      recipients: ['client@example.com'],
      due_date: new Date(Date.now() + 259200000).toISOString(),
      public_url: '/mock/service-agreement.pdf'
    }
  ]
}



export interface Document {
  id: string
  title: string
  description?: string
  file_name?: string
  file_url?: string
  file_size_mb?: number
  status: 'pending' | 'completed' | 'draft' | 'expired' | 'cancelled'
  user_id: string
  user_email: string
  signers: any[]
  signature_fields: any[]
  settings: any
  completion_percentage?: number
  reminder_count?: number
  view_count?: number
  download_count?: number
  created_at: string
  updated_at: string
  completed_at?: string
  expires_at?: string

  // Legacy fields for backward compatibility
  name?: string
  document_type?: string
  recipients?: string[]
  due_date?: string
  public_url?: string
}



export interface DashboardStats {
  total: number
  pending: number
  completed: number
  draft: number
  expired: number
}

// Get documents for a user
export async function getDocuments(userId: string): Promise<Document[]> {
  // In development mode, always use mock data to avoid database setup issues
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Using mock documents data')
    return getMockDocuments()
  }

  return createAuthenticatedSupabaseCall(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return getMockDocuments() // Fallback to mock data
    }

    return data || []
  })
}

// Get documents by status
export async function getDocumentsByStatus(userId: string, status: string): Promise<Document[]> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`Error fetching ${status} documents:`, error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Database connection error:', error)
    return []
  }
}

// Get dashboard statistics
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  // In development mode, always use mock data to avoid database setup issues
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Using mock dashboard stats')
    return {
      total: 3,
      pending: 1,
      completed: 1,
      draft: 1,
      expired: 0
    }
  }

  try {
    const [totalResult, pendingResult, completedResult, draftResult, expiredResult] = await Promise.all([
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed'),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'draft'),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'expired')
    ])

    return {
      total: totalResult.count || 0,
      pending: pendingResult.count || 0,
      completed: completedResult.count || 0,
      draft: draftResult.count || 0,
      expired: expiredResult.count || 0
    }
  } catch {
    console.warn('Database tables not found. Using mock stats for development.')
    // Return mock stats based on our mock documents
    return {
      total: 3,
      pending: 1,
      completed: 1,
      draft: 1,
      expired: 0
    }
  }
}



// Upload document
export async function uploadDocument(
  file: File,
  documentType: string,
  userId: string
): Promise<{ success: boolean; document?: Document; error?: string }> {
  // In development mode, simulate successful upload with mock data
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Simulating document upload for', file.name)

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockDocument: Document = {
      id: `mock-${Date.now()}`,
      title: file.name,
      file_name: file.name,
      file_url: `/mock/uploads/${file.name}`,
      status: 'draft',
      user_id: userId,
      user_email: 'user@example.com',
      signers: [],
      signature_fields: [],
      settings: { document_type: documentType },
      completion_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Legacy fields for backward compatibility
      name: file.name,
      document_type: documentType,
      recipients: [],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      public_url: `/mock/uploads/${file.name}`
    }

    return { success: true, document: mockDocument }
  }

  try {
    // Generate unique identifiers
    const uniqueDocId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    const uniqueFileName = `${userId}-${Date.now()}-${uniqueDocId}`

    // Upload file to storage
    const { data: fileDetails, error: uploadError } = await supabase.storage
      .from('files')
      .upload(`public/${uniqueFileName}`, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('files')
      .getPublicUrl(fileDetails.path)

    const publicUrl = publicUrlData.publicUrl

    // Save document metadata
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert([{
        title: file.name,
        file_name: file.name,
        file_url: publicUrl,
        status: 'draft',
        user_id: userId,
        user_email: '', // Will be filled by trigger
        signers: [],
        signature_fields: [],
        settings: { document_type: documentType }
      }])
      .select()
      .single()

    if (insertError) throw insertError



    return { success: true, document }
  } catch (error) {
    console.error('Error uploading document:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
  }
}

// Update document status
export async function updateDocumentStatus(
  documentId: string,
  status: Document['status'],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating document status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' }
  }
}

// Delete document
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get document details first
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError

    // Extract file path from public URL
    const urlParts = document.file_url.split('/')
    const filePath = `public/${urlParts[urlParts.length - 1]}`

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([filePath])

    if (storageError) {
      console.warn('Error deleting file from storage:', storageError)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (deleteError) throw deleteError



    return { success: true }
  } catch (error) {
    console.error('Error deleting document:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' }
  }
}


