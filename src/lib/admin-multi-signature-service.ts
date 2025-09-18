import { supabaseAdmin } from './supabase-admin'

export interface AdminMultiSignatureRequest {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'declined' | 'expired' | 'pdf_generation_failed'
  signingMode: 'sequential' | 'parallel'
  totalSigners: number
  signedCount: number
  viewedCount: number
  createdAt: string
  expiresAt: string
  initiatedBy: string
  errorMessage?: string
  nextSignerEmail?: string
  finalPdfUrl?: string
  signers: Array<{
    email: string
    name: string
    status: string
    signedAt?: string
    viewedAt?: string
    order: number
  }>
}

export interface MultiSignatureStats {
  inProgress: number
  needAttention: number
  completed: number
  total: number
  todayCreated: number
  todayCompleted: number
}

/**
 * Get all multi-signature requests with full details
 */
export async function getMultiSignatureRequests(): Promise<AdminMultiSignatureRequest[]> {
  try {
    console.log('🔍 Fetching multi-signature requests from database...')

    // Get signing requests with document details
    const { data: signingRequests, error: requestsError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        id,
        title,
        status,
        document_status,
        created_at,
        expires_at,
        completed_at,
        final_pdf_url,
        error_message,
        document:documents!document_template_id(
          signing_mode,
          created_by
        )
      `)
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('❌ Error fetching signing requests:', requestsError)
      return []
    }

    if (!signingRequests || signingRequests.length === 0) {
      console.log('📝 No signing requests found')
      return []
    }

    console.log(`📋 Found ${signingRequests.length} signing requests`)

    // Get signers for all requests
    const requestIds = signingRequests.map(req => req.id)
    const { data: allSigners, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .in('signing_request_id', requestIds)
      .order('signing_order', { ascending: true })

    if (signersError) {
      console.error('❌ Error fetching signers:', signersError)
      return []
    }

    console.log(`👥 Found ${allSigners?.length || 0} signers`)

    // Transform data to admin format
    const adminRequests: AdminMultiSignatureRequest[] = signingRequests.map(request => {
      const requestSigners = allSigners?.filter(s => s.signing_request_id === request.id) || []
      
      const signedCount = requestSigners.filter(s => 
        s.status === 'signed' || s.signer_status === 'signed'
      ).length
      
      const viewedCount = requestSigners.filter(s => s.viewed_at).length
      
      // Find next signer for sequential mode
      let nextSignerEmail: string | undefined
      if (request.document?.signing_mode === 'sequential' && signedCount < requestSigners.length) {
        const nextSigner = requestSigners.find(s => 
          s.status !== 'signed' && 
          s.signer_status !== 'signed' && 
          s.status !== 'declined'
        )
        nextSignerEmail = nextSigner?.signer_email
      }

      return {
        id: request.id,
        title: request.title,
        status: request.status as any,
        signingMode: request.document?.signing_mode || 'parallel',
        totalSigners: requestSigners.length,
        signedCount,
        viewedCount,
        createdAt: request.created_at,
        expiresAt: request.expires_at,
        initiatedBy: request.document?.created_by || 'unknown',
        errorMessage: request.error_message,
        nextSignerEmail,
        finalPdfUrl: request.final_pdf_url,
        signers: requestSigners.map(signer => ({
          email: signer.signer_email,
          name: signer.signer_name,
          status: signer.status || signer.signer_status || 'pending',
          signedAt: signer.signed_at,
          viewedAt: signer.viewed_at,
          order: signer.signing_order
        }))
      }
    })

    console.log(`✅ Transformed ${adminRequests.length} requests for admin view`)
    return adminRequests

  } catch (error) {
    console.error('❌ Error in getMultiSignatureRequests:', error)
    return []
  }
}

/**
 * Get multi-signature statistics for dashboard
 */
export async function getMultiSignatureStats(): Promise<MultiSignatureStats> {
  try {
    console.log('📊 Calculating multi-signature statistics...')

    const { data: requests, error } = await supabaseAdmin
      .from('signing_requests')
      .select('status, created_at')

    if (error) {
      console.error('❌ Error fetching stats:', error)
      return {
        inProgress: 0,
        needAttention: 0,
        completed: 0,
        total: 0,
        todayCreated: 0,
        todayCompleted: 0
      }
    }

    const total = requests?.length || 0
    const inProgress = requests?.filter(r => r.status === 'in_progress').length || 0
    const needAttention = requests?.filter(r => 
      r.status === 'pdf_generation_failed' || r.status === 'declined'
    ).length || 0
    const completed = requests?.filter(r => r.status === 'completed').length || 0

    // Calculate today's stats
    const today = new Date().toISOString().split('T')[0]
    const todayCreated = requests?.filter(r => 
      r.created_at.startsWith(today)
    ).length || 0
    
    const todayCompleted = requests?.filter(r => 
      r.status === 'completed' && r.created_at.startsWith(today)
    ).length || 0

    const stats = {
      inProgress,
      needAttention,
      completed,
      total,
      todayCreated,
      todayCompleted
    }

    console.log('📊 Multi-signature stats:', stats)
    return stats

  } catch (error) {
    console.error('❌ Error calculating stats:', error)
    return {
      inProgress: 0,
      needAttention: 0,
      completed: 0,
      total: 0,
      todayCreated: 0,
      todayCompleted: 0
    }
  }
}

/**
 * Get requests that need admin attention
 */
export async function getRequestsNeedingAttention(): Promise<AdminMultiSignatureRequest[]> {
  try {
    const allRequests = await getMultiSignatureRequests()
    
    return allRequests.filter(request => 
      request.status === 'pdf_generation_failed' ||
      request.status === 'declined' ||
      request.status === 'expired' ||
      (request.status === 'in_progress' && new Date(request.expiresAt) < new Date())
    )
  } catch (error) {
    console.error('❌ Error getting requests needing attention:', error)
    return []
  }
}

/**
 * Search multi-signature requests
 */
export async function searchMultiSignatureRequests(
  searchTerm: string,
  statusFilter?: string,
  modeFilter?: string
): Promise<AdminMultiSignatureRequest[]> {
  try {
    const allRequests = await getMultiSignatureRequests()
    
    return allRequests.filter(request => {
      const matchesSearch = !searchTerm || 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.initiatedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.signers.some(s => 
          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      
      const matchesStatus = !statusFilter || statusFilter === 'all' || request.status === statusFilter
      const matchesMode = !modeFilter || modeFilter === 'all' || request.signingMode === modeFilter
      
      return matchesSearch && matchesStatus && matchesMode
    })
  } catch (error) {
    console.error('❌ Error searching requests:', error)
    return []
  }
}

/**
 * Get detailed request information by ID
 */
export async function getRequestDetails(requestId: string): Promise<AdminMultiSignatureRequest | null> {
  try {
    const allRequests = await getMultiSignatureRequests()
    return allRequests.find(r => r.id === requestId) || null
  } catch (error) {
    console.error('❌ Error getting request details:', error)
    return null
  }
}
