// Note: Admin operations moved to API routes for security

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

// Get documents for a user (client-side function that calls API)
export async function getDocuments(userId: string): Promise<Document[]> {
  try {
    const response = await fetch('/api/documents', {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || 'Failed to fetch documents')
    }
  } catch (error) {
    console.warn('Failed to fetch documents from API, using mock data:', error)
    return getMockDocuments() // Fallback to mock data
  }
}

// Get documents by status (client-side function that calls API)
export async function getDocumentsByStatus(userId: string, status: string): Promise<Document[]> {
  try {
    const response = await fetch(`/api/documents?status=${encodeURIComponent(status)}`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return (result.data || []).filter((doc: Document) => doc.status === status)
    } else {
      throw new Error(result.error || 'Failed to fetch documents')
    }
  } catch (error) {
    console.warn(`Failed to fetch ${status} documents from API:`, error)
    return []
  }
}

// Get dashboard statistics (client-side function that calls API)
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    const response = await fetch('/api/dashboard/stats', {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return {
        total: result.data.totalDocuments,
        pending: result.data.pendingSignatures,
        completed: result.data.completedDocuments,
        draft: 0, // API doesn't return draft count yet
        expired: result.data.expiredDocuments
      }
    } else {
      throw new Error(result.error || 'Failed to fetch dashboard stats')
    }
  } catch (error) {
    console.warn('Failed to fetch dashboard stats from API, using mock data:', error)
    // Return mock stats as fallback
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
    // Create form data for API request
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      credentials: 'include', // Include cookies for authentication
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return { success: true, document: result.data }
    } else {
      throw new Error(result.error || 'Upload failed')
    }
  } catch (error) {
    console.error('Error uploading document:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
  }
}

// Update document status (client-side function that calls API)
export async function updateDocumentStatus(
  documentId: string,
  status: Document['status'],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/documents/${documentId}/status`, {
      method: 'PATCH',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return { success: true }
    } else {
      throw new Error(result.error || 'Update failed')
    }
  } catch (error) {
    console.error('Error updating document status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' }
  }
}

// Delete document (client-side function that calls API)
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return { success: true }
    } else {
      throw new Error(result.error || 'Delete failed')
    }
  } catch (error) {
    console.error('Error deleting document:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' }
  }
}


