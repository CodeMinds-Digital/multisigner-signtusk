-- Quick Fix for Document Templates Issue
-- Run this if you encountered the NULL user_id error

-- First, let's modify the document_templates table to allow NULL user_id for system templates
ALTER TABLE public.document_templates 
ALTER COLUMN user_id DROP NOT NULL;

-- Add the is_system_template column if it doesn't exist
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false;

-- Update RLS policies for templates
DROP POLICY IF EXISTS "Users can view their own templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can view templates" ON public.document_templates;

CREATE POLICY "Users can view templates" ON public.document_templates
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_public = true OR 
        is_system_template = true
    );

-- Add policy for system template management
CREATE POLICY "System can manage system templates" ON public.document_templates
    FOR ALL USING (is_system_template = true);

-- Add index for system templates
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON public.document_templates(is_system_template);

-- Now insert the system templates
INSERT INTO public.document_templates (user_id, name, description, template_data, category, is_public, is_system_template) VALUES
(NULL, 'Basic NDA', 'Standard Non-Disclosure Agreement template', 
 '{"fields": [{"type": "signature", "label": "Company Representative"}, {"type": "signature", "label": "Recipient"}], "content": "This is a basic NDA template..."}',
 'legal', true, true),
(NULL, 'Service Agreement', 'Standard service agreement template',
 '{"fields": [{"type": "signature", "label": "Service Provider"}, {"type": "signature", "label": "Client"}], "content": "This is a service agreement template..."}',
 'business', true, true),
(NULL, 'Employment Contract', 'Basic employment contract template',
 '{"fields": [{"type": "signature", "label": "Employer"}, {"type": "signature", "label": "Employee"}], "content": "This is an employment contract template..."}',
 'hr', true, true)
ON CONFLICT DO NOTHING;

-- Verify the templates were created
SELECT 
    name, 
    category, 
    is_public, 
    is_system_template,
    CASE WHEN user_id IS NULL THEN 'System Template' ELSE 'User Template' END as template_type
FROM public.document_templates 
WHERE is_system_template = true;

SELECT 'Document templates fixed successfully!' as message;
