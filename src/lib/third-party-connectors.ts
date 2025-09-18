import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ThirdPartyConnector {
  id: string
  name: string
  type: 'crm' | 'erp' | 'storage' | 'email' | 'calendar' | 'other'
  provider: string
  config: ConnectorConfig
  active: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export interface ConnectorConfig {
  api_key?: string
  api_secret?: string
  access_token?: string
  refresh_token?: string
  base_url?: string
  webhook_url?: string
  field_mapping?: Record<string, string>
  sync_settings?: {
    auto_sync: boolean
    sync_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
    sync_direction: 'bidirectional' | 'to_signtusk' | 'from_signtusk'
  }
}

export interface SyncOperation {
  id: string
  connector_id: string
  operation_type: 'create' | 'update' | 'delete' | 'sync'
  entity_type: string
  entity_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error_message?: string
  started_at: string
  completed_at?: string
  data: any
}

export class ThirdPartyConnectorService {
  /**
   * Create a new connector
   */
  static async createConnector(
    userId: string,
    name: string,
    type: ThirdPartyConnector['type'],
    provider: string,
    config: ConnectorConfig
  ): Promise<ThirdPartyConnector | null> {
    try {
      const { data, error } = await supabase
        .from('third_party_connectors')
        .insert([{
          user_id: userId,
          name,
          type,
          provider,
          config,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating connector:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating connector:', error)
      return null
    }
  }

  /**
   * Get user connectors
   */
  static async getUserConnectors(userId: string): Promise<ThirdPartyConnector[]> {
    try {
      const { data, error } = await supabase
        .from('third_party_connectors')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching connectors:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching connectors:', error)
      return []
    }
  }

  /**
   * Salesforce CRM Integration
   */
  static async syncWithSalesforce(connector: ThirdPartyConnector, operation: string, data: any): Promise<boolean> {
    try {
      const config = connector.config
      const baseUrl = config.base_url || 'https://your-instance.salesforce.com'

      // Get access token if needed
      if (!config.access_token) {
        const tokenResponse = await fetch(`${baseUrl}/services/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.api_key!,
            client_secret: config.api_secret!
          })
        })

        const tokenData = await tokenResponse.json()
        config.access_token = tokenData.access_token

        // Update connector with new token
        await this.updateConnector(connector.id, { config })
      }

      // Perform Salesforce operation
      switch (operation) {
        case 'create_contact':
          return await this.createSalesforceContact(config, data)
        case 'create_opportunity':
          return await this.createSalesforceOpportunity(config, data)
        case 'update_contact':
          return await this.updateSalesforceContact(config, data)
        default:
          console.error('Unknown Salesforce operation:', operation)
          return false
      }
    } catch (error) {
      console.error('Error syncing with Salesforce:', error)
      return false
    }
  }

  /**
   * HubSpot CRM Integration
   */
  static async syncWithHubSpot(connector: ThirdPartyConnector, operation: string, data: any): Promise<boolean> {
    try {
      const config = connector.config
      const baseUrl = 'https://api.hubapi.com'

      switch (operation) {
        case 'create_contact':
          const contactResponse = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              properties: {
                email: data.email,
                firstname: data.first_name,
                lastname: data.last_name,
                company: data.company,
                phone: data.phone
              }
            })
          })

          return contactResponse.ok

        case 'create_deal':
          const dealResponse = await fetch(`${baseUrl}/crm/v3/objects/deals`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              properties: {
                dealname: data.deal_name,
                amount: data.amount,
                dealstage: data.stage,
                pipeline: data.pipeline
              }
            })
          })

          return dealResponse.ok

        default:
          console.error('Unknown HubSpot operation:', operation)
          return false
      }
    } catch (error) {
      console.error('Error syncing with HubSpot:', error)
      return false
    }
  }

  /**
   * Google Drive Integration
   */
  static async syncWithGoogleDrive(connector: ThirdPartyConnector, operation: string, data: any): Promise<boolean> {
    try {
      const config = connector.config
      const baseUrl = 'https://www.googleapis.com/drive/v3'

      switch (operation) {
        case 'upload_document':
          // Upload signed document to Google Drive
          const uploadResponse = await fetch(`${baseUrl}/files?uploadType=media`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/pdf'
            },
            body: data.file_content
          })

          if (uploadResponse.ok) {
            const fileData = await uploadResponse.json()
            
            // Update file metadata
            await fetch(`${baseUrl}/files/${fileData.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: data.file_name,
                description: `Signed document from SignTusk - ${data.document_title}`
              })
            })

            return true
          }

          return false

        case 'create_folder':
          const folderResponse = await fetch(`${baseUrl}/files`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: data.folder_name,
              mimeType: 'application/vnd.google-apps.folder',
              parents: data.parent_folder_id ? [data.parent_folder_id] : undefined
            })
          })

          return folderResponse.ok

        default:
          console.error('Unknown Google Drive operation:', operation)
          return false
      }
    } catch (error) {
      console.error('Error syncing with Google Drive:', error)
      return false
    }
  }

  /**
   * Slack Integration
   */
  static async syncWithSlack(connector: ThirdPartyConnector, operation: string, data: any): Promise<boolean> {
    try {
      const config = connector.config
      const baseUrl = 'https://slack.com/api'

      switch (operation) {
        case 'send_notification':
          const messageResponse = await fetch(`${baseUrl}/chat.postMessage`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              channel: data.channel,
              text: data.message,
              attachments: data.attachments
            })
          })

          return messageResponse.ok

        case 'create_channel':
          const channelResponse = await fetch(`${baseUrl}/conversations.create`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: data.channel_name,
              is_private: data.is_private || false
            })
          })

          return channelResponse.ok

        default:
          console.error('Unknown Slack operation:', operation)
          return false
      }
    } catch (error) {
      console.error('Error syncing with Slack:', error)
      return false
    }
  }

  /**
   * Generic sync operation
   */
  static async performSync(
    connectorId: string,
    operation: string,
    entityType: string,
    entityId: string,
    data: any
  ): Promise<SyncOperation> {
    try {
      // Create sync operation record
      const { data: syncOp, error } = await supabase
        .from('sync_operations')
        .insert([{
          connector_id: connectorId,
          operation_type: operation,
          entity_type: entityType,
          entity_id: entityId,
          status: 'pending',
          started_at: new Date().toISOString(),
          data
        }])
        .select()
        .single()

      if (error) {
        throw new Error('Failed to create sync operation')
      }

      // Update status to in_progress
      await supabase
        .from('sync_operations')
        .update({ status: 'in_progress' })
        .eq('id', syncOp.id)

      // Get connector details
      const { data: connector } = await supabase
        .from('third_party_connectors')
        .select('*')
        .eq('id', connectorId)
        .single()

      if (!connector) {
        throw new Error('Connector not found')
      }

      let success = false

      // Route to appropriate sync method
      switch (connector.provider) {
        case 'salesforce':
          success = await this.syncWithSalesforce(connector, operation, data)
          break
        case 'hubspot':
          success = await this.syncWithHubSpot(connector, operation, data)
          break
        case 'google_drive':
          success = await this.syncWithGoogleDrive(connector, operation, data)
          break
        case 'slack':
          success = await this.syncWithSlack(connector, operation, data)
          break
        default:
          throw new Error(`Unknown provider: ${connector.provider}`)
      }

      // Update sync operation status
      await supabase
        .from('sync_operations')
        .update({
          status: success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          error_message: success ? null : 'Sync operation failed'
        })
        .eq('id', syncOp.id)

      return { ...syncOp, status: success ? 'completed' : 'failed' }
    } catch (error) {
      console.error('Error performing sync:', error)
      
      // Update sync operation with error
      await supabase
        .from('sync_operations')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('connector_id', connectorId)

      throw error
    }
  }

  /**
   * Update connector configuration
   */
  static async updateConnector(
    connectorId: string,
    updates: Partial<Pick<ThirdPartyConnector, 'name' | 'config' | 'active'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('third_party_connectors')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectorId)

      return !error
    } catch (error) {
      console.error('Error updating connector:', error)
      return false
    }
  }

  /**
   * Helper methods for specific integrations
   */
  private static async createSalesforceContact(config: ConnectorConfig, data: any): Promise<boolean> {
    const response = await fetch(`${config.base_url}/services/data/v52.0/sobjects/Contact/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        FirstName: data.first_name,
        LastName: data.last_name,
        Email: data.email,
        Phone: data.phone,
        Company: data.company
      })
    })

    return response.ok
  }

  private static async createSalesforceOpportunity(config: ConnectorConfig, data: any): Promise<boolean> {
    const response = await fetch(`${config.base_url}/services/data/v52.0/sobjects/Opportunity/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Name: data.name,
        Amount: data.amount,
        StageName: data.stage,
        CloseDate: data.close_date
      })
    })

    return response.ok
  }

  private static async updateSalesforceContact(config: ConnectorConfig, data: any): Promise<boolean> {
    const response = await fetch(`${config.base_url}/services/data/v52.0/sobjects/Contact/${data.contact_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data.updates)
    })

    return response.ok
  }
}
