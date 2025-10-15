'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Send, ArrowLeft, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/secure-auth-provider';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  variables: string[];
}

interface Domain {
  id: string;
  domain: string;
  verification_status: string;
}

export default function SendEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    from_email: '',
    to_emails: '',
    subject: '',
    html_content: '',
    text_content: '',
    template_id: '',
    template_data: '{}'
  });

  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchDomains();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/mail/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/mail/domains');
      const data = await response.json();
      const verifiedDomains = data.domains?.filter((d: Domain) => d.verification_status === 'verified') || [];
      setDomains(verifiedDomains);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate(null);
      setFormData(prev => ({
        ...prev,
        template_id: '',
        subject: '',
        html_content: ''
      }));
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setFormData(prev => ({
          ...prev,
          template_id: templateId,
          subject: template.subject,
          html_content: template.html_content
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate form
      if (!formData.from_email || !formData.to_emails || !formData.subject) {
        throw new Error('Please fill in all required fields');
      }

      // Parse to_emails
      const toEmails = formData.to_emails.split(',').map(email => email.trim()).filter(Boolean);
      if (toEmails.length === 0) {
        throw new Error('Please provide at least one recipient email');
      }

      // Parse template data if using template
      let templateData = {};
      if (formData.template_id && formData.template_data) {
        try {
          templateData = JSON.parse(formData.template_data);
        } catch {
          throw new Error('Invalid template data JSON');
        }
      }

      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_email: formData.from_email,
          to_emails: toEmails,
          subject: formData.subject,
          html_content: formData.html_content,
          text_content: formData.text_content,
          template_id: formData.template_id || undefined,
          template_data: Object.keys(templateData).length > 0 ? templateData : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setSuccess(true);
      // Reset form
      setFormData({
        from_email: '',
        to_emails: '',
        subject: '',
        html_content: '',
        text_content: '',
        template_id: '',
        template_data: '{}'
      });
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Send Email</h1>
          <p className="text-gray-600">Send a single email or use a template</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Email sent successfully! You can view it in the Messages tab.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* No verified domains warning */}
      {domains.length === 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You need to verify at least one domain before sending emails.{' '}
            <Button variant="link" className="p-0 h-auto text-yellow-800 underline" onClick={() => router.push('/mail/domains/add')}>
              Add a domain
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label htmlFor="template">Template (Optional)</Label>
                  <Select value={formData.template_id} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template or compose manually" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template (compose manually)</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From Email */}
                <div className="space-y-2">
                  <Label htmlFor="from_email">From Email *</Label>
                  <Select value={formData.from_email} onValueChange={(value) => setFormData(prev => ({ ...prev, from_email: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sender email" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={`noreply@${domain.domain}`}>
                          noreply@{domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* To Emails */}
                <div className="space-y-2">
                  <Label htmlFor="to_emails">To Emails *</Label>
                  <Input
                    id="to_emails"
                    type="text"
                    placeholder="recipient@example.com, another@example.com"
                    value={formData.to_emails}
                    onChange={(e) => setFormData(prev => ({ ...prev, to_emails: e.target.value }))}
                    required
                  />
                  <p className="text-sm text-gray-500">Separate multiple emails with commas</p>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    type="text"
                    placeholder="Email subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>

                {/* HTML Content */}
                <div className="space-y-2">
                  <Label htmlFor="html_content">HTML Content *</Label>
                  <Textarea
                    id="html_content"
                    placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                    value={formData.html_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
                    rows={10}
                    required
                  />
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <Label htmlFor="text_content">Text Content (Optional)</Label>
                  <Textarea
                    id="text_content"
                    placeholder="Plain text version of your email..."
                    value={formData.text_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Variables */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Template Data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable) => (
                        <Badge key={variable} variant="outline">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template_data">Template Data (JSON)</Label>
                    <Textarea
                      id="template_data"
                      placeholder='{"name": "John", "company": "Acme Inc"}'
                      value={formData.template_data}
                      onChange={(e) => setFormData(prev => ({ ...prev, template_data: e.target.value }))}
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send Button */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || domains.length === 0}
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
