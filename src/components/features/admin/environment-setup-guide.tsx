'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, AlertTriangle, ExternalLink, Copy, 
  Database, Mail, Globe, Key
} from 'lucide-react'

export function EnvironmentSetupGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const setupSteps = [
    {
      title: 'Supabase Database Setup',
      icon: <Database className="w-5 h-5" />,
      required: true,
      description: 'Set up your Supabase project for database and authentication',
      variables: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      steps: [
        'Go to https://supabase.com and create a new project',
        'Navigate to Settings > API in your Supabase dashboard',
        'Copy the Project URL and paste it as NEXT_PUBLIC_SUPABASE_URL',
        'Copy the anon/public key and paste it as NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ],
      example: {
        url: 'https://your-project.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    },
    {
      title: 'Resend Email Service',
      icon: <Mail className="w-5 h-5" />,
      required: true,
      description: 'Configure email delivery for signature requests',
      variables: ['RESEND_API_KEY'],
      steps: [
        'Sign up at https://resend.com',
        'Go to API Keys in your Resend dashboard',
        'Create a new API key',
        'Copy the API key and paste it as RESEND_API_KEY'
      ],
      example: {
        key: 're_AbCdEfGh_1234567890abcdefghijklmnop'
      }
    },
    {
      title: 'Application Configuration',
      icon: <Globe className="w-5 h-5" />,
      required: true,
      description: 'Basic application settings',
      variables: ['NEXT_PUBLIC_APP_URL'],
      steps: [
        'Set your application URL',
        'For development: http://localhost:3000',
        'For production: your actual domain'
      ],
      example: {
        dev: 'http://localhost:3000',
        prod: 'https://yourdomain.com'
      }
    },
    {
      title: 'Payment Processing (Optional)',
      icon: <Key className="w-5 h-5" />,
      required: false,
      description: 'Stripe integration for paid plans',
      variables: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
      steps: [
        'Create a Stripe account at https://stripe.com',
        'Get your API keys from the Stripe dashboard',
        'Add both secret and publishable keys'
      ],
      example: {
        secret: 'sk_test_...',
        publishable: 'pk_test_...'
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Environment Setup Guide</h2>
        <p className="text-gray-600">Follow these steps to configure your SignTusk environment</p>
      </div>

      {setupSteps.map((step, index) => (
        <Card key={index} className={step.required ? 'border-blue-200' : 'border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center">
              {step.icon}
              <span className="ml-2">{step.title}</span>
              {step.required ? (
                <Badge className="ml-2 bg-red-100 text-red-800">Required</Badge>
              ) : (
                <Badge className="ml-2 bg-gray-100 text-gray-800">Optional</Badge>
              )}
            </CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Environment Variables */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Environment Variables:</h4>
              <div className="space-y-1">
                {step.variables.map(variable => (
                  <div key={variable} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <code className="text-sm font-mono">{variable}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(variable)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Steps */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Setup Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                {step.steps.map((stepText, stepIndex) => (
                  <li key={stepIndex}>{stepText}</li>
                ))}
              </ol>
            </div>

            {/* Examples */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Example Values:</h4>
              <div className="space-y-2">
                {Object.entries(step.example).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <span className="text-xs text-blue-600 uppercase font-medium">{key}:</span>
                      <code className="ml-2 text-sm font-mono text-blue-800">{value}</code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(value)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* External Links */}
            {step.title.includes('Supabase') && (
              <Button variant="outline" className="w-full" asChild>
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Supabase Dashboard
                </a>
              </Button>
            )}

            {step.title.includes('Resend') && (
              <Button variant="outline" className="w-full" asChild>
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Resend Dashboard
                </a>
              </Button>
            )}

            {step.title.includes('Stripe') && (
              <Button variant="outline" className="w-full" asChild>
                <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Dashboard
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Quick Start */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Quick Start Template
          </CardTitle>
          <CardDescription className="text-green-600">
            Copy this template to your .env.local file to get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-4 rounded border">
            <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
{`# SignTusk Environment Variables
# Copy this to your .env.local file

# Database Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email Service (Required)
RESEND_API_KEY=re_AbCdEfGh_1234567890abcdefghijklmnop

# Application Configuration (Required)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payment Processing (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Authentication (Optional)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000`}
            </pre>
            <Button
              className="mt-4 w-full"
              onClick={() => copyToClipboard(`# SignTusk Environment Variables
# Copy this to your .env.local file

# Database Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email Service (Required)
RESEND_API_KEY=re_AbCdEfGh_1234567890abcdefghijklmnop

# Application Configuration (Required)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payment Processing (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Authentication (Optional)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000`)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Configure the required environment variables above</li>
            <li>Restart your development server after adding variables</li>
            <li>Test the configuration using the Environment Management tab</li>
            <li>Verify email delivery and database connectivity</li>
            <li>Set up your Supabase database tables if needed</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
