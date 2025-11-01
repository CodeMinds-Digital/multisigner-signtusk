'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Share2, FileSignature } from 'lucide-react';
import { AnimatedSection, AnimatedItem } from '@/components/ui/animated-section';
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card';

const steps = [
  {
    number: 1,
    icon: Upload,
    title: 'Upload or Create',
    description: 'Drag and drop your files or start from a ready-made template. Supports PDFs, DOCX, and more.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    number: 2,
    icon: Share2,
    title: 'Send & Track',
    description: 'Generate a secure share link with viewer controls. Track who opens your document and how long they spend.',
    color: 'from-violet-500 to-violet-600',
  },
  {
    number: 3,
    icon: FileSignature,
    title: 'Sign & Store',
    description: 'Request legally binding e-signatures with full audit trails and store them safely in your workspace.',
    color: 'from-purple-500 to-purple-600',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Send and Sign in Three Simple Steps
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Streamline your document workflow from upload to signature
          </p>
        </AnimatedSection>

        {/* Steps Grid */}
        <AnimatedSection variant="slideUp" staggerChildren={0.2} className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {steps.map((step, index) => (
              <AnimatedItem key={step.number}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="relative h-full"
                >
                  {/* Connecting Line (hidden on mobile) */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent -translate-x-4 z-0" />
                  )}

                  {/* Step Card */}
                  <GlassCard
                    glassVariant="subtle"
                    hoverEffect={true}
                    lightMode={true}
                    className="rounded-2xl p-8 h-full"
                  >
                    {/* Number Badge */}
                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}>
                      <span className="text-white text-xl font-bold">{step.number}</span>
                    </div>

                    {/* Icon */}
                    <div className="mt-8 mb-6 flex justify-center">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300`}>
                        <step.icon className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-center">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Decorative Element */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  </GlassCard>
                </motion.div>
              </AnimatedItem>
            ))}
          </div>

          {/* Animated SVG Arrow (Desktop Only) */}
          <svg
            className="hidden md:block absolute top-20 left-0 w-full h-1 pointer-events-none"
            style={{ zIndex: -1 }}
          >
            <motion.path
              d="M 0 0 Q 400 -50 800 0"
              stroke="url(#gradient)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ duration: 2, delay: 0.5 }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </AnimatedSection>
      </div>
    </section>
  );
}

