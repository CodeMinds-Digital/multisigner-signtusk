'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, FileCheck, Globe, Check } from 'lucide-react';
import { AnimatedSection, AnimatedItem } from '@/components/ui/animated-section';
import { GlassCard } from '@/components/ui/glass-card';

const securityFeatures = [
  'Encryption in transit & at rest',
  'Secure audit trails',
  'Legal eSignature compliance',
  'Regional data storage',
];

const complianceBadges = [
  { name: 'SOC 2', color: 'from-blue-500 to-blue-600' },
  { name: 'ISO 27001', color: 'from-violet-500 to-violet-600' },
  { name: 'GDPR', color: 'from-purple-500 to-purple-600' },
  { name: 'eIDAS', color: 'from-pink-500 to-pink-600' },
];

// Predefined particle positions to avoid hydration mismatch
const particlePositions = [
  { top: '15%', left: '20%' },
  { top: '35%', left: '75%' },
  { top: '55%', left: '10%' },
  { top: '75%', left: '85%' },
  { top: '25%', left: '50%' },
  { top: '65%', left: '40%' },
  { top: '45%', left: '90%' },
  { top: '85%', left: '30%' },
];

export function SecuritySection() {
  return (
    <section id="security" className="py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-violet-900 relative overflow-hidden">
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
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
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
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Content Column */}
          <AnimatedSection variant="slideUp" className="text-white">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Enterprise-Grade Security,{' '}
              <span className="text-gradient bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Global Compliance
              </span>
            </h2>

            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Every document is encrypted, tracked, and stored in compliance with industry standards including SOC 2, ISO 27001, GDPR, and eIDAS.
            </p>

            {/* Security Features Checklist */}
            <div className="space-y-4 mb-8">
              {securityFeatures.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg text-blue-100">
                    {feature}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Compliance Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {complianceBadges.map((badge, index) => (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                    <div className={`text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r ${badge.color}`}>
                      {badge.name}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>

          {/* Visual Column */}
          <AnimatedSection variant="scaleIn" className="relative">
            <motion.div
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative"
            >
              {/* Main Shield */}
              <div className="relative w-full max-w-md mx-auto">
                {/* Glow Effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full blur-3xl"
                />

                {/* Shield Container */}
                <GlassCard
                  glassVariant="medium"
                  hoverEffect={false}
                  lightMode={false}
                  className="p-12 rounded-3xl"
                >
                  {/* Animated Shield Icon */}
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="relative"
                  >
                    <div className="w-48 h-48 mx-auto bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl">
                      <Shield className="h-24 w-24 text-white" />
                    </div>

                    {/* Orbiting Icons */}
                    <motion.div
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="absolute inset-0"
                    >
                      {[Lock, FileCheck, Globe].map((Icon, index) => (
                        <motion.div
                          key={index}
                          className="absolute"
                          style={{
                            top: '50%',
                            left: '50%',
                            transform: `rotate(${index * 120}deg) translateY(-120px)`,
                          }}
                        >
                          <motion.div
                            animate={{
                              rotate: -360,
                            }}
                            transition={{
                              duration: 20,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Icon className="h-6 w-6 text-blue-600" />
                          </motion.div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* Particle Effects */}
                  {particlePositions.map((position, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -30, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.3,
                      }}
                      className="absolute w-2 h-2 bg-blue-400 rounded-full"
                      style={{
                        top: position.top,
                        left: position.left,
                      }}
                    />
                  ))}
                </GlassCard>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

