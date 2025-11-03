/**
 * Template Service
 * Manages signature request templates for reusable workflows
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import {
  SignatureTemplate,
  Result,
  PaginatedResult,
  PaginationMetadata,
  SigningOrder,
} from '../types/signature-types'
import {
  createValidationError,
  createNotFoundError,
  createAuthError,
  createInternalError,
  serializeError,
} from '../errors/signature-errors'
import { SIGNATURE_CONFIG } from '../config/signature-config'
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  ApplyTemplateInput,
  validateInput,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  ApplyTemplateSchema,
} from '../validation/signature-validation-schemas'

/**
 * Template Service for managing signature templates
 */
export class TemplateService {
  private client: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.client = client || supabase
  }

  /**
   * Create a new template
   */
  async createTemplate(
    userId: string,
    input: CreateTemplateInput
  ): Promise<Result<SignatureTemplate>> {
    try {
      // Validate input
      const validation = validateInput(CreateTemplateSchema, input)
      if (!validation.success) {
        throw createValidationError('Invalid template data', 'template', validation.errors)
      }

      const { data, error } = await this.client
        .from('signature_templates')
        .insert({
          user_id: userId,
          name: input.name,
          description: input.description,
          is_public: input.is_public || false,
          default_signers: input.default_signers,
          signing_order: input.signing_order || SigningOrder.SEQUENTIAL,
          require_totp: input.require_totp || false,
          expires_in_days: input.expires_in_days || SIGNATURE_CONFIG.expiration.DEFAULT_EXPIRATION_DAYS,
          usage_count: 0,
          version: 1,
        })
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to create template', error)
      }

      return {
        success: true,
        data: data as SignatureTemplate,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    input: UpdateTemplateInput
  ): Promise<Result<SignatureTemplate>> {
    try {
      // Validate input
      const validation = validateInput(UpdateTemplateSchema, input)
      if (!validation.success) {
        throw createValidationError('Invalid template update data', 'template', validation.errors)
      }

      // Check ownership
      const { data: existing, error: fetchError } = await this.client
        .from('signature_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (fetchError || !existing) {
        throw createNotFoundError('Template', templateId)
      }

      if (existing.user_id !== userId) {
        throw createAuthError('You do not own this template', 'template', 'update')
      }

      // Update template
      const { data, error } = await this.client
        .from('signature_templates')
        .update({
          ...input,
          version: existing.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to update template', error)
      }

      return {
        success: true,
        data: data as SignatureTemplate,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<Result<void>> {
    try {
      // Check ownership
      const { data: existing, error: fetchError } = await this.client
        .from('signature_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (fetchError || !existing) {
        throw createNotFoundError('Template', templateId)
      }

      if (existing.user_id !== userId) {
        throw createAuthError('You do not own this template', 'template', 'delete')
      }

      // Soft delete
      const { error } = await this.client
        .from('signature_templates')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', templateId)

      if (error) {
        throw createInternalError('Failed to delete template', error)
      }

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
   * List templates with pagination
   */
  async listTemplates(
    userId: string,
    options: {
      page?: number
      pageSize?: number
      isPublic?: boolean
      search?: string
    } = {}
  ): Promise<PaginatedResult<SignatureTemplate>> {
    try {
      const page = options.page || 1
      const pageSize = Math.min(
        options.pageSize || SIGNATURE_CONFIG.pagination.DEFAULT_PAGE_SIZE,
        SIGNATURE_CONFIG.pagination.MAX_PAGE_SIZE
      )
      const offset = (page - 1) * pageSize

      let query = this.client
        .from('signature_templates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)

      // Filter by ownership or public
      if (options.isPublic !== undefined) {
        if (options.isPublic) {
          query = query.eq('is_public', true)
        } else {
          query = query.eq('user_id', userId)
        }
      } else {
        // Show user's templates and public templates
        query = query.or(`user_id.eq.${userId},is_public.eq.true`)
      }

      // Search by name
      if (options.search) {
        query = query.ilike('name', `%${options.search}%`)
      }

      // Apply pagination
      query = query
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        throw createInternalError('Failed to list templates', error)
      }

      const total = count || 0
      const totalPages = Math.ceil(total / pageSize)

      const pagination: PaginationMetadata = {
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      }

      return {
        success: true,
        data: (data || []) as SignatureTemplate[],
        pagination,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get a single template
   */
  async getTemplate(templateId: string, userId: string): Promise<Result<SignatureTemplate>> {
    try {
      const { data, error } = await this.client
        .from('signature_templates')
        .select('*')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single()

      if (error || !data) {
        throw createNotFoundError('Template', templateId)
      }

      // Check access
      if (data.user_id !== userId && !data.is_public) {
        throw createAuthError('You do not have access to this template', 'template', 'read')
      }

      return {
        success: true,
        data: data as SignatureTemplate,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    templateId: string,
    userId: string,
    newName: string
  ): Promise<Result<SignatureTemplate>> {
    try {
      // Get the original template
      const templateResult = await this.getTemplate(templateId, userId)
      if (!templateResult.success || !templateResult.data) {
        throw createNotFoundError('Template', templateId)
      }

      const original = templateResult.data

      // Create duplicate
      const { data, error } = await this.client
        .from('signature_templates')
        .insert({
          user_id: userId,
          name: newName,
          description: original.description,
          is_public: false, // Duplicates are always private
          default_signers: original.default_signers,
          signing_order: original.signing_order,
          require_totp: original.require_totp,
          expires_in_days: original.expires_in_days,
          usage_count: 0,
          version: 1,
        })
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to duplicate template', error)
      }

      return {
        success: true,
        data: data as SignatureTemplate,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(templateId: string): Promise<void> {
    try {
      await this.client.rpc('increment_template_usage', { template_id: templateId })
    } catch (error) {
      console.error('Failed to increment template usage:', error)
      // Don't throw - usage tracking failure shouldn't break the main operation
    }
  }
}

// Export singleton instance
export const templateService = new TemplateService()

