'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';
import { useStaggerAnimation } from '@/hooks/use-scroll-animation';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import Link from 'next/link';

const integrations = [
  { name: 'Google Drive', color: 'from-blue-500 to-blue-600' },
  { name: 'Slack', color: 'from-purple-500 to-purple-600' },
  { name: 'Notion', color: 'from-gray-700 to-gray-900' },
  { name: 'Salesforce', color: 'from-cyan-500 to-cyan-600' },
  { name: 'Zapier', color: 'from-orange-500 to-orange-600' },
  { name: 'HubSpot', color: 'from-orange-600 to-red-600' },
  { name: 'Microsoft', color: 'from-blue-600 to-blue-700' },
  { name: 'Dropbox', color: 'from-blue-500 to-blue-600' },
  { name: 'Gmail', color: 'from-red-500 to-red-600' },
  { name: 'Outlook', color: 'from-blue-600 to-blue-700' },
  { name: 'Trello', color: 'from-blue-500 to-blue-600' },
  { name: 'Asana', color: 'from-pink-500 to-pink-600' },
];

function IntegrationCard({ integration, index }: { integration: typeof integrations[0]; index: number }) {
  const { ref, isVisible } = useStaggerAnimation(index, 50);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.1, y: -5 }}
      className="group relative"
    >
      <GlassCard
        glassVariant="subtle"
        hoverEffect={true}
        lightMode={true}
        className="rounded-2xl p-8 flex items-center justify-center h-32 overflow-hidden"
      >
        {/* Gradient Background on Hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${integration.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

        {/* Logo/Name */}
        <div className="relative text-center">
          <div className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${integration.color} group-hover:scale-110 transition-transform duration-300`}>
            {integration.name}
          </div>
        </div>

        {/* Hover Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${integration.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`} />
      </GlassCard>
    </motion.div>
  );
}

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
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
            opacity: [0.05, 0.1, 0.05],
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
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Works Seamlessly With{' '}
            <span className="text-gradient">Your Favorite Tools</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect Send & Sign with Google Workspace, Slack, HubSpot, Salesforce, and over 1,000+ apps to automate your document workflows.
          </p>
        </AnimatedSection>

        {/* Integrations Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          {integrations.map((integration, index) => (
            <IntegrationCard key={integration.name} integration={integration} index={index} />
          ))}
        </div>

        {/* Additional Integrations Indicator */}
        <AnimatedSection variant="fadeIn" className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-full px-6 py-3 mb-8"
          >
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                >
                  +
                </div>
              ))}
            </div>
            <span className="text-gray-700 font-semibold">
              1,000+ more integrations available
            </span>
          </motion.div>

          {/* CTA Button */}
          <Link href="/integrations">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View All Integrations
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </AnimatedSection>

        {/* API Section */}
        <AnimatedSection variant="slideUp" className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl p-8 text-center shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-4">
              Need a Custom Integration?
            </h3>
            <p className="text-blue-100 text-lg mb-6">
              Use our powerful REST API to build custom workflows and integrations tailored to your needs.
            </p>
            <Link href="/api-docs">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6">
                  Explore API Documentation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

