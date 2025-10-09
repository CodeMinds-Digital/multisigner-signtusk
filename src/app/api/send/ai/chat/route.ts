import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Mock AI service - replace with actual AI provider (OpenAI, Anthropic, etc.)
class AIDocumentService {
  static async analyzeDocument(documentId: string): Promise<{
    content: string
    pages: Array<{ page: number; text: string }>
  }> {
    // In production, this would:
    // 1. Extract text from PDF using OCR/text extraction
    // 2. Process and chunk the content
    // 3. Store in vector database for semantic search

    // Mock implementation
    return {
      content: "This is a sample document analysis. In production, this would contain the actual extracted text from the PDF.",
      pages: [
        { page: 1, text: "Introduction and overview content..." },
        { page: 2, text: "Main body content with key points..." },
        { page: 3, text: "Conclusions and next steps..." }
      ]
    }
  }

  static async answerQuestion(
    question: string,
    documentContent: string,
    conversationHistory: any[]
  ): Promise<{
    answer: string
    sources: Array<{ page: number; text: string; confidence: number }>
  }> {
    // In production, this would:
    // 1. Use semantic search to find relevant document sections
    // 2. Send to AI model (GPT-4, Claude, etc.) with context
    // 3. Return structured response with sources

    // Mock responses based on common questions
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes('summary') || lowerQuestion.includes('about')) {
      return {
        answer: "This document appears to be a comprehensive overview covering key business metrics, strategic initiatives, and future planning. The main sections include executive summary, financial performance, market analysis, and recommendations for next steps.",
        sources: [
          { page: 1, text: "Executive Summary section", confidence: 0.95 },
          { page: 2, text: "Key findings and metrics", confidence: 0.87 }
        ]
      }
    }

    if (lowerQuestion.includes('key points') || lowerQuestion.includes('main')) {
      return {
        answer: "The key points from this document include: 1) Strong quarterly performance with 25% growth, 2) Successful product launch in Q3, 3) Expansion into new markets planned for next year, 4) Investment in technology infrastructure, and 5) Focus on customer retention strategies.",
        sources: [
          { page: 2, text: "Performance metrics section", confidence: 0.92 },
          { page: 3, text: "Strategic initiatives overview", confidence: 0.88 }
        ]
      }
    }

    if (lowerQuestion.includes('date') || lowerQuestion.includes('deadline') || lowerQuestion.includes('timeline')) {
      return {
        answer: "Important dates mentioned in the document include: Q4 2024 review deadline (December 15th), new product launch scheduled for January 2025, and annual board meeting planned for March 2025.",
        sources: [
          { page: 4, text: "Timeline and milestones", confidence: 0.90 }
        ]
      }
    }

    if (lowerQuestion.includes('action') || lowerQuestion.includes('required') || lowerQuestion.includes('next steps')) {
      return {
        answer: "The document outlines several action items: 1) Review and approve budget allocation by end of month, 2) Schedule stakeholder meetings for Q1 planning, 3) Finalize vendor contracts for new initiatives, and 4) Prepare quarterly report for board presentation.",
        sources: [
          { page: 5, text: "Action items and responsibilities", confidence: 0.93 }
        ]
      }
    }

    if (lowerQuestion.includes('conclusion') || lowerQuestion.includes('recommendation')) {
      return {
        answer: "The document concludes with strong recommendations to continue current growth strategies while investing in new technology platforms. It emphasizes the importance of maintaining customer satisfaction while expanding market reach through strategic partnerships.",
        sources: [
          { page: 6, text: "Conclusions and recommendations", confidence: 0.89 }
        ]
      }
    }

    // Generic response for other questions
    return {
      answer: `I understand you're asking about "${question}". Based on the document content, I can see this relates to the main themes discussed. However, I'd need more specific information to provide a detailed answer. Could you rephrase your question or ask about a specific section?`,
      sources: [
        { page: 1, text: "General document content", confidence: 0.70 }
      ]
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get request body
    const { documentId, linkId, question, conversationHistory } = await request.json()

    if (!documentId || !question) {
      return NextResponse.json(
        { error: 'Document ID and question are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this document
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, title, user_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if user owns the document OR has access via link
    let hasAccess = document.user_id === userId

    if (!hasAccess && linkId) {
      const { data: link, error: linkError } = await supabaseAdmin
        .from('send_document_links')
        .select('id, document_id')
        .eq('id', linkId)
        .eq('document_id', documentId)
        .single()

      hasAccess = !linkError && !!link
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get or analyze document content
    const documentAnalysis = await AIDocumentService.analyzeDocument(documentId)

    // Get AI response
    const aiResponse = await AIDocumentService.answerQuestion(
      question,
      documentAnalysis.content,
      conversationHistory || []
    )

    // Track AI interaction in analytics
    try {
      await supabaseAdmin
        .from('send_analytics_events')
        .insert({
          document_id: documentId,
          link_id: linkId,
          event_type: 'ai_question',
          event_data: {
            question: question.substring(0, 500), // Limit length
            answer_length: aiResponse.answer.length,
            sources_count: aiResponse.sources.length
          },
          ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
          user_agent: request.headers.get('user-agent') || 'unknown'
        })
    } catch (analyticsError) {
      console.error('Failed to track AI interaction:', analyticsError)
      // Don't fail the request if analytics fails
    }

    return NextResponse.json({
      success: true,
      answer: aiResponse.answer,
      sources: aiResponse.sources,
      documentTitle: document.title
    })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Get AI interaction analytics for this document
    const { data: interactions, error } = await supabaseAdmin
      .from('send_analytics_events')
      .select('event_data, created_at')
      .eq('document_id', documentId)
      .eq('event_type', 'ai_question')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch AI analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    // Process analytics data
    const analytics = {
      totalQuestions: interactions.length,
      recentQuestions: interactions.slice(0, 10).map(i => ({
        question: i.event_data.question,
        timestamp: i.created_at
      })),
      questionsByDay: {} // Could aggregate by day
    }

    return NextResponse.json({
      success: true,
      analytics
    })

  } catch (error) {
    console.error('AI analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
