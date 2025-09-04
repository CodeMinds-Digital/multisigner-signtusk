import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the full path from the URL
    const templatePath = resolvedParams.path.join('/')

    console.log('Loading template from path:', templatePath)

    // Download the template JSON from Supabase storage
    const { data, error } = await supabase.storage
      .from('files')
      .download(templatePath)

    if (error) {
      console.error('Error downloading template:', error)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Convert blob to text and parse JSON
    const text = await data.text()
    const template = JSON.parse(text)

    console.log('Loaded template:', template)
    console.log('Template signers:', template.signers)
    console.log('Template multiSignature:', template.multiSignature)

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error in template API route:', error)
    return NextResponse.json(
      { error: 'Failed to load template' },
      { status: 500 }
    )
  }
}
