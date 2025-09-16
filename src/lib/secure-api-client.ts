// Secure API client with automatic token refresh
// Follows industry best practices for JWT token management

class SecureApiClient {
  private baseURL: string
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  /**
   * Make an authenticated API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    // Ensure credentials are included for cookie-based auth
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, requestOptions)

      // If unauthorized, try to refresh token and retry
      if (response.status === 401) {
        const refreshed = await this.handleTokenRefresh()
        
        if (refreshed) {
          // Retry the original request
          const retryResponse = await fetch(url, requestOptions)
          return this.handleResponse<T>(retryResponse)
        } else {
          // Refresh failed, redirect to login
          this.redirectToLogin()
          throw new Error('Authentication failed')
        }
      }

      return this.handleResponse<T>(response)
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as unknown as T
  }

  /**
   * Handle token refresh with deduplication
   */
  private async handleTokenRefresh(): Promise<boolean> {
    // If already refreshing, wait for the existing refresh
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenRefresh()

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Attempting token refresh...')
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        console.log('✅ Token refreshed successfully')
        return true
      } else {
        console.warn('❌ Token refresh failed:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error)
      return false
    }
  }

  /**
   * Redirect to login page
   */
  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      window.location.href = loginUrl
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create and export a singleton instance
export const apiClient = new SecureApiClient()

// Export the class for custom instances
export { SecureApiClient }

// Convenience functions for common operations
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    apiClient.get<T>(endpoint, options),
  
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    apiClient.post<T>(endpoint, data, options),
  
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    apiClient.put<T>(endpoint, data, options),
  
  patch: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    apiClient.patch<T>(endpoint, data, options),
  
  delete: <T>(endpoint: string, options?: RequestInit) => 
    apiClient.delete<T>(endpoint, options),
}

// Type definitions for common API responses
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  error: string
  code?: string
  details?: any
}
