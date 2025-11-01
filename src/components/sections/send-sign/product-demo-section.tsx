'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Upload, Share2, FileSignature, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/ui/animated-section';
import { GlassCard } from '@/components/ui/glass-card';
import Link from 'next/link';

const workflowSteps = [
  { icon: Upload, label: 'Upload', color: 'from-blue-500 to-blue-600', delay: 0 },
  { icon: Share2, label: 'Send', color: 'from-violet-500 to-violet-600', delay: 0.3 },
  { icon: FileSignature, label: 'Sign', color: 'from-purple-500 to-purple-600', delay: 0.6 },
  { icon: BarChart3, label: 'Track', color: 'from-pink-500 to-pink-600', delay: 0.9 },
];

export function ProductDemoSection() {
  return (
    <section id="product-demo" className="py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-violet-900 relative overflow-hidden">
      {/* Animated Background Elements */}
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
          className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
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
          className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            See Send & Sign in Action
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Experience how simple it is to upload, send, and sign your first document.
          </p>
        </AnimatedSection>

        {/* Demo Container */}
        <AnimatedSection variant="scaleIn" className="max-w-5xl mx-auto">
          <GlassCard glassVariant="medium" hoverEffect={true} lightMode={false} className="p-8 rounded-3xl border-2 border-white/20 relative overflow-hidden">
            {/* Gradient Border Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 opacity-20 blur-xl" />

            {/* Demo Content */}
            <div className="relative bg-gray-900/50 rounded-2xl p-8 backdrop-blur-sm">
              {/* Workflow Steps */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {workflowSteps.map((step, index) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: step.delay + 0.5, duration: 0.5 }}
                    className="text-center"
                  >
                    {/* Icon */}
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: index * 0.2,
                      }}
                      className={`w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}
                    >
                      <step.icon className="h-8 w-8 text-white" />
                    </motion.div>

                    {/* Label */}
                    <p className="text-white font-semibold">{step.label}</p>

                    {/* Progress Indicator */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: step.delay + 1, duration: 0.5 }}
                      className={`h-1 bg-gradient-to-r ${step.color} rounded-full mt-2`}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Mock Document Interface */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="bg-white rounded-xl p-6 shadow-xl"
              >
                {/* Document Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center">
                      <FileSignature className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="h-3 bg-gray-300 rounded w-32 mb-2" />
                      <div className="h-2 bg-gray-200 rounded w-20" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  </div>
                </div>

                {/* Document Content Placeholder */}
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                  <div className="h-3 bg-gray-200 rounded w-4/6" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>

                {/* Signature Line */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                  className="mt-6 pt-6 border-t-2 border-dashed border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Signature</div>
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 2.5, duration: 1 }}
                      className="h-12 w-32 bg-gradient-to-r from-blue-500 to-violet-500 rounded opacity-20"
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Analytics Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5, duration: 0.5 }}
                className="mt-6 grid grid-cols-3 gap-4"
              >
                {[
                  { label: 'Views', value: '24' },
                  { label: 'Avg. Time', value: '3m 42s' },
                  { label: 'Signed', value: '18/24' },
                ].map((stat, index) => (
                  <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-blue-200">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </GlassCard>
        </AnimatedSection>

        {/* CTA Button */}
        <AnimatedSection variant="fadeIn" className="text-center mt-12">
          <Link href="/signup">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 shadow-xl animate-glow">
                <Play className="mr-2 h-5 w-5" />
                Try the Live Demo
              </Button>
            </motion.div>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}

