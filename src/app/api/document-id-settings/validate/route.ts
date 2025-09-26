import { NextRequest } from 'next/server'
import { DocumentIdService } from '@/lib/document-id-service'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

export async function POST(request: NextRequest) {
    try {
        // Get access token from cookies
        const { accessToken } = getAuthTokensFromRequest(request)

        if (!accessToken) {
            return new Response(
                JSON.stringify({ error: 'Authentication required' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Verify access token
        const payload = await verifyAccessToken(accessToken)
        const userId = payload.userId

        const body = await request.json()
        const { documentSignId } = body

        if (!documentSignId || typeof documentSignId !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Document Sign ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log('🔍 REAL-TIME VALIDATION - Validating ID:', documentSignId, 'for user:', userId)

        // Validate the custom ID
        const validationResult = await DocumentIdService.validateCustomId(documentSignId.trim(), userId)

        if (!validationResult.isValid) {
            console.log('❌ REAL-TIME VALIDATION - Failed:', validationResult.error)
            return new Response(
                JSON.stringify({
                    error: validationResult.error || 'Document ID is invalid',
                    isValid: false
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log('✅ REAL-TIME VALIDATION - Passed:', documentSignId)
        return new Response(
            JSON.stringify({
                message: 'Document ID is valid',
                isValid: true
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in document ID validation API:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
