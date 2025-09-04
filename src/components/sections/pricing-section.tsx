'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Star } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for individuals and small teams getting started',
    features: [
      '5 documents per month',
      'Basic e-signatures',
      'Email support',
      'Mobile app access',
      'Basic templates'
    ],
    cta: 'Start Free',
    href: '/signup',
    popular: false
  },
  {
    name: 'Professional',
    price: '$15',
    period: '/month',
    description: 'Ideal for growing businesses and teams',
    features: [
      'Unlimited documents',
      'Advanced e-signatures',
      'Priority support',
      'Custom branding',
      'Advanced templates',
      'Team collaboration',
      'API access',
      'Audit trails'
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with advanced needs',
    features: [
      'Everything in Professional',
      'SSO integration',
      'Advanced security',
      'Dedicated support',
      'Custom integrations',
      'Compliance reporting',
      'White-label solution',
      'SLA guarantee'
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false
  }
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that's right for your business. All plans include our core features and 24/7 support.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-blue-500 scale-105' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href={plan.href} className="block">
                  <Button
                    className={`w-full py-3 text-lg font-semibold ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Start Your Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="px-8">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Have questions? Check out our{' '}
            <Link href="/faq" className="text-blue-600 hover:text-blue-700 font-medium">
              FAQ
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              contact our team
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
