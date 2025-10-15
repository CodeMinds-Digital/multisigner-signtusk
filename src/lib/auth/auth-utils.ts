import { NextRequest } from 'next/server';
import { getAuthTokensFromRequest } from '@/lib/auth-cookies';
import { verifyAccessToken } from '@/lib/jwt-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

/**
 * Get current authenticated user from request
 * Used in API routes for authentication
 */
export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  try {
    // If no request provided, we can't get user (for client-side usage)
    if (!request) {
      return null;
    }

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request);

    if (!accessToken) {
      return null;
    }

    // Verify the access token
    const payload = await verifyAccessToken(accessToken);

    if (!payload || !payload.userId) {
      return null;
    }

    // Get user profile from database
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', payload.userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: payload.role
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication in API routes
 * Throws error if user is not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Get user ID from request (convenience function)
 */
export async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const user = await getCurrentUser(request);
    return user?.id || null;
  } catch (error) {
    return null;
  }
}
