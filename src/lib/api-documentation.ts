export interface APIEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  summary: string
  description: string
  tags: string[]
  parameters?: APIParameter[]
  requestBody?: APIRequestBody
  responses: APIResponse[]
  security?: string[]
  examples?: APIExample[]
}

export interface APIParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  type: string
  description: string
  example?: any
  enum?: string[]
}

export interface APIRequestBody {
  description: string
  required: boolean
  content: {
    [mediaType: string]: {
      schema: any
      example?: any
    }
  }
}

export interface APIResponse {
  status: number
  description: string
  content?: {
    [mediaType: string]: {
      schema: any
      example?: any
    }
  }
}

export interface APIExample {
  name: string
  description: string
  request?: any
  response?: any
}

export class APIDocumentationService {
  private static endpoints: APIEndpoint[] = []

  /**
   * Register API endpoint documentation
   */
  static registerEndpoint(endpoint: APIEndpoint): void {
    this.endpoints.push(endpoint)
  }

  /**
   * Get all registered endpoints
   */
  static getAllEndpoints(): APIEndpoint[] {
    return this.endpoints
  }

  /**
   * Get endpoints by tag
   */
  static getEndpointsByTag(tag: string): APIEndpoint[] {
    return this.endpoints.filter(endpoint => endpoint.tags.includes(tag))
  }

  /**
   * Generate OpenAPI specification
   */
  static generateOpenAPISpec(): any {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'SignTusk API',
        description: 'Multi-signature document signing platform API',
        version: '1.0.0',
        contact: {
          name: 'SignTusk Support',
          email: 'support@signtusk.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'https://api.signtusk.com',
          description: 'Production server'
        },
        {
          url: 'http://localhost:3000/api',
          description: 'Development server'
        }
      ],
      paths: {} as Record<string, any>,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        },
        schemas: this.generateSchemas()
      },
      tags: this.generateTags()
    }

    // Convert endpoints to OpenAPI paths
    this.endpoints.forEach(endpoint => {
      const path = endpoint.path
      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }

      spec.paths[path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters?.map(param => ({
          name: param.name,
          in: param.in,
          required: param.required,
          schema: {
            type: param.type,
            enum: param.enum
          },
          description: param.description,
          example: param.example
        })),
        requestBody: endpoint.requestBody ? {
          description: endpoint.requestBody.description,
          required: endpoint.requestBody.required,
          content: endpoint.requestBody.content
        } : undefined,
        responses: endpoint.responses.reduce((acc, response) => {
          acc[response.status] = {
            description: response.description,
            content: response.content
          }
          return acc
        }, {} as Record<number, any>),
        security: endpoint.security?.map(scheme => ({ [scheme]: [] }))
      }
    })

    return spec
  }

  /**
   * Generate common schemas
   */
  private static generateSchemas(): any {
    return {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          display_name: { type: 'string' },
          avatar_url: { type: 'string', format: 'uri' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          file_url: { type: 'string', format: 'uri' },
          file_size: { type: 'integer' },
          status: { type: 'string', enum: ['draft', 'pending', 'completed', 'expired'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      SignatureRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          document_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          message: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'completed', 'expired', 'cancelled'] },
          expires_at: { type: 'string', format: 'date-time' },
          created_at: { type: 'string', format: 'date-time' },
          signers: {
            type: 'array',
            items: { $ref: '#/components/schemas/Signer' }
          }
        }
      },
      Signer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'signed', 'declined'] },
          signed_at: { type: 'string', format: 'date-time' },
          order: { type: 'integer' }
        }
      }
    }
  }

  /**
   * Generate API tags
   */
  private static generateTags(): any[] {
    const tags = new Set<string>()
    this.endpoints.forEach(endpoint => {
      endpoint.tags.forEach(tag => tags.add(tag))
    })

    return Array.from(tags).map(tag => ({
      name: tag,
      description: this.getTagDescription(tag)
    }))
  }

  /**
   * Get description for API tag
   */
  private static getTagDescription(tag: string): string {
    const descriptions: Record<string, string> = {
      'Authentication': 'User authentication and session management',
      'Documents': 'Document upload, management, and templates',
      'Signatures': 'Signature requests and signing workflows',
      'Users': 'User profile and account management',
      'Admin': 'Administrative functions and system management',
      'Webhooks': 'Webhook management and event notifications',
      'Analytics': 'Usage analytics and reporting',
      'Integration': 'Third-party integrations and SSO'
    }
    return descriptions[tag] || `${tag} related endpoints`
  }

  /**
   * Initialize default API documentation
   */
  static initializeDefaultDocs(): void {
    // Authentication endpoints
    this.registerEndpoint({
      path: '/api/auth/login',
      method: 'POST',
      summary: 'User login',
      description: 'Authenticate user with email and password',
      tags: ['Authentication'],
      requestBody: {
        description: 'Login credentials',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 }
              },
              required: ['email', 'password']
            },
            example: {
              email: 'user@example.com',
              password: 'securepassword123'
            }
          }
        }
      },
      responses: [
        {
          status: 200,
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  token: { type: 'string' }
                }
              }
            }
          }
        },
        {
          status: 401,
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      ]
    })

    // Document endpoints
    this.registerEndpoint({
      path: '/api/documents',
      method: 'GET',
      summary: 'List documents',
      description: 'Get list of user documents with pagination',
      tags: ['Documents'],
      security: ['BearerAuth'],
      parameters: [
        {
          name: 'page',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Page number for pagination',
          example: 1
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          type: 'integer',
          description: 'Number of items per page',
          example: 20
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          type: 'string',
          description: 'Filter by document status',
          enum: ['draft', 'pending', 'completed', 'expired']
        }
      ],
      responses: [
        {
          status: 200,
          description: 'Documents retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  documents: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Document' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      pages: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    })

    // Signature request endpoints
    this.registerEndpoint({
      path: '/api/signature-requests',
      method: 'POST',
      summary: 'Create signature request',
      description: 'Create a new signature request for a document',
      tags: ['Signatures'],
      security: ['BearerAuth'],
      requestBody: {
        description: 'Signature request details',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                document_id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                message: { type: 'string' },
                signers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', format: 'email' },
                      name: { type: 'string' },
                      order: { type: 'integer' }
                    }
                  }
                },
                expires_at: { type: 'string', format: 'date-time' }
              },
              required: ['document_id', 'title', 'signers']
            }
          }
        }
      },
      responses: [
        {
          status: 201,
          description: 'Signature request created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignatureRequest' }
            }
          }
        }
      ]
    })

    // Webhook endpoints
    this.registerEndpoint({
      path: '/api/webhooks',
      method: 'POST',
      summary: 'Create webhook',
      description: 'Create a new webhook endpoint',
      tags: ['Webhooks'],
      security: ['BearerAuth'],
      requestBody: {
        description: 'Webhook configuration',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                events: {
                  type: 'array',
                  items: { type: 'string' }
                },
                description: { type: 'string' }
              },
              required: ['url', 'events']
            }
          }
        }
      },
      responses: [
        {
          status: 201,
          description: 'Webhook created successfully'
        }
      ]
    })
  }

  /**
   * Generate HTML documentation
   */
  static generateHTMLDocs(): string {
    const spec = this.generateOpenAPISpec()

    return `
<!DOCTYPE html>
<html>
<head>
    <title>SignTusk API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>
    `
  }
}

// Initialize default documentation
APIDocumentationService.initializeDefaultDocs()
