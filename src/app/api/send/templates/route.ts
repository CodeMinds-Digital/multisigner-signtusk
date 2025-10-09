import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/templates - Get all available templates
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    await verifyAccessToken(accessToken)

    // Get all active templates
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('send_branding_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    // Process templates to include features array
    const processedTemplates = (templates || []).map(template => ({
      ...template,
      features: getTemplateFeatures(template.category, template.is_premium)
    }))

    return NextResponse.json({
      success: true,
      templates: processedTemplates
    })

  } catch (error: any) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getTemplateFeatures(category: string, isPremium: boolean): string[] {
  const baseFeatures = ['Professional Design', 'Mobile Responsive', 'Fast Loading']
  
  const categoryFeatures = {
    business: ['Corporate Branding', 'Professional Layout', 'Business Colors'],
    tech: ['Modern Design', 'Tech-focused', 'Clean Interface'],
    finance: ['Financial Styling', 'Trust Elements', 'Professional'],
    legal: ['Legal Compliance', 'Formal Design', 'Document Focus'],
    creative: ['Creative Layout', 'Artistic Elements', 'Unique Design'],
    minimal: ['Clean Design', 'Minimal Elements', 'Focus on Content']
  }

  const premiumFeatures = isPremium ? ['Premium Support', 'Advanced Customization', 'Priority Updates'] : []
  
  return [
    ...baseFeatures,
    ...(categoryFeatures[category as keyof typeof categoryFeatures] || []),
    ...premiumFeatures
  ]
}
