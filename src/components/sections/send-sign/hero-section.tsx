'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle, Upload, Share2, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/ui/animated-section';
import { fadeInUp, buttonHover, floatAnimation } from '@/lib/animation-variants';
import { GlassCard } from '@/components/ui/glass-card';
import Link from 'next/link';

export function SendSignHeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/10 to-purple-600/10 animate-gradient" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20 sm:py-32">
          {/* Content Column */}
          <AnimatedSection variant="slideUp" className="text-center lg:text-left">
            <motion.div
              initial="initial"
              animate="animate"
              variants={fadeInUp}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
                Send. Track. Sign.{' '}
                <span className="text-gradient">
                  All in One Secure Flow.
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial="initial"
              animate="animate"
              variants={fadeInUp}
              transition={{ delay: 0.4 }}
              className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              Share, monitor, and sign documents with enterprise-grade security and real-time visibility — all from one unified workspace.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={fadeInUp}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
            >
              <Link href="/signup">
                <motion.div variants={buttonHover} whileHover="hover" whileTap="tap">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </Link>

              <Link href="/login">
                <motion.div variants={buttonHover} whileHover="hover" whileTap="tap">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                    <Play className="mr-2 h-5 w-5" />
                    Watch Demo
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Trust Badge */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={fadeInUp}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center lg:justify-start gap-2 text-gray-600"
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm sm:text-base">
                Trusted by 10,000+ teams across Legal, Sales, and Operations.
              </span>
            </motion.div>
          </AnimatedSection>

          {/* Visual Column */}
          <AnimatedSection variant="scaleIn" className="relative">
            <motion.div
              variants={floatAnimation}
              initial="initial"
              animate="animate"
              className="relative"
            >
              {/* Main Glass Card */}
              <GlassCard glassVariant="medium" hoverEffect={false} lightMode={true} className="p-8 rounded-3xl">
                {/* Document Flow Visualization */}
                <div className="space-y-6">
                  {/* Upload Step */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="flex items-center gap-4 p-4 bg-white/50 rounded-xl backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full w-3/4 mb-2" />
                      <div className="h-2 bg-gray-300 rounded-full w-1/2" />
                    </div>
                  </motion.div>

                  {/* Track Step */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="flex items-center gap-4 p-4 bg-white/50 rounded-xl backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 flex items-center justify-center">
                      <Share2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gradient-to-r from-violet-500 to-violet-400 rounded-full w-2/3 mb-2" />
                      <div className="h-2 bg-gray-300 rounded-full w-1/3" />
                    </div>
                  </motion.div>

                  {/* Sign Step */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                    className="flex items-center gap-4 p-4 bg-white/50 rounded-xl backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                      <FileSignature className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full w-4/5 mb-2" />
                      <div className="h-2 bg-gray-300 rounded-full w-2/5" />
                    </div>
                  </motion.div>
                </div>

                {/* Floating Checkmarks */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6, duration: 0.5 }}
                  className="absolute -top-4 -right-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl"
                >
                  <CheckCircle className="h-8 w-8 text-white" />
                </motion.div>
              </GlassCard>

              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -top-8 -left-8 w-20 h-20 bg-gradient-to-br from-blue-400 to-violet-400 rounded-2xl opacity-20 blur-xl"
              />

              <motion.div
                animate={{
                  y: [0, 10, 0],
                  rotate: [0, -5, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
                className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-violet-400 to-purple-400 rounded-2xl opacity-20 blur-xl"
              />
            </motion.div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

