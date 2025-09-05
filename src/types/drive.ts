/**
 * Drive Types
 * Type definitions for document templates and drive operations
 */

export type DocumentStatus = 'draft' | 'ready' | 'pending' | 'completed' | 'expired' | 'cancelled' | 'archived'

export interface DocumentTemplate {
  id: string
  name: string
  type: string
  signature_type: 'single' | 'multi'
  status: DocumentStatus
  pdf_url?: string
  template_url?: string
  schemas: Schema[]
  created_at: string
  updated_at: string
  user_id: string
  // Additional fields that exist in the actual database
  description?: string
  template_data?: any
  category?: string
  is_public?: boolean
  is_system_template?: boolean
  usage_count?: number
}

export interface Schema {
  id: string
  type: 'text' | 'multiVariableText' | 'datetime' | 'signature' | 'checkbox' | 'radio' | 'select' | 'number' | 'email' | 'qrcode' | 'image' | 'barcodes' | 'line' | 'rectangle' | 'ellipse'
  name: string
  position: {
    x: number
    y: number
    width: number
    height: number
    page: number
  }
  properties: {
    required?: boolean
    placeholder?: string
    options?: string[] // for select, radio
    format?: string // for datetime
    validation?: {
      min?: number
      max?: number
      pattern?: string
    }
    // Additional properties for different schema types
    text?: string // for multiVariableText
    variables?: string[] // for multiVariableText
    content?: string // for multiVariableText variable values (JSON string)
    fontSize?: number
    fontColor?: string
    fontName?: string
    alignment?: string
    backgroundColor?: string
    rotate?: number
    characterSpacing?: number
    locale?: string
    opacity?: number
    [key: string]: any // Allow additional properties for extensibility
  }
  created_at: string
}

export interface DocumentUploadData {
  name: string
  type: string
  category: string
  file: File
}

export interface DocumentManagementState {
  documents: DocumentTemplate[]
  loading: boolean
  error: string | null
  selectedDocument: DocumentTemplate | null
  currentView: 'list' | 'designer'
}

export interface SupabaseStorageResponse {
  data: {
    path: string
    id: string
    fullPath: string
  } | null
  error: any
}

export interface DocumentPreviewData {
  url: string
  name: string
  size: number
  type: string
}
