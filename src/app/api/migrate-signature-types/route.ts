import { NextResponse } from 'next/server'
import { SignatureTypeMigration } from '@/lib/migrate-signature-types'

// This endpoint is only for development/admin purposes
export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    if (action === 'preview') {
      const preview = await SignatureTypeMigration.previewMigration()
      return NextResponse.json(preview)
    }

    if (action === 'migrate') {
      const result = await SignatureTypeMigration.migrateAllDocuments()
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action. Use "preview" or "migrate"' }, { status: 400 })

  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const preview = await SignatureTypeMigration.previewMigration()
    return NextResponse.json(preview)
  } catch (error) {
    console.error('Migration preview error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
