'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, CheckCircle } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-16 pb-20 sm:pt-24 sm:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
          {/* Content */}
          <div className="lg:col-span-6">
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
                <CheckCircle className="w-4 h-4 mr-2" />
                Trusted by 10,000+ businesses
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Sign Documents
                <span className="text-blue-600 block">Digitally & Securely</span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Transform your document workflow with our secure digital signing platform. 
                Sign, send, and manage documents from anywhere, at any time.
              </p>

              {/* Key Benefits */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-center lg:justify-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Legally binding signatures</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Bank-level security</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Complete in minutes, not days</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/signup">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold w-full sm:w-auto"
                  >
                    <Play className="mr-2 w-5 h-5" />
                    Watch Demo
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center lg:text-left mb-4">
                  Trusted by leading companies worldwide
                </p>
                <div className="flex items-center justify-center lg:justify-start space-x-8 opacity-60">
                  <div className="text-gray-400 font-semibold">Microsoft</div>
                  <div className="text-gray-400 font-semibold">Google</div>
                  <div className="text-gray-400 font-semibold">Amazon</div>
                  <div className="text-gray-400 font-semibold">Salesforce</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="mt-16 lg:mt-0 lg:col-span-6">
            <div className="relative">
              {/* Placeholder for hero image - you can replace with actual image */}
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="space-y-4">
                  {/* Mock document interface */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">ST</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-100 rounded w-1/2 mt-2"></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    
                    <div className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="w-24 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">Sign Here</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="flex-1 h-8 bg-green-100 rounded flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-green-700 text-xs font-medium">Signed</span>
                    </div>
                    <div className="flex-1 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-blue-700 text-xs font-medium">Send</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
