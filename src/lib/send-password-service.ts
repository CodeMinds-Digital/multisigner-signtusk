/**
 * Send Password Protection Service
 * Handles password hashing and verification for protected links
 */

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export class SendPasswordService {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty')
    }

    if (password.length < 4) {
      throw new Error('Password must be at least 4 characters')
    }

    if (password.length > 128) {
      throw new Error('Password must be less than 128 characters')
    }

    return await bcrypt.hash(password, SALT_ROUNDS)
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false
    }

    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    valid: boolean
    errors: string[]
    strength: 'weak' | 'medium' | 'strong'
  } {
    const errors: string[] = []
    let strength: 'weak' | 'medium' | 'strong' = 'weak'

    if (!password) {
      errors.push('Password is required')
      return { valid: false, errors, strength }
    }

    if (password.length < 4) {
      errors.push('Password must be at least 4 characters')
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }

    // Calculate strength
    let strengthScore = 0

    if (password.length >= 8) strengthScore++
    if (password.length >= 12) strengthScore++
    if (/[a-z]/.test(password)) strengthScore++
    if (/[A-Z]/.test(password)) strengthScore++
    if (/[0-9]/.test(password)) strengthScore++
    if (/[^a-zA-Z0-9]/.test(password)) strengthScore++

    if (strengthScore <= 2) strength = 'weak'
    else if (strengthScore <= 4) strength = 'medium'
    else strength = 'strong'

    return {
      valid: errors.length === 0,
      errors,
      strength
    }
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      password += charset[randomIndex]
    }

    return password
  }

  /**
   * Check if password has been compromised (basic check)
   * In production, you would use Have I Been Pwned API
   */
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // Common weak passwords
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
      'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
      'bailey', 'passw0rd', 'shadow', '123123', '654321'
    ]

    return commonPasswords.includes(password.toLowerCase())
  }
}

