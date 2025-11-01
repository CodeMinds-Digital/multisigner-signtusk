'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  FileSignature,
  BarChart3,
  FileCheck,
  Users,
  Workflow,
  Plug,
  Brain,
} from 'lucide-react';
import { AnimatedSection, AnimatedItem } from '@/components/ui/animated-section';
import { useStaggerAnimation } from '@/hooks/use-scroll-animation';
import { GlassCard } from '@/components/ui/glass-card';

const features = [
  {
    icon: Shield,
    title: 'Secure Document Sharing',
    description: 'Encrypt every file and control access with expiration dates and viewer permissions.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: FileSignature,
    title: 'E-Signatures Made Simple',
    description: 'Send for signature in one click. Bulk send, templates, and mobile signing included.',
    color: 'from-violet-500 to-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Document Analytics',
    description: 'Know exactly who viewed, how long, and which pages they engaged with most.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: FileCheck,
    title: 'Audit Trails',
    description: 'Maintain detailed signing logs with timestamps and digital certificates.',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: Users,
    title: 'Collaboration Tools',
    description: 'Comment, tag, and manage approvals within your team before sending.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: Workflow,
    title: 'Automated Workflows',
    description: 'Set signing order, auto-reminders, and conditional approvals.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: Plug,
    title: 'Integrations & API',
    description: 'Works with Google Drive, Outlook, Slack, Salesforce, and more.',
    color: 'from-teal-500 to-teal-600',
  },
  {
    icon: Brain,
    title: 'AI Insights',
    description: 'Auto-suggest next steps and flag unsigned documents.',
    color: 'from-emerald-500 to-emerald-600',
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { ref, isVisible } = useStaggerAnimation(index, 50);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group relative"
    >
      <GlassCard
        glassVariant="subtle"
        hoverEffect={true}
        lightMode={true}
        className="rounded-2xl p-6 overflow-hidden h-full"
      >
        {/* Gradient Background on Hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

        {/* Icon Container */}
        <div className="relative mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <feature.icon className="h-7 w-7 text-white" />
          </div>

          {/* Floating Animation */}
          <motion.div
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.1,
            }}
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r ${feature.color} opacity-50`}
          />
        </div>

        {/* Content */}
        <div className="relative">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-violet-600 transition-all duration-300">
            {feature.title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Bottom Accent Line */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
      </GlassCard>
    </motion.div>
  );
}

export function FeaturesGridSection() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to{' '}
            <span className="text-gradient">Send and Sign Smarter</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed for modern teams who value security, efficiency, and transparency
          </p>
        </AnimatedSection>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <AnimatedSection variant="fadeIn" className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            And many more features to explore...
          </p>
          <motion.a
            href="#pricing"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center text-blue-600 font-semibold hover:text-violet-600 transition-colors"
          >
            See all features and pricing
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </motion.a>
        </AnimatedSection>
      </div>
    </section>
  );
}

