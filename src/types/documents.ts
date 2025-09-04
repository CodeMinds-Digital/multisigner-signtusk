export interface Document {
  id: string
  title: string
  content?: string
  file_url?: string
  file_name?: string
  file_size?: number
  status: DocumentStatus
  created_at: string
  updated_at: string
  owner_id: string
  expires_at?: string
  is_public?: boolean
  qr_code_url?: string
  signature_required?: boolean
  signatures?: Signature[]
}

export type DocumentStatus = 'draft' | 'pending' | 'completed' | 'expired' | 'cancelled'

export interface Signature {
  id: string
  document_id: string
  signer_email: string
  signer_name?: string
  signature_data?: string
  signed_at?: string
  position_x?: number
  position_y?: number
  page_number?: number
  status: 'pending' | 'signed' | 'declined'
}

export interface DocumentUpload {
  file: File
  title: string
  description?: string
  expires_at?: string
  signature_required?: boolean
  signers?: string[]
}

export interface DocumentFilter {
  status?: DocumentStatus
  search?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'created_at' | 'updated_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface DocumentStats {
  total: number
  draft: number
  pending: number
  completed: number
  expired: number
}
