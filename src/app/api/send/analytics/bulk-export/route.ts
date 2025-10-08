import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const body = await request.json()
    const { documentIds, format = 'csv' } = body

    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: 'documentIds array is required' },
        { status: 400 }
      )
    }

    // Verify all documents belong to the user
    const { data: userDocuments, error: verifyError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, title, file_name, created_at')
      .eq('user_id', userId)
      .in('id', documentIds)

    if (verifyError) {
      return NextResponse.json(
        { error: 'Failed to verify document ownership' },
        { status: 500 }
      )
    }

    const ownedDocumentIds = userDocuments?.map(doc => doc.id) || []
    const unauthorizedIds = documentIds.filter(id => !ownedDocumentIds.includes(id))

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: `Unauthorized access to documents: ${unauthorizedIds.join(', ')}` },
        { status: 403 }
      )
    }

    // Get analytics data for all documents
    const analyticsData = []

    for (const document of userDocuments || []) {
      // Get document views
      const { data: views, error: viewsError } = await supabaseAdmin
        .from('send_document_views')
        .select(`
          id,
          viewed_at,
          ip_address,
          user_agent,
          referrer,
          duration_seconds,
          pages_viewed,
          visitor_sessions (
            id,
            visitor_id,
            email,
            location_country,
            location_city
          )
        `)
        .eq('document_id', document.id)
        .order('viewed_at', { ascending: false })

      if (viewsError) {
        console.error('Error fetching views for document', document.id, viewsError)
        continue
      }

      // Get document links
      const { data: links, error: linksError } = await supabaseAdmin
        .from('send_document_links')
        .select('id, name, slug, created_at, expires_at, view_count')
        .eq('document_id', document.id)

      if (linksError) {
        console.error('Error fetching links for document', document.id, linksError)
      }

      // Aggregate analytics
      const totalViews = views?.length || 0
      const uniqueViewers = new Set(views?.map((v: any) => v.visitor_sessions?.visitor_id).filter(Boolean)).size
      const totalDuration = views?.reduce((sum: number, v: any) => sum + (v.duration_seconds || 0), 0) || 0
      const avgDuration = totalViews > 0 ? Math.round(totalDuration / totalViews) : 0
      const totalPages = views?.reduce((sum: number, v: any) => sum + (v.pages_viewed || 0), 0) || 0
      const avgPages = totalViews > 0 ? Math.round(totalPages / totalViews) : 0

      // Get top countries
      const countries = views?.map((v: any) => v.visitor_sessions?.location_country).filter(Boolean) || []
      const countryStats = countries.reduce((acc: any, country) => {
        acc[country] = (acc[country] || 0) + 1
        return acc
      }, {})
      const topCountry = Object.keys(countryStats).sort((a, b) => countryStats[b] - countryStats[a])[0] || 'Unknown'

      analyticsData.push({
        document_id: document.id,
        document_title: document.title,
        document_filename: document.file_name,
        document_created: document.created_at,
        total_views: totalViews,
        unique_viewers: uniqueViewers,
        total_duration_seconds: totalDuration,
        average_duration_seconds: avgDuration,
        total_pages_viewed: totalPages,
        average_pages_viewed: avgPages,
        top_country: topCountry,
        share_links_count: links?.length || 0,
        first_view: views?.[views.length - 1]?.viewed_at || null,
        last_view: views?.[0]?.viewed_at || null
      })
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: analyticsData,
        exported_at: new Date().toISOString(),
        total_documents: analyticsData.length
      })
    }

    // Generate CSV
    if (analyticsData.length === 0) {
      return NextResponse.json(
        { error: 'No analytics data found for the selected documents' },
        { status: 404 }
      )
    }

    const csvHeaders = [
      'Document ID',
      'Document Title',
      'Filename',
      'Created Date',
      'Total Views',
      'Unique Viewers',
      'Total Duration (seconds)',
      'Average Duration (seconds)',
      'Total Pages Viewed',
      'Average Pages Viewed',
      'Top Country',
      'Share Links Count',
      'First View',
      'Last View'
    ]

    const csvRows = analyticsData.map(row => [
      row.document_id,
      `"${row.document_title.replace(/"/g, '""')}"`,
      `"${row.document_filename.replace(/"/g, '""')}"`,
      row.document_created,
      row.total_views,
      row.unique_viewers,
      row.total_duration_seconds,
      row.average_duration_seconds,
      row.total_pages_viewed,
      row.average_pages_viewed,
      row.top_country,
      row.share_links_count,
      row.first_view || '',
      row.last_view || ''
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    const filename = `document-analytics-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Bulk analytics export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to get export preview
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const { searchParams } = new URL(request.url)
    const documentIds = searchParams.get('documentIds')?.split(',') || []

    if (documentIds.length === 0) {
      return NextResponse.json(
        { error: 'documentIds parameter is required' },
        { status: 400 }
      )
    }

    // Get basic document info for preview
    const { data: documents, error } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, title, file_name, created_at')
      .eq('user_id', userId)
      .in('id', documentIds)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      total_documents: documents?.length || 0,
      export_fields: [
        'Document ID',
        'Document Title',
        'Filename',
        'Created Date',
        'Total Views',
        'Unique Viewers',
        'Total Duration',
        'Average Duration',
        'Total Pages Viewed',
        'Average Pages Viewed',
        'Top Country',
        'Share Links Count',
        'First View',
        'Last View'
      ]
    })

  } catch (error) {
    console.error('Export preview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
