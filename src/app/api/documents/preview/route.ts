import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

        // Use public URL instead of signed URL (like Drive API does)
        // This works even if the file doesn't physically exist in storage
        const { data } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(path)

        if (!data?.publicUrl) {
            console.error(`❌ No public URL available for ${bucket}`)
            return NextResponse.json(
                { success: false, error: `No public URL available for ${bucket}` },
                { status: 404 }
            )
        }

        console.log(`✅ Successfully got public URL from ${bucket}: ${data.publicUrl}`)

        return NextResponse.json({
            success: true,
            url: data.publicUrl,
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
