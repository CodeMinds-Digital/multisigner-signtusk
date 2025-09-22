import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('user_id')

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('document_id_settings')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Database error getting settings:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: data || null })
    } catch (error) {
        console.error('Unexpected error getting settings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, ...settingsData } = body

        if (!user_id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Check if settings already exist
        const { data: existingSettings } = await supabaseAdmin
            .from('document_id_settings')
            .select('*')
            .eq('user_id', user_id)
            .single()

        // Prepare settings to save
        const settingsToSave = {
            user_id,
            generation_type: settingsData.generation_type,
            // For custom entries, only save relevant fields
            prefix: settingsData.generation_type === 'custom' ? null : (settingsData.prefix || 'DOC'),
            separator: settingsData.generation_type === 'custom' ? null : (settingsData.separator || '-'),
            total_length: settingsData.generation_type === 'custom' ? (settingsData.total_length || 25) : (settingsData.total_length || 8),
            character_count: settingsData.generation_type === 'custom' ? null : (settingsData.character_count || 3),
            number_count: settingsData.generation_type === 'custom' ? null : (settingsData.number_count || 5),
            include_year: settingsData.generation_type === 'custom' ? false : (settingsData.include_year !== false),
            include_month: settingsData.generation_type === 'custom' ? false : (settingsData.include_month !== false),
            case_style: settingsData.generation_type === 'custom' ? null : (settingsData.case_style || 'upper'),
            number_generation: settingsData.generation_type === 'custom' ? null : (settingsData.number_generation || 'random'),
            sequential_start_number: settingsData.generation_type === 'custom' ? null : (settingsData.sequential_start_number || 1),
            custom_format: settingsData.custom_format || null,
            ensure_uniqueness: settingsData.ensure_uniqueness !== false,
            max_retries: settingsData.max_retries || 10,
            updated_at: new Date().toISOString()
        }



        let result
        if (existingSettings) {
            // Update existing settings
            const { data, error } = await supabaseAdmin
                .from('document_id_settings')
                .update(settingsToSave)
                .eq('user_id', user_id)
                .select()
                .single()

            if (error) {
                console.error('Database error updating settings:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            result = data
        } else {
            // Create new settings
            const { data, error } = await supabaseAdmin
                .from('document_id_settings')
                .insert({
                    ...settingsToSave,
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('Database error inserting settings:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            result = data
        }

        return NextResponse.json({ data: result })

    } catch (error) {
        console.error('Unexpected error saving settings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
