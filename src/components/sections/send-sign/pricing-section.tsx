'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { AnimatedSection, AnimatedItem } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Perfect for trying out Send & Sign',
    features: [
      '3 documents per month',
      'Basic analytics',
      'Email support',
      'Standard templates',
    ],
    cta: 'Get Started',
    href: '/signup',
    popular: false,
    color: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/mo',
    description: 'For individuals and small teams',
    features: [
      'Unlimited documents',
      'Advanced analytics',
      'Custom templates',
      'Priority support',
      'All integrations',
      'API access',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=pro',
    popular: true,
    color: 'from-blue-500 to-violet-500',
  },
  {
    name: 'Business',
    price: '$49',
    period: '/mo',
    description: 'For growing teams',
    features: [
      'Everything in Pro',
      'Team analytics',
      'Custom branding',
      'Advanced API access',
      'Dedicated support',
      'SSO (SAML)',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=business',
    popular: false,
    color: 'from-violet-500 to-purple-500',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Everything in Business',
      'Custom contracts',
      'Admin controls',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
    color: 'from-purple-500 to-pink-500',
  },
];

export function SendSignPricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent{' '}
            <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that fits your workflow. No hidden fees.
          </p>
        </AnimatedSection>

        {/* Pricing Grid */}
        <AnimatedSection variant="slideUp" staggerChildren={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <AnimatedItem key={plan.name}>
                <motion.div
                  whileHover={{ scale: plan.popular ? 1.02 : 1.05, y: -5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className={`relative h-full ${plan.popular ? 'lg:scale-105' : ''
                    }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className={`bg-gradient-to-r ${plan.color} text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg`}
                      >
                        Most Popular
                      </motion.div>
                    </div>
                  )}

                  {/* Card */}
                  <GlassCard
                    glassVariant={plan.popular ? 'medium' : 'subtle'}
                    withGradientBorder={plan.popular}
                    hoverEffect={true}
                    lightMode={true}
                    className={`rounded-2xl p-8 h-full flex flex-col ${plan.popular ? 'border-2 border-violet-500' : ''
                      }`}
                  >
                    {/* Gradient Background on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-0 hover:opacity-5 rounded-2xl transition-opacity duration-300`} />

                    {/* Plan Header */}
                    <div className="relative mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="relative mb-6">
                      <div className="flex items-baseline">
                        <span className={`text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${plan.color}`}>
                          {plan.price}
                        </span>
                        <span className="text-gray-600 ml-2">
                          {plan.period}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="relative flex-1 mb-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-gray-700 text-sm">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="relative">
                      <Link href={plan.href}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            className={`w-full ${plan.popular
                              ? `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                              }`}
                            size="lg"
                          >
                            {plan.cta}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  </GlassCard>
                </motion.div>
              </AnimatedItem>
            ))}
          </div>
        </AnimatedSection>

        {/* Bottom Info */}
        <AnimatedSection variant="fadeIn" className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include 14-day free trial. No credit card required.
          </p>
          <Link href="/pricing">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center text-blue-600 font-semibold hover:text-violet-600 transition-colors"
            >
              Compare all features
              <ArrowRight className="ml-2 h-4 w-4" />
            </motion.span>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}

