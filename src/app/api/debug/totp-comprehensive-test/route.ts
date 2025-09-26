import { NextRequest, NextResponse } from 'next/server'
import { authenticator } from 'otplib'

// TOTP Configuration matching the service
const TOTP_OPTIONS = {
  step: 30,
  window: 2,
  digits: 6,
  algorithm: 'sha1' as const,
  encoding: 'base32' as const
}

function getAuthenticator() {
  const auth = { ...authenticator } as any
  auth.options = { ...TOTP_OPTIONS }
  return auth
}

export async function GET(_request: NextRequest) {
  try {
    const auth = getAuthenticator()

    // Test 1: Generate a new secret and immediately verify
    console.log('🧪 Starting comprehensive TOTP test...')

    const testSecret = auth.generateSecret()
    console.log('🔑 Generated test secret:', {
      secret: testSecret,
      length: testSecret.length,
      isBase32: /^[A-Z2-7]+$/.test(testSecret)
    })

    // Test 2: Generate token and verify immediately
    const testToken = auth.generate(testSecret)
    const isValidImmediate = auth.verify({ token: testToken, secret: testSecret })

    console.log('⚡ Immediate verification test:', {
      token: testToken,
      isValid: isValidImmediate
    })

    // Test 3: Test with current database secret
    const dbSecret = 'MB6UMORNAY4DOOSO'
    const dbToken = auth.generate(dbSecret)
    const isDbValid = auth.verify({ token: dbToken, secret: dbSecret })

    console.log('💾 Database secret test:', {
      secret: dbSecret,
      token: dbToken,
      isValid: isDbValid,
      isBase32: /^[A-Z2-7]+$/.test(dbSecret)
    })

    // Test 4: Generate multiple time windows
    const now = Date.now()
    const timeWindows = []
    for (let i = -2; i <= 2; i++) {
      const timeOffset = now + (i * 30 * 1000)
      const windowToken = auth.generate(dbSecret, timeOffset)
      timeWindows.push({
        offset: i,
        token: windowToken,
        time: new Date(timeOffset).toISOString(),
        isValid: auth.verify({ token: windowToken, secret: dbSecret })
      })
    }

    return NextResponse.json({
      success: true,
      tests: {
        newSecretTest: {
          secret: testSecret,
          token: testToken,
          isValid: isValidImmediate
        },
        databaseSecretTest: {
          secret: dbSecret,
          token: dbToken,
          isValid: isDbValid
        },
        timeWindows: timeWindows,
        configuration: TOTP_OPTIONS,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('TOTP comprehensive test error:', error)
    return NextResponse.json({
      error: 'TOTP comprehensive test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, secret } = await request.json()
    const auth = getAuthenticator()

    console.log('🧪 Manual TOTP verification test:', { token, secret })

    // Test verification
    const isValid = auth.verify({ token, secret })

    // Generate current expected token
    const expectedToken = auth.generate(secret)

    // Test multiple time windows
    const now = Date.now()
    const timeTests = []
    for (let i = -2; i <= 2; i++) {
      const timeOffset = now + (i * 30 * 1000)
      const windowToken = auth.generate(secret, timeOffset)
      timeTests.push({
        offset: i,
        token: windowToken,
        matches: windowToken === token,
        time: new Date(timeOffset).toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      result: {
        providedToken: token,
        providedSecret: secret,
        expectedCurrentToken: expectedToken,
        isValid: isValid,
        timeWindowTests: timeTests,
        secretValidation: {
          length: secret.length,
          isBase32: /^[A-Z2-7]+$/.test(secret)
        },
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('TOTP manual test error:', error)
    return NextResponse.json({
      error: 'TOTP manual test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
