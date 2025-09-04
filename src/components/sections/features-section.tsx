'use client'

import { Shield, Zap, Users, FileText, Clock, Globe, CheckCircle, Lock } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your documents are protected with 256-bit SSL encryption and comply with international security standards.',
    color: 'text-blue-600'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Sign documents in seconds, not hours. Our streamlined process gets you from upload to signature in minutes.',
    color: 'text-yellow-600'
  },
  {
    icon: Users,
    title: 'Multi-Party Signing',
    description: 'Easily collect signatures from multiple parties with automated reminders and tracking.',
    color: 'text-green-600'
  },
  {
    icon: FileText,
    title: 'Any Document Type',
    description: 'Support for PDFs, Word documents, and more. Upload any document and make it signable instantly.',
    color: 'text-purple-600'
  },
  {
    icon: Clock,
    title: 'Real-Time Tracking',
    description: 'Monitor document status in real-time. Know exactly when documents are viewed, signed, and completed.',
    color: 'text-red-600'
  },
  {
    icon: Globe,
    title: 'Global Compliance',
    description: 'Legally binding signatures that comply with eSignature laws in 180+ countries worldwide.',
    color: 'text-indigo-600'
  }
]

const stats = [
  { number: '10M+', label: 'Documents Signed' },
  { number: '50K+', label: 'Happy Customers' },
  { number: '99.9%', label: 'Uptime' },
  { number: '180+', label: 'Countries' }
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to sign documents digitally
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to streamline your document workflow and ensure security at every step.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div key={index} className="group">
              <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50 ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 sm:p-12">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Trusted by businesses worldwide
            </h3>
            <p className="text-blue-100 text-lg">
              Join thousands of companies that trust SignTusk for their document signing needs
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-blue-100 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className="mt-20 bg-gray-50 rounded-2xl p-8 sm:p-12">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-6">
                <Lock className="w-4 h-4 mr-2" />
                Enterprise Security
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                Your security is our priority
              </h3>
              <p className="text-lg text-gray-600 mb-8">
                We employ the highest security standards to protect your sensitive documents and ensure compliance with global regulations.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">256-bit SSL Encryption</h4>
                    <p className="text-gray-600">All data is encrypted in transit and at rest</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">SOC 2 Type II Certified</h4>
                    <p className="text-gray-600">Independently audited security controls</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">GDPR Compliant</h4>
                    <p className="text-gray-600">Full compliance with data protection regulations</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 lg:mt-0">
              <div className="relative">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <Shield className="w-8 h-8 text-blue-600 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Security Dashboard</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Encryption Status</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Audit Trail</span>
                      <span className="text-green-600 font-medium">Complete</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Compliance</span>
                      <span className="text-green-600 font-medium">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
