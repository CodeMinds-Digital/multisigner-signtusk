import { supabase } from './supabase'

export interface DocumentIdSettings {
    id?: string
    user_id: string
    generation_type: 'auto' | 'custom'
    prefix: string
    separator: string
    total_length: number
    character_count: number
    number_count: number
    include_year: boolean
    include_month: boolean
    case_style: 'upper' | 'lower' | 'mixed'
    number_generation: 'random' | 'sequential' // NEW: Random or sequential number generation
    sequential_start_number: number // NEW: Starting number for sequential generation
    custom_format?: string
    ensure_uniqueness: boolean
    max_retries: number
    created_at?: string
    updated_at?: string
}

export interface CreateDocumentIdSettingsData {
    generation_type: 'auto' | 'custom'
    prefix?: string
    separator?: string
    total_length?: number
    character_count?: number
    number_count?: number
    include_year?: boolean
    include_month?: boolean
    case_style?: 'upper' | 'lower' | 'mixed'
    number_generation?: 'random' | 'sequential' // NEW: Random or sequential number generation
    sequential_start_number?: number // NEW: Starting number for sequential generation
    custom_format?: string
    ensure_uniqueness?: boolean
    max_retries?: number
}

export class DocumentIdService {
    private static readonly TABLE_NAME = 'document_id_settings'
    private static readonly SIGNING_REQUESTS_TABLE = 'signing_requests'

    /**
     * Generate a document sign ID for a user
     */
    static async generateDocumentId(userId: string): Promise<string> {
        try {
            const settings = await this.getUserSettings(userId)

            if (settings?.generation_type === 'auto') {
                return await this.generateAutoId(settings)
            }

            // Fallback to default auto-generation for users without settings
            return await this.generateDefaultId()
        } catch (error) {
            console.error('Error generating document ID:', error)
            // Fallback to simple generation
            return await this.generateDefaultId()
        }
    }

