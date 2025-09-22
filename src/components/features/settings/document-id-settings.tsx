'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Eye, RefreshCw, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { DocumentIdService, CreateDocumentIdSettingsData, type DocumentIdSettings } from '@/lib/document-id-service'

export function DocumentIdSettings() {
    const { user } = useAuth()
    const [settings, setSettings] = useState<DocumentIdSettings | null>(null)
    const [formData, setFormData] = useState<CreateDocumentIdSettingsData>(() => {
        const defaultData = {
            generation_type: 'auto',
            prefix: 'DOC',
            separator: '-',
            character_count: 3,
            number_count: 5,
            include_year: false,
            include_month: false,
            case_style: 'upper',
            number_generation: 'random', // NEW: Default to random
            sequential_start_number: 1, // NEW: Default starting number
            ensure_uniqueness: true,
            max_retries: 10
        } as CreateDocumentIdSettingsData

        // Calculate correct total length from the start
        const prefixLength = (defaultData.prefix || 'DOC').length
        const separatorLength = (defaultData.separator || '-').length
        const dateLength = (defaultData.include_year ? 4 : 0) + (defaultData.include_month ? 2 : 0)
        const dateSeparatorLength = (defaultData.include_year || defaultData.include_month) ? separatorLength : 0
        const characterLength = defaultData.character_count || 0
        const numberLength = defaultData.number_count || 0
        const mainSeparatorLength = separatorLength

        const total_length = prefixLength + mainSeparatorLength + dateLength + dateSeparatorLength + characterLength + numberLength

        return {
            ...defaultData,
            total_length
        }
    })
    const [startingNumberInput, setStartingNumberInput] = useState('1') // Local state for input field
    const [sampleIds, setSampleIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [warnings, setWarnings] = useState<string[]>([]) // NEW: Array of warning messages
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}) // NEW: Field-specific errors

    // Load user settings on component mount
    useEffect(() => {
        if (user) {
            loadUserSettings()
        }
    }, [user])

    // Update sample IDs when form data changes
    useEffect(() => {
        if (formData.generation_type === 'auto') {
            generateSampleIds()
        } else {
            setSampleIds(['Enter your custom ID when creating signature requests'])
        }
    }, [formData])



    const loadUserSettings = async () => {
        if (!user) return

        setLoading(true)
        try {
            const userSettings = await DocumentIdService.getUserSettings(user.id)
            if (userSettings) {
                setSettings(userSettings)
                const startingNumber = userSettings.sequential_start_number || 1
                const loadedData = {
                    generation_type: userSettings.generation_type,
                    prefix: userSettings.prefix,
                    separator: userSettings.separator,
                    character_count: userSettings.character_count,
                    number_count: userSettings.number_count,
                    include_year: userSettings.include_year,
                    include_month: userSettings.include_month,
                    case_style: userSettings.case_style,
                    number_generation: userSettings.number_generation || 'random', // NEW: Include number generation
                    sequential_start_number: startingNumber, // NEW: Include starting number
                    custom_format: userSettings.custom_format,
                    ensure_uniqueness: userSettings.ensure_uniqueness,
                    max_retries: userSettings.max_retries
                } as CreateDocumentIdSettingsData

                // Calculate total length based on loaded components (in case it's out of sync)
                const calculatedTotalLength = calculateTotalLength(loadedData)

                setFormData({
                    ...loadedData,
                    total_length: calculatedTotalLength
                })
                setStartingNumberInput(startingNumber.toString()) // Sync local input state
            }
        } catch (err) {
            console.error('Error loading user settings:', err)
            setError('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const generateSampleIds = async () => {
        try {
            const samples = await DocumentIdService.generateSampleIds(formData, 3)
            setSampleIds(samples)
        } catch (err) {
            console.error('Error generating sample IDs:', err)
            setSampleIds(['Error generating samples'])
        }
    }

    const calculateTotalLength = (data: CreateDocumentIdSettingsData): number => {
        const prefixLength = (data.prefix || 'DOC').length
        const separatorLength = (data.separator || '-').length
        const dateLength = (data.include_year ? 4 : 0) + (data.include_month ? 2 : 0)
        const dateSeparatorLength = (data.include_year || data.include_month) ? separatorLength : 0
        const characterLength = data.character_count || 0
        const numberLength = data.number_count || 0
        const mainSeparatorLength = separatorLength

        return prefixLength + mainSeparatorLength + dateLength + dateSeparatorLength + characterLength + numberLength
    }

    const handleFormChange = (field: keyof CreateDocumentIdSettingsData, value: any) => {
        // Clear previous errors for this field
        setFieldErrors(prev => {
            const updated = { ...prev }
            delete updated[field]
            return updated
        })
        setError('') // Clear general error

        setFormData(prev => {
            const updated = { ...prev, [field]: value }

            // Auto-adjust character and number counts when total length changes manually
            if (field === 'total_length') {
                const prefixLength = (updated.prefix || 'DOC').length + (updated.separator || '-').length
                const dateLength = (updated.include_year ? 4 : 0) + (updated.include_month ? 2 : 0) +
                    (updated.include_year || updated.include_month ? (updated.separator || '-').length : 0)
                const availableLength = Math.max(0, value - prefixLength - dateLength)

                // Distribute available length between characters and numbers
                const charCount = updated.character_count || 0
                const numCount = updated.number_count || 0
                const charRatio = charCount / (charCount + numCount)
                updated.character_count = Math.floor(availableLength * charRatio)
                updated.number_count = availableLength - updated.character_count
            }
            // Auto-calculate total length when component lengths change
            else if (['prefix', 'separator', 'character_count', 'number_count', 'include_year', 'include_month'].includes(field)) {
                updated.total_length = calculateTotalLength(updated)
            }

            return updated
        })

        // Trigger validation after a short delay to avoid excessive validation during typing
        setTimeout(() => {
            validateFormData()
        }, 300)
    }

    const saveSettings = async () => {
        if (!user) return

        setSaving(true)
        setError('')
        setSuccess('')

        try {
            // Run comprehensive validation
            const isValid = validateFormData()
            if (!isValid) {
                setError('Please fix the validation errors before saving.')
                setSaving(false)
                return
            }

            const result = await DocumentIdService.saveUserSettings(user.id, formData)
            if (result) {
                setSettings(result)
                setSuccess('Settings saved successfully! Your new Document Sign ID configuration is now active.')
                setFieldErrors({}) // Clear any remaining field errors
                setWarnings([]) // Clear warnings after successful save
                setTimeout(() => setSuccess(''), 5000)
            } else {
                setError('Failed to save settings. Please check your configuration and try again.')
            }
        } catch (err) {
            console.error('Error saving settings:', err)
            if (err instanceof Error) {
                setError(`Failed to save settings: ${err.message}`)
            } else {
                setError('An unexpected error occurred while saving settings. Please try again.')
            }
        } finally {
            setSaving(false)
        }
    }

    // NEW: Comprehensive validation functions
    const validateFormData = () => {
        const errors: Record<string, string> = {}
        const warnings: string[] = []

        // Validate prefix
        if (!formData.prefix || formData.prefix.trim().length === 0) {
            errors.prefix = 'Prefix is required'
        } else if (formData.prefix.length > 10) {
            errors.prefix = 'Prefix must be 10 characters or less'
        } else if (!/^[A-Za-z0-9-_]+$/.test(formData.prefix)) {
            errors.prefix = 'Prefix can only contain letters, numbers, hyphens, and underscores'
        }

        // Validate separator
        if (formData.separator && formData.separator.length > 3) {
            errors.separator = 'Separator must be 3 characters or less'
        }

        // Validate character count
        if (formData.character_count !== undefined && (formData.character_count < 0 || formData.character_count > 20)) {
            errors.character_count = 'Character count must be between 0 and 20'
        }

        // Validate number count
        if (formData.number_count !== undefined && (formData.number_count < 1 || formData.number_count > 20)) {
            errors.number_count = 'Number count must be between 1 and 20'
        }

        // Validate sequential starting number
        if (formData.number_generation === 'sequential') {
            if (!formData.sequential_start_number || formData.sequential_start_number < 1) {
                errors.sequential_start_number = 'Starting number must be at least 1'
            } else if (formData.sequential_start_number > 9999999) {
                errors.sequential_start_number = 'Starting number cannot exceed 9,999,999'
            }

            // Check if starting number fits in allocated space
            if (formData.sequential_start_number && formData.number_count) {
                const startingNumberLength = formData.sequential_start_number.toString().length
                if (startingNumberLength > formData.number_count) {
                    errors.sequential_start_number = `Starting number (${formData.sequential_start_number}) has ${startingNumberLength} digits, but only ${formData.number_count} digits are allocated. Increase number count to at least ${startingNumberLength}.`
                }
            }
        }

        // Validate total length
        if (formData.total_length !== undefined) {
            if (formData.total_length > 100) {
                warnings.push('Total length is very long (over 100 characters). This may cause display issues.')
            } else if (formData.total_length < 5) {
                warnings.push('Total length is very short (under 5 characters). This may not provide enough uniqueness.')
            }
        }

        // Check for potential issues
        if (formData.character_count === 0 && formData.number_generation === 'random') {
            warnings.push('Using only numbers with random generation may reduce uniqueness. Consider adding characters.')
        }

        if (!formData.include_year && !formData.include_month && formData.number_generation === 'random') {
            warnings.push('Without date components, random IDs may be harder to organize chronologically.')
        }

        setFieldErrors(errors)
        setWarnings(warnings)

        return Object.keys(errors).length === 0
    }

    // Check if there are validation errors that prevent saving
    const hasValidationErrors = () => {
        return Object.keys(fieldErrors).length > 0
    }

    const resetToDefaults = () => {
        const defaultData = {
            generation_type: 'auto',
            prefix: 'DOC',
            separator: '-',
            character_count: 3,
            number_count: 5,
            include_year: false,
            include_month: false,
            case_style: 'upper',
            number_generation: 'random', // NEW: Reset to random
            sequential_start_number: 1, // NEW: Reset starting number
            ensure_uniqueness: true,
            max_retries: 10
        } as CreateDocumentIdSettingsData

        // Calculate total length based on components
        const calculatedTotalLength = calculateTotalLength(defaultData)

        setFormData({
            ...defaultData,
            total_length: calculatedTotalLength
        })
        setStartingNumberInput('1') // Reset local input state
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading settings...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Settings className="w-6 h-6 mr-2" />
                    Document Sign ID Settings
                </h2>
                <p className="text-gray-600 mt-1">Configure how document sign IDs are generated for your signature requests</p>
            </div>

            {/* Enhanced Error/Success/Warning Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                        <span className="text-red-700 font-medium">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                </div>
            )}

            {Object.keys(fieldErrors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                        <span className="text-red-700 font-medium">Validation Errors</span>
                    </div>
                    <ul className="text-red-700 space-y-1">
                        {Object.entries(fieldErrors).map(([field, error]) => (
                            <li key={field} className="text-sm">
                                • <strong>{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                        <span className="text-yellow-700 font-medium">Warnings</span>
                    </div>
                    <ul className="text-yellow-700 space-y-1">
                        {warnings.map((warning, index) => (
                            <li key={index} className="text-sm">• {warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-green-700 font-medium">Success</span>
                    </div>
                    <p className="text-green-700 mt-1">{success}</p>
                </div>
            )}

            <div className="bg-white rounded-lg border p-6 space-y-6">
                {/* Generation Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Generation Type</label>
                    <div className="space-y-3">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="generation_type"
                                value="auto"
                                checked={formData.generation_type === 'auto'}
                                onChange={(e) => handleFormChange('generation_type', e.target.value)}
                                className="mr-3"
                            />
                            <div>
                                <span className="font-medium">Automatic Generation</span>
                                <p className="text-sm text-gray-500">Generate IDs automatically based on your preferences</p>
                            </div>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="generation_type"
                                value="custom"
                                checked={formData.generation_type === 'custom'}
                                onChange={(e) => handleFormChange('generation_type', e.target.value)}
                                className="mr-3"
                            />
                            <div>
                                <span className="font-medium">Custom Entry</span>
                                <p className="text-sm text-gray-500">Enter custom document IDs manually when creating requests</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Automatic Generation Settings */}
                {formData.generation_type === 'auto' && (
                    <div className="space-y-4 border-t pt-6">
                        <h3 className="text-lg font-medium text-gray-900">Automatic Generation Settings</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                                <input
                                    type="text"
                                    value={formData.prefix}
                                    onChange={(e) => handleFormChange('prefix', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${fieldErrors.prefix
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                    placeholder="DOC"
                                    maxLength={10}
                                />
                                {fieldErrors.prefix && (
                                    <p className="mt-1 text-sm text-red-600">{fieldErrors.prefix}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Separator</label>
                                <select
                                    value={formData.separator}
                                    onChange={(e) => handleFormChange('separator', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${fieldErrors.separator
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                >
                                    <option value="-">Dash (-)</option>
                                    <option value="_">Underscore (_)</option>
                                    <option value=".">Dot (.)</option>
                                    <option value="">None</option>
                                </select>
                                {fieldErrors.separator && (
                                    <p className="mt-1 text-sm text-red-600">{fieldErrors.separator}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Length</label>
                                <input
                                    type="number"
                                    value={formData.total_length}
                                    onChange={(e) => handleFormChange('total_length', parseInt(e.target.value) || 8)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min={4}
                                    max={20}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Characters</label>
                                <input
                                    type="number"
                                    value={formData.character_count}
                                    onChange={(e) => handleFormChange('character_count', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min={0}
                                    max={10}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Numbers</label>
                                <input
                                    type="number"
                                    value={formData.number_count}
                                    onChange={(e) => handleFormChange('number_count', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min={0}
                                    max={10}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date Components</label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.include_year}
                                            onChange={(e) => handleFormChange('include_year', e.target.checked)}
                                            className="mr-2"
                                        />
                                        Include Year (YYYY)
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.include_month}
                                            onChange={(e) => handleFormChange('include_month', e.target.checked)}
                                            className="mr-2"
                                        />
                                        Include Month (MM)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Case Style</label>
                                <select
                                    value={formData.case_style}
                                    onChange={(e) => handleFormChange('case_style', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="upper">UPPERCASE</option>
                                    <option value="lower">lowercase</option>
                                    <option value="mixed">MiXeD</option>
                                </select>
                            </div>
                        </div>

                        {/* NEW: Number Generation Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Number Generation</label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="number_generation"
                                        value="random"
                                        checked={formData.number_generation === 'random'}
                                        onChange={(e) => handleFormChange('number_generation', e.target.value)}
                                        className="mr-2"
                                    />
                                    <div>
                                        <span className="font-medium">Random</span>
                                        <p className="text-sm text-gray-500">Generate random numbers (e.g., DOC-A3B7K2)</p>
                                    </div>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="number_generation"
                                        value="sequential"
                                        checked={formData.number_generation === 'sequential'}
                                        onChange={(e) => handleFormChange('number_generation', e.target.value)}
                                        className="mr-2"
                                    />
                                    <div>
                                        <span className="font-medium">Sequential</span>
                                        <p className="text-sm text-gray-500">Generate sequential numbers (e.g., DOC-001, DOC-002, DOC-003)</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* NEW: Starting Number for Sequential Generation */}
                        {formData.number_generation === 'sequential' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Starting Number
                                </label>
                                <input
                                    type="text"
                                    value={startingNumberInput}
                                    onChange={(e) => {
                                        const value = e.target.value

                                        // Allow empty string for deletion
                                        if (value === '') {
                                            setStartingNumberInput('')
                                            return
                                        }

                                        // Only allow numeric input
                                        if (!/^\d+$/.test(value)) {
                                            return // Ignore non-numeric input
                                        }

                                        // Check length limit (allow up to 7 digits)
                                        if (value.length > 7) {
                                            return // Ignore if too long
                                        }

                                        const num = parseInt(value, 10)
                                        if (num >= 1 && num <= 9999999) { // Allow up to 7 digits
                                            setStartingNumberInput(value)
                                            handleFormChange('sequential_start_number', num)
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // On blur, if empty, set to 1
                                        const value = e.target.value.trim()
                                        if (value === '' || parseInt(value) < 1) {
                                            setStartingNumberInput('1')
                                            handleFormChange('sequential_start_number', 1)
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="1"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    The first document will start from this number (e.g., if you set 100, the sequence will be 100, 101, 102...)
                                </p>
                                {formData.sequential_start_number && formData.number_count &&
                                    formData.sequential_start_number.toString().length > formData.number_count && (
                                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <p className="text-sm text-red-700 flex items-center">
                                                <span className="mr-2">🚫</span>
                                                <strong>Validation Error:</strong>
                                            </p>
                                            <p className="text-sm text-red-600 mt-1">
                                                Starting number ({formData.sequential_start_number}) has {formData.sequential_start_number.toString().length} digits, but only {formData.number_count} digits are allocated for numbers.
                                            </p>
                                            <p className="text-sm text-red-600 mt-1">
                                                <strong>Solution:</strong> Increase number count to at least {formData.sequential_start_number.toString().length} or use a smaller starting number.
                                            </p>
                                            <p className="text-sm text-red-700 mt-1 font-medium">
                                                ⚠️ Settings cannot be saved until this is resolved.
                                            </p>
                                        </div>
                                    )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.ensure_uniqueness}
                                        onChange={(e) => handleFormChange('ensure_uniqueness', e.target.checked)}
                                        className="mr-2"
                                    />
                                    Ensure Uniqueness
                                </label>
                                <p className="text-sm text-gray-500 mt-1">Check database for duplicate IDs</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
                                <input
                                    type="number"
                                    value={formData.max_retries}
                                    onChange={(e) => handleFormChange('max_retries', parseInt(e.target.value) || 10)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min={1}
                                    max={50}
                                    disabled={!formData.ensure_uniqueness}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Preview */}
                <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <Eye className="w-5 h-5 mr-2" />
                            Live Preview
                        </h3>
                        {formData.generation_type === 'auto' && (
                            <button
                                onClick={generateSampleIds}
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                            >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Generate New Samples
                            </button>
                        )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">Sample Document IDs:</p>
                        <div className="space-y-1">
                            {sampleIds.map((id, index) => (
                                <div key={index} className="font-mono text-sm bg-white px-3 py-2 rounded border">
                                    {id}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-6 flex justify-between">
                    <button
                        onClick={resetToDefaults}
                        className="px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Reset to Defaults
                    </button>

                    <button
                        onClick={saveSettings}
                        disabled={saving || hasValidationErrors()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        title={hasValidationErrors() ? "Please fix validation errors before saving" : ""}
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}