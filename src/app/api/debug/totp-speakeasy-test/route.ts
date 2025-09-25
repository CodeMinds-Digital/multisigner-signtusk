import { NextRequest, NextResponse } from 'next/server'
import * as speakeasy from 'speakeasy'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Speakeasy TOTP implementation...')

    // Test 1: Generate a new secret and immediately verify
    const secret = speakeasy.generateSecret({
      name: 'test@example.com',
      issuer: 'SignTusk Test',
      length: 32
    })

    console.log('🔑 Generated secret:', {
      base32: secret.base32,
      length: secret.base32.length,
      otpauth_url: secret.otpauth_url
    })

    // Test 2: Generate token and verify immediately
    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32'
    })

    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token: token,
      window: 2
    })

    console.log('⚡ Immediate verification:', { token, verified })

    // Test 3: Test with database secret if it exists
    const dbSecret = 'MB6UMORNAY4DOOSO'
    let dbTest = null
    
    try {
      const dbToken = speakeasy.totp({
        secret: dbSecret,
        encoding: 'base32'
      })

      const dbVerified = speakeasy.totp.verify({
        secret: dbSecret,
        encoding: 'base32',
        token: dbToken,
        window: 2
      })

      dbTest = {
        secret: dbSecret,
        token: dbToken,
        verified: dbVerified
      }

      console.log('💾 Database secret test:', dbTest)
    } catch (error) {
      console.error('Database secret test failed:', error)
      dbTest = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Test 4: Generate multiple time windows for current time
    const timeWindows = []
    const now = Math.floor(Date.now() / 1000)
    
    for (let i = -2; i <= 2; i++) {
      const timeStep = now + (i * 30)
      try {
        const windowToken = speakeasy.totp({
          secret: secret.base32,
          encoding: 'base32',
          time: timeStep
        })
        
        const windowVerified = speakeasy.totp.verify({
          secret: secret.base32,
          encoding: 'base32',
          token: windowToken,
          window: 2
        })

        timeWindows.push({
          offset: i,
          token: windowToken,
          verified: windowVerified,
          time: new Date(timeStep * 1000).toISOString()
        })
      } catch (error) {
        timeWindows.push({
          offset: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      tests: {
        newSecretTest: {
          secret: secret.base32,
          token: token,
          verified: verified,
          otpauth_url: secret.otpauth_url
        },
        databaseSecretTest: dbTest,
        timeWindowTests: timeWindows,
        library: 'speakeasy',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Speakeasy test error:', error)
    return NextResponse.json({
      error: 'Speakeasy test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, secret } = await request.json()
    
    console.log('🧪 Manual Speakeasy verification:', { token, secret })

    // Verify the provided token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    // Generate current expected token
    const expectedToken = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    })

    // Test multiple time windows
    const timeTests = []
    const now = Math.floor(Date.now() / 1000)
    
    for (let i = -2; i <= 2; i++) {
      const timeStep = now + (i * 30)
      const windowToken = speakeasy.totp({
        secret: secret,
        encoding: 'base32',
        time: timeStep
      })
      
      timeTests.push({
        offset: i,
        token: windowToken,
        matches: windowToken === token,
        time: new Date(timeStep * 1000).toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      result: {
        providedToken: token,
        providedSecret: secret,
        expectedCurrentToken: expectedToken,
        verified: verified,
        timeWindowTests: timeTests,
        library: 'speakeasy',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Speakeasy manual test error:', error)
    return NextResponse.json({
      error: 'Speakeasy manual test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
