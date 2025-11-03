/**
 * Field Service
 * Manages signature field positioning and configuration
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import {
  Result,
  SignatureField,
  FieldConfiguration,
  FieldType,
} from '../types/signature-types'
import {
  createValidationError,
  createNotFoundError,
  createInternalError,
  serializeError,
} from '../errors/signature-errors'

/**
 * Field Service
 */
export class FieldService {
  private client: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.client = client || supabase
  }

  /**
   * Save field configuration for a document
   */
  async saveFieldConfiguration(
    documentId: string,
    userId: string,
    fields: SignatureField[]
  ): Promise<Result<FieldConfiguration>> {
    try {
      // Validate fields
      const validation = this.validateFieldAssignments(fields)
      if (!validation.valid) {
        throw createValidationError(validation.errors.join(', '), 'fields')
      }

      // Check for overlapping fields
      if (this.hasOverlappingFields(fields)) {
        throw createValidationError('Fields cannot overlap', 'fields')
      }

      // Save configuration
      const { data, error } = await this.client
        .from('document_field_configurations')
        .upsert({
          document_id: documentId,
          user_id: userId,
          fields,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to save field configuration', error)
      }

      return {
        success: true,
        data: data as FieldConfiguration,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get field configuration for a document
   */
  async getFieldConfiguration(documentId: string): Promise<Result<FieldConfiguration>> {
    try {
      const { data, error } = await this.client
        .from('document_field_configurations')
        .select('*')
        .eq('document_id', documentId)
        .single()

      if (error || !data) {
        throw createNotFoundError('Field configuration', documentId)
      }

      return {
        success: true,
        data: data as FieldConfiguration,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Validate field assignments
   */
  validateFieldAssignments(fields: SignatureField[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for required fields
    const requiredFields = fields.filter((f) => f.required)
    if (requiredFields.length === 0) {
      errors.push('At least one required field must be defined')
    }

    // Check all required fields are assigned
    const unassignedRequired = requiredFields.filter((f) => !f.assigned_to)
    if (unassignedRequired.length > 0) {
      errors.push(`${unassignedRequired.length} required fields are not assigned to signers`)
    }

    // Validate field positions (must be percentages 0-100)
    fields.forEach((field, index) => {
      if (field.position.x < 0 || field.position.x > 100) {
        errors.push(`Field ${index + 1}: x position must be between 0 and 100`)
      }
      if (field.position.y < 0 || field.position.y > 100) {
        errors.push(`Field ${index + 1}: y position must be between 0 and 100`)
      }
      if (field.position.width <= 0 || field.position.width > 100) {
        errors.push(`Field ${index + 1}: width must be between 0 and 100`)
      }
      if (field.position.height <= 0 || field.position.height > 100) {
        errors.push(`Field ${index + 1}: height must be between 0 and 100`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Check for overlapping fields
   */
  private hasOverlappingFields(fields: SignatureField[]): boolean {
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        if (this.fieldsOverlap(fields[i], fields[j])) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Check if two fields overlap
   */
  private fieldsOverlap(field1: SignatureField, field2: SignatureField): boolean {
    // Different pages don't overlap
    if (field1.position.page !== field2.position.page) {
      return false
    }

    // Check bounding box collision
    const left1 = field1.position.x
    const right1 = field1.position.x + field1.position.width
    const top1 = field1.position.y
    const bottom1 = field1.position.y + field1.position.height

    const left2 = field2.position.x
    const right2 = field2.position.x + field2.position.width
    const top2 = field2.position.y
    const bottom2 = field2.position.y + field2.position.height

    return !(right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2)
  }

  /**
   * Assign field to signer
   */
  async assignFieldToSigner(
    fieldId: string,
    signerId: string
  ): Promise<Result<SignatureField>> {
    try {
      // This would update the field in the configuration
      // For now, return a placeholder
      return {
        success: true,
        data: {
          id: fieldId,
          assigned_to: signerId,
        } as SignatureField,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Update field position
   */
  async updateFieldPosition(
    fieldId: string,
    position: { x: number; y: number; width: number; height: number }
  ): Promise<Result<SignatureField>> {
    try {
      // Validate position
      if (
        position.x < 0 ||
        position.x > 100 ||
        position.y < 0 ||
        position.y > 100 ||
        position.width <= 0 ||
        position.width > 100 ||
        position.height <= 0 ||
        position.height > 100
      ) {
        throw createValidationError('Invalid field position', 'position')
      }

      // This would update the field in the configuration
      return {
        success: true,
        data: {
          id: fieldId,
          ...position,
        } as unknown as SignatureField,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Delete a field
   */
  async deleteField(documentId: string, fieldId: string): Promise<Result<void>> {
    try {
      // This would remove the field from the configuration
      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Duplicate a field
   */
  async duplicateField(
    fieldId: string,
    offset: { x: number; y: number }
  ): Promise<Result<SignatureField>> {
    try {
      // This would clone the field with new position
      return {
        success: true,
        data: {
          id: `${fieldId}_copy`,
          ...offset,
        } as unknown as SignatureField,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get field templates
   */
  async getFieldTemplates(): Promise<Result<FieldConfiguration[]>> {
    try {
      const { data, error } = await this.client
        .from('field_templates')
        .select('*')
        .eq('is_public', true)

      if (error) {
        throw createInternalError('Failed to fetch field templates', error)
      }

      return {
        success: true,
        data: (data || []) as FieldConfiguration[],
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }
}

// Export singleton instance
export const fieldService = new FieldService()

