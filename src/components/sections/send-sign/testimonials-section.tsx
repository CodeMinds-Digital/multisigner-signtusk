'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, TrendingUp, Shield, Globe } from 'lucide-react';
import { AnimatedSection, AnimatedItem } from '@/components/ui/animated-section';
import { GlassCard } from '@/components/ui/glass-card';

const testimonials = [
  {
    quote: "We replaced both DocuSign and DocSend with Send & Sign — now we manage everything from one dashboard. It's faster, clearer, and saves us hours every week.",
    author: 'Sarah Patel',
    role: 'LegalOps Manager',
    company: 'TaskFlow',
    initials: 'SP',
    color: 'from-blue-500 to-violet-500',
  },
  {
    quote: "The analytics are a game changer. I know when prospects open a proposal — and can follow up at the right time.",
    author: 'Michael Lin',
    role: 'Sales Director',
    company: 'GrowthIQ',
    initials: 'ML',
    color: 'from-violet-500 to-purple-500',
  },
];

const metrics = [
  {
    icon: TrendingUp,
    value: '60%',
    label: 'faster signing time',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Shield,
    value: '99.99%',
    label: 'uptime',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Globe,
    value: '12K+',
    label: 'trusted users',
    color: 'from-violet-500 to-purple-500',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-violet-400 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Loved by Teams That{' '}
            <span className="text-gradient">Move Fast</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of teams who trust Send & Sign for their critical documents
          </p>
        </AnimatedSection>

        {/* Testimonials Grid */}
        <AnimatedSection variant="slideUp" staggerChildren={0.2} className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <AnimatedItem key={testimonial.author}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="h-full"
                >
                  <GlassCard
                    glassVariant="medium"
                    withGradientBorder={false}
                    hoverEffect={true}
                    lightMode={true}
                    className="rounded-2xl p-8 h-full border-2 border-transparent hover:border-violet-200"
                  >
                    {/* Gradient Border Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${testimonial.color} opacity-0 hover:opacity-5 rounded-2xl transition-opacity duration-300`} />

                    {/* Quote Icon */}
                    <div className="relative mb-6">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${testimonial.color} flex items-center justify-center shadow-lg`}>
                        <Quote className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Quote Text */}
                    <div className="relative mb-6">
                      <p className="text-lg text-gray-700 italic leading-relaxed">
                        "{testimonial.quote}"
                      </p>
                    </div>

                    {/* Author Info */}
                    <div className="relative flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${testimonial.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <span className="text-white font-bold text-lg">
                          {testimonial.initials}
                        </span>
                      </div>

                      {/* Author Details */}
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">
                          {testimonial.author}
                        </div>
                        <div className="text-sm text-gray-600">
                          {testimonial.role} at {testimonial.company}
                        </div>
                      </div>
                    </div>

                    {/* Decorative Corner */}
                    <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${testimonial.color} opacity-10 rounded-bl-full`} />
                  </GlassCard>
                </motion.div>
              </AnimatedItem>
            ))}
          </div>
        </AnimatedSection>

        {/* Metrics Bar */}
        <AnimatedSection variant="fadeIn" className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${metric.color} flex items-center justify-center shadow-lg`}>
                      <metric.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Value with Counter Animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.2 + 0.3, type: 'spring' }}
                    className={`text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${metric.color} mb-2`}
                  >
                    {metric.value}
                  </motion.div>

                  {/* Label */}
                  <div className="text-gray-600 font-medium">
                    {metric.label}
                  </div>

                  {/* Progress Bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: index * 0.2 + 0.5, duration: 0.8 }}
                    className="mt-4 mx-auto max-w-[200px]"
                  >
                    <div className={`h-2 bg-gradient-to-r ${metric.color} rounded-full`} />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Social Proof */}
        <AnimatedSection variant="fadeIn" className="text-center mt-12">
          <p className="text-gray-600 text-lg">
            Join the growing community of professionals who trust Send & Sign
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

