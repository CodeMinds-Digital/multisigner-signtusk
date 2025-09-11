import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const bucket = searchParams.get('bucket')
        const path = searchParams.get('path')

        if (!bucket || !path) {
            return NextResponse.json(
                { success: false, error: 'Missing bucket or path parameter' },
                { status: 400 }
            )
        }

        console.log(`🔍 PDF Preview request - Bucket: ${bucket}, Path: ${path}`)

        const cookieStore = await cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Try to get the signed URL for the document
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600) // 1 hour expiry

        if (error) {
            console.error(`❌ Error getting signed URL from ${bucket}:`, error)
            return NextResponse.json(
                { success: false, error: `Failed to access document in ${bucket}: ${error.message}` },
                { status: 404 }
            )
        }

        if (!data?.signedUrl) {
            console.error(`❌ No signed URL returned from ${bucket}`)
            return NextResponse.json(
                { success: false, error: `No signed URL available for ${bucket}` },
                { status: 404 }
            )
        }

        console.log(`✅ Successfully got signed URL from ${bucket}`)

        return NextResponse.json({
            success: true,
            url: data.signedUrl,
            bucket: bucket,
            path: path
        })

    } catch (error) {
        console.error('❌ Unexpected error in PDF preview:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
