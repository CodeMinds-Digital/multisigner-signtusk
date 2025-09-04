'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium mb-6">
            <CheckCircle className="w-4 h-4 mr-2" />
            No credit card required
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to transform your
            <span className="block">document workflow?</span>
          </h2>

          {/* Subheadline */}
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            Join thousands of businesses that trust SignTusk for secure, efficient digital document signing. 
            Start your free trial today and experience the difference.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold w-full sm:w-auto"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold w-full sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-white mb-2">14-day</div>
                <div className="text-blue-100">Free Trial</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-2">No Setup</div>
                <div className="text-blue-100">Fees</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-2">24/7</div>
                <div className="text-blue-100">Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
