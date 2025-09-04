export interface DocumentWorkflowData {
  id?: string
  // Step 1: Upload Document
  file?: File
  fileName?: string
  fileSize?: number
  uploadProgress?: number
  
  // Step 2: Signature Selection
  signatureType?: 'single' | 'multi'
  signers?: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  
  // Step 3: Schema Setup
  schema?: any[]
  pdfTemplate?: any
  
  // Step 4: Preview & Save
  previewGenerated?: boolean
  
  // Status Management
  status: 'incomplete' | 'completed'
  currentStep: number
  completedSteps: number[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface WorkflowStepValidation {
  isValid: boolean
  canProceed: boolean
  errors: string[]
}

export class DocumentWorkflowManager {
  private data: DocumentWorkflowData

  constructor(initialData?: Partial<DocumentWorkflowData>) {
    this.data = {
      status: 'incomplete',
      currentStep: 0,
      completedSteps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...initialData
    }
  }

  // Get current workflow data
  getData(): DocumentWorkflowData {
    return { ...this.data }
  }

  // Update workflow data
  updateData(updates: Partial<DocumentWorkflowData>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date().toISOString()
    }
  }

  // Validate Step 1: Upload Document
  validateUploadStep(): WorkflowStepValidation {
    const errors: string[] = []
    
    if (!this.data.file) {
      errors.push('Please upload a PDF document')
    }
    
    if (this.data.file && this.data.file.type !== 'application/pdf') {
      errors.push('Only PDF files are supported')
    }
    
    if (this.data.uploadProgress !== 100) {
      errors.push('File upload is not complete')
    }

    return {
      isValid: errors.length === 0,
      canProceed: errors.length === 0,
      errors
    }
  }

  // Validate Step 2: Signature Selection
  validateSignatureStep(): WorkflowStepValidation {
    const errors: string[] = []
    
    if (!this.data.signatureType) {
      errors.push('Please select a signature type')
    }
    
    if (this.data.signatureType === 'multi' && (!this.data.signers || this.data.signers.length === 0)) {
      errors.push('Please add at least one signer for multi-signature documents')
    }
    
    if (this.data.signers) {
      this.data.signers.forEach((signer, index) => {
        if (!signer.name.trim()) {
          errors.push(`Signer ${index + 1}: Name is required`)
        }
        if (!signer.email.trim()) {
          errors.push(`Signer ${index + 1}: Email is required`)
        }
        if (!signer.role.trim()) {
          errors.push(`Signer ${index + 1}: Role is required`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      canProceed: errors.length === 0,
      errors
    }
  }

  // Validate Step 3: Schema Setup
  validateSchemaStep(): WorkflowStepValidation {
    const errors: string[] = []
    
    if (!this.data.schema || this.data.schema.length === 0) {
      errors.push('Please configure at least one field in the document schema')
    }
    
    if (!this.data.pdfTemplate) {
      errors.push('PDF template is not properly configured')
    }

    return {
      isValid: errors.length === 0,
      canProceed: errors.length === 0,
      errors
    }
  }

  // Validate Step 4: Preview & Save
  validatePreviewStep(): WorkflowStepValidation {
    const errors: string[] = []
    
    if (!this.data.previewGenerated) {
      errors.push('Preview has not been generated')
    }

    return {
      isValid: errors.length === 0,
      canProceed: errors.length === 0,
      errors
    }
  }

  // Get validation for current step
  getCurrentStepValidation(): WorkflowStepValidation {
    switch (this.data.currentStep) {
      case 0:
        return this.validateUploadStep()
      case 1:
        return this.validateSignatureStep()
      case 2:
        return this.validateSchemaStep()
      case 3:
        return this.validatePreviewStep()
      default:
        return { isValid: false, canProceed: false, errors: ['Invalid step'] }
    }
  }

  // Move to next step
  nextStep(): boolean {
    const validation = this.getCurrentStepValidation()
    
    if (!validation.canProceed) {
      return false
    }

    // Mark current step as completed
    if (!this.data.completedSteps.includes(this.data.currentStep)) {
      this.data.completedSteps.push(this.data.currentStep)
    }

    // Move to next step
    this.data.currentStep += 1
    this.data.updatedAt = new Date().toISOString()

    return true
  }

  // Move to previous step
  previousStep(): boolean {
    if (this.data.currentStep > 0) {
      this.data.currentStep -= 1
      this.data.updatedAt = new Date().toISOString()
      return true
    }
    return false
  }

  // Jump to specific step
  goToStep(stepIndex: number): boolean {
    if (stepIndex >= 0 && stepIndex <= 3) {
      // Only allow going to completed steps or the next immediate step
      if (this.data.completedSteps.includes(stepIndex) || stepIndex <= Math.max(...this.data.completedSteps, -1) + 1) {
        this.data.currentStep = stepIndex
        this.data.updatedAt = new Date().toISOString()
        return true
      }
    }
    return false
  }

  // Complete the workflow
  completeWorkflow(): boolean {
    // Validate all steps
    const allValidations = [
      this.validateUploadStep(),
      this.validateSignatureStep(),
      this.validateSchemaStep(),
      this.validatePreviewStep()
    ]

    const allValid = allValidations.every(v => v.isValid)
    
    if (allValid) {
      this.data.status = 'completed'
      this.data.completedAt = new Date().toISOString()
      this.data.updatedAt = new Date().toISOString()
      
      // Mark all steps as completed
      this.data.completedSteps = [0, 1, 2, 3]
      
      return true
    }
    
    return false
  }

  // Get workflow progress percentage
  getProgress(): number {
    return Math.round((this.data.completedSteps.length / 4) * 100)
  }

  // Check if workflow is complete
  isComplete(): boolean {
    return this.data.status === 'completed' && this.data.completedSteps.length === 4
  }

  // Get step status
  getStepStatus(stepIndex: number): 'pending' | 'current' | 'completed' {
    if (this.data.completedSteps.includes(stepIndex)) {
      return 'completed'
    } else if (stepIndex === this.data.currentStep) {
      return 'current'
    } else {
      return 'pending'
    }
  }

  // Save workflow to storage (mock implementation for development)
  async save(): Promise<boolean> {
    try {
      // In development mode, save to localStorage
      if (process.env.NODE_ENV === 'development') {
        const workflowId = this.data.id || `workflow-${Date.now()}`
        this.data.id = workflowId
        
        const savedWorkflows = JSON.parse(localStorage.getItem('document-workflows') || '{}')
        savedWorkflows[workflowId] = this.data
        localStorage.setItem('document-workflows', JSON.stringify(savedWorkflows))
        
        console.log('Workflow saved to localStorage:', workflowId)
        return true
      }
      
      // In production, this would save to the database
      // const result = await saveWorkflowToDatabase(this.data)
      // return result.success
      
      return true
    } catch (error) {
      console.error('Error saving workflow:', error)
      return false
    }
  }

  // Load workflow from storage
  static async load(workflowId: string): Promise<DocumentWorkflowManager | null> {
    try {
      // In development mode, load from localStorage
      if (process.env.NODE_ENV === 'development') {
        const savedWorkflows = JSON.parse(localStorage.getItem('document-workflows') || '{}')
        const workflowData = savedWorkflows[workflowId]
        
        if (workflowData) {
          return new DocumentWorkflowManager(workflowData)
        }
      }
      
      // In production, this would load from the database
      // const workflowData = await loadWorkflowFromDatabase(workflowId)
      // if (workflowData) {
      //   return new DocumentWorkflowManager(workflowData)
      // }
      
      return null
    } catch (error) {
      console.error('Error loading workflow:', error)
      return null
    }
  }

  // List all workflows
  static async listWorkflows(): Promise<DocumentWorkflowData[]> {
    try {
      // In development mode, load from localStorage
      if (process.env.NODE_ENV === 'development') {
        const savedWorkflows = JSON.parse(localStorage.getItem('document-workflows') || '{}')
        return Object.values(savedWorkflows)
      }
      
      // In production, this would load from the database
      // return await loadAllWorkflowsFromDatabase()
      
      return []
    } catch (error) {
      console.error('Error listing workflows:', error)
      return []
    }
  }
}