    /**
     * Validate a custom document sign ID with detailed error information
     */
    static async validateCustomId(documentSignId: string): Promise<{ isValid: boolean; error?: string }> {
        try {
            // Check if ID is not empty
            if (!documentSignId || documentSignId.trim().length === 0) {
                return { isValid: false, error: 'Document Sign ID cannot be empty' }
            }

            const trimmedId = documentSignId.trim()

            // Check length constraints
            if (trimmedId.length < 3) {
                return { isValid: false, error: 'Document Sign ID must be at least 3 characters long' }
            }

            if (trimmedId.length > 50) {
                return { isValid: false, error: 'Document Sign ID cannot exceed 50 characters' }
            }

            // Check for valid characters (alphanumeric, hyphens, underscores, dots)
            if (!/^[A-Za-z0-9\-_.]+$/.test(trimmedId)) {
                return { isValid: false, error: 'Document Sign ID can only contain letters, numbers, hyphens, underscores, and dots' }
            }

            // Check for reserved patterns
            const reservedPatterns = ['admin', 'api', 'system', 'null', 'undefined']
            if (reservedPatterns.some(pattern => trimmedId.toLowerCase().includes(pattern))) {
                return { isValid: false, error: 'Document Sign ID cannot contain reserved words' }
            }

            // Check uniqueness in database
            const { data, error } = await supabase
                .from(this.SIGNING_REQUESTS_TABLE)
                .select('id, title')
                .eq('document_sign_id', trimmedId)
                .single()

            if (error && error.code === 'PGRST116') {
                // No rows found - ID is unique
                return { isValid: true }
            }

            if (error) {
                console.error('Database error during validation:', error)
                return { isValid: false, error: 'Unable to verify ID uniqueness. Please try again.' }
            }

            // If data exists, ID is not unique
            if (data) {
                return {
                    isValid: false,
                    error: `Document Sign ID "${trimmedId}" is already used by document "${data.title}". Please choose a different ID.`
                }
            }

            return { isValid: true }
        } catch (error) {
            console.error('Error validating custom ID:', error)
            return { isValid: false, error: 'An unexpected error occurred during validation. Please try again.' }
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    static async validateCustomIdLegacy(documentSignId: string): Promise<boolean> {
        const result = await this.validateCustomId(documentSignId)
        return result.isValid
    }

    /**
     * Get user's document ID settings
     */
    static async getUserSettings(userId: string): Promise<DocumentIdSettings | null> {
        try {
            const { data, error } = await supabase
                .from(this.TABLE_NAME)
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user settings:', error)
                return null
            }

            return data || null
        } catch (error) {
            console.error('Error getting user settings:', error)
            return null
        }
    }

    /**
     * Create or update user's document ID settings
     */
    static async saveUserSettings(
        userId: string,
        settingsData: CreateDocumentIdSettingsData
    ): Promise<DocumentIdSettings | null> {
        try {
            // Check if settings already exist
            const existingSettings = await this.getUserSettings(userId)

            const settingsToSave = {
                user_id: userId,
                generation_type: settingsData.generation_type,
                prefix: settingsData.prefix || 'DOC',
                separator: settingsData.separator || '-',
                total_length: settingsData.total_length || 8,
                character_count: settingsData.character_count || 3,
                number_count: settingsData.number_count || 5,
                include_year: settingsData.include_year || false,
                include_month: settingsData.include_month || false,
                case_style: settingsData.case_style || 'upper',
                custom_format: settingsData.custom_format || null,
                ensure_uniqueness: settingsData.ensure_uniqueness !== false,
                max_retries: settingsData.max_retries || 10,
                updated_at: new Date().toISOString()
            }

            let result
            if (existingSettings) {
                // Update existing settings
                const { data, error } = await supabase
                    .from(this.TABLE_NAME)
                    .update(settingsToSave)
                    .eq('user_id', userId)
                    .select()
                    .single()

                result = { data, error }
            } else {
                // Create new settings
                const { data, error } = await supabase
                    .from(this.TABLE_NAME)
                    .insert({
                        ...settingsToSave,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                result = { data, error }
            }

            if (result.error) {
                console.error('Error saving user settings:', result.error)
                return null
            }

            return result.data
        } catch (error) {
            console.error('Error saving user settings:', error)
            return null
        }
    }

    /**
     * Generate automatic ID based on user settings
     */
    private static async generateAutoId(settings: DocumentIdSettings): Promise<string> {
        const maxRetries = settings.ensure_uniqueness ? settings.max_retries : 1

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            // Start with prefix and add separator only if it's not empty
            let id = settings.prefix
            if (settings.separator) {
                id += settings.separator
            }

            // Add date components if enabled
            if (settings.include_year || settings.include_month) {
                const now = new Date()
                if (settings.include_year) {
                    id += now.getFullYear().toString()
                }
                if (settings.include_month) {
                    id += (now.getMonth() + 1).toString().padStart(2, '0')
                }
                // Add separator after date only if it's not empty
                if (settings.separator) {
                    id += settings.separator
                }
            }

            // Use character and number counts directly (no scaling needed since total_length is calculated dynamically)
            const adjustedCharCount = settings.character_count
            const adjustedNumCount = settings.number_count

            // Generate characters
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            for (let i = 0; i < adjustedCharCount; i++) {
                let char = chars.charAt(Math.floor(Math.random() * chars.length))
                if (settings.case_style === 'lower') {
                    char = char.toLowerCase()
                } else if (settings.case_style === 'mixed') {
                    char = Math.random() > 0.5 ? char : char.toLowerCase()
                }
                id += char
            }

            // Generate numbers based on generation type
            if (settings.number_generation === 'sequential') {
                // Sequential: Get next number from database
                const nextNumber = await this.getNextSequentialNumber(settings.user_id)
                const numberStr = nextNumber.toString()

                // If the sequential number is longer than allocated space, use the full number
                // This ensures we don't truncate important sequential numbers
                if (numberStr.length > adjustedNumCount) {
                    id += numberStr
                } else {
                    // Pad with zeros if the number is shorter than allocated space
                    id += numberStr.padStart(adjustedNumCount, '0')
                }
            } else {
                // Random: Generate random numbers (default behavior)
                for (let i = 0; i < adjustedNumCount; i++) {
                    id += Math.floor(Math.random() * 10).toString()
                }
            }

            // Check uniqueness if required
            if (settings.ensure_uniqueness) {
                const isUnique = await this.validateCustomId(id)
                if (isUnique) {
                    return id
                }
            } else {
                return id
            }
        }

        // If all retries failed, fall back to default generation
        return await this.generateDefaultId()
    }

    /**
     * Generate default ID for users without settings
     */
    private static async generateDefaultId(): Promise<string> {
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        return `DOC-${timestamp}${random}`
    }

    /**
     * Generate sample IDs for preview
     */
    static async generateSampleIds(settings: CreateDocumentIdSettingsData, count: number = 3): Promise<string[]> {
        const samples: string[] = []

        // Create temporary settings object
        const tempSettings: DocumentIdSettings = {
            user_id: 'temp',
            generation_type: settings.generation_type,
            prefix: settings.prefix || 'DOC',
            separator: settings.separator !== undefined ? settings.separator : '-', // Fix: Use exact value, including empty string
            total_length: settings.total_length || 8,
            character_count: settings.character_count || 3,
            number_count: settings.number_count || 5,
            include_year: settings.include_year || false,
            include_month: settings.include_month || false,
            case_style: settings.case_style || 'upper',
            number_generation: settings.number_generation || 'random', // NEW: Include number generation
            sequential_start_number: settings.sequential_start_number || 1, // NEW: Include starting number
            custom_format: settings.custom_format || undefined,
            ensure_uniqueness: false, // Don't check uniqueness for samples
            max_retries: 1
        }

        for (let i = 0; i < count; i++) {
            if (settings.generation_type === 'auto') {
                if (settings.number_generation === 'sequential') {
                    // For sequential samples, generate predictable examples starting from the specified number
                    const startingNumber = settings.sequential_start_number || 1
                    const sample = await this.generateSequentialSample(tempSettings, startingNumber + i)
                    samples.push(sample)
                } else {
                    // For random samples, use the normal generation
                    const sample = await this.generateAutoId(tempSettings)
                    samples.push(sample)
                }
            } else {
                samples.push('CUSTOM-ID-EXAMPLE')
            }
        }

        return samples
    }

    /**
     * Generate a sequential sample for preview (doesn't check database)
     */
    private static async generateSequentialSample(settings: DocumentIdSettings, sampleNumber: number): Promise<string> {
        // Start with prefix and add separator only if it's not empty
        let id = settings.prefix
        if (settings.separator) {
            id += settings.separator
        }

        // Add date components if enabled
        if (settings.include_year || settings.include_month) {
            const now = new Date()
            if (settings.include_year) {
                id += now.getFullYear().toString()
            }
            if (settings.include_month) {
                id += (now.getMonth() + 1).toString().padStart(2, '0')
            }
            // Add separator after date only if it's not empty
            if (settings.separator) {
                id += settings.separator
            }
        }

        // Use character and number counts directly (no scaling needed since total_length is calculated dynamically)
        const adjustedCharCount = settings.character_count
        const adjustedNumCount = settings.number_count

        // Generate characters (same as random for samples)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        for (let i = 0; i < adjustedCharCount; i++) {
            let char = chars.charAt(Math.floor(Math.random() * chars.length))
            if (settings.case_style === 'lower') {
                char = char.toLowerCase()
            } else if (settings.case_style === 'mixed') {
                char = Math.random() > 0.5 ? char : char.toLowerCase()
            }
            id += char
        }

        // Generate sequential numbers for sample
        const numberStr = sampleNumber.toString()

        // If the sequential number is longer than allocated space, use the full number
        // This ensures we don't truncate important sequential numbers in samples
        if (numberStr.length > adjustedNumCount) {
            id += numberStr
        } else {
            // Pad with zeros if the number is shorter than allocated space
            id += numberStr.padStart(adjustedNumCount, '0')
        }

        return id
    }

    /**
     * Get next sequential number for a user
     */
    private static async getNextSequentialNumber(userId: string): Promise<number> {
        try {
            // Get current settings to check starting number and increment
            const { data: settings, error: settingsError } = await supabase
                .from(this.TABLE_NAME)
                .select('*')
                .eq('user_id', userId)
                .single()

            if (settingsError || !settings) {
                // If no settings found, start with 1
                return 1
            }

            const startingNumber = settings.sequential_start_number || 1

            // Get the highest existing sequential number from signing_requests
            const { data: existingRequests, error: requestsError } = await supabase
                .from(this.SIGNING_REQUESTS_TABLE)
                .select('document_sign_id')
                .eq('initiated_by', userId)
                .not('document_sign_id', 'is', null)

            if (requestsError) {
                console.error('Error fetching existing requests:', requestsError)
                return 1
            }

            // Extract sequential numbers from existing document IDs
            let maxSequential = startingNumber - 1 // Start from one less than the starting number
            if (existingRequests && existingRequests.length > 0) {
                const prefix = settings.prefix || 'DOC'
                const separator = settings.separator || ''

                existingRequests.forEach((request: { document_sign_id: string | null }) => {
                    const docId = request.document_sign_id
                    if (docId && docId.startsWith(prefix)) {
                        // Extract the numeric part from the end
                        const numericMatch = docId.match(/(\d+)$/)
                        if (numericMatch) {
                            const num = parseInt(numericMatch[1], 10)
                            if (!isNaN(num) && num > maxSequential) {
                                maxSequential = num
                            }
                        }
                    }
                })
            }

            // Ensure we don't go below the starting number
            return Math.max(maxSequential + 1, startingNumber)
        } catch (error) {
            console.error('Error getting next sequential number:', error)
            return 1
        }
    }
}