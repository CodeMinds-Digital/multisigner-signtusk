import { useCallback } from 'react'
import { AuthInterceptor } from '@/lib/auth-interceptor'

/**
 * Hook to handle authentication errors consistently across components
 */
export function useAuthErrorHandler() {
  const handleError = useCallback(async (error: any) => {
    if (AuthInterceptor.isTokenExpiredError(error)) {
      console.warn('🧹 useAuthErrorHandler: Token expired, handling cleanup')
      await AuthInterceptor.handleExpiredToken()
      return true // Indicates the error was handled
    }
    return false // Indicates the error was not handled
  }, [])

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      const wasHandled = await handleError(error)
      if (!wasHandled) {
        throw error // Re-throw if not a token error
      }
      throw new Error('Session expired. Please log in again.')
    }
  }, [handleError])

  return {
    handleError,
    executeWithErrorHandling
  }
}
