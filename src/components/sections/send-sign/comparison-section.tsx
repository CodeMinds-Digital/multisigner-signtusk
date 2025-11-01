'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

const features = [
  'Secure File Sharing',
  'Real-Time Analytics',
  'Legally Binding E-Signatures',
  'Document Expiry Controls',
  'Unified Dashboard',
  'API & Integrations',
];

const comparison = {
  'DocuSign': [false, false, true, false, false, true],
  'DocSend': [true, true, false, false, false, false],
  'Send & Sign': [true, true, true, true, true, true],
};

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-20 bg-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <AnimatedSection variant="fadeIn" className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Why Teams Choose{' '}
            <span className="text-gradient">Send & Sign</span>{' '}
            Over Others
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            One platform that replaces two subscriptions — without compromise.
          </p>
        </AnimatedSection>

        {/* Comparison Table - Desktop */}
        <AnimatedSection variant="slideUp" className="hidden md:block max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
              <div className="p-6 font-semibold text-gray-900">Features</div>
              <div className="p-6 text-center font-semibold text-gray-700">DocuSign</div>
              <div className="p-6 text-center font-semibold text-gray-700">DocSend</div>
              <div className="p-6 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 opacity-10" />
                <div className="relative font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                  Send & Sign
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                  Best Value
                </div>
              </div>
            </div>

            {/* Table Body */}
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="grid grid-cols-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="p-6 font-medium text-gray-900">{feature}</div>

                {/* DocuSign */}
                <div className="p-6 flex justify-center items-center">
                  {comparison['DocuSign'][index] ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <Check className="h-6 w-6 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <X className="h-6 w-6 text-gray-300" />
                    </motion.div>
                  )}
                </div>

                {/* DocSend */}
                <div className="p-6 flex justify-center items-center">
                  {comparison['DocSend'][index] ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <Check className="h-6 w-6 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <X className="h-6 w-6 text-gray-300" />
                    </motion.div>
                  )}
                </div>

                {/* Send & Sign */}
                <div className="p-6 flex justify-center items-center bg-gradient-to-r from-blue-50 to-violet-50">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                    whileHover={{ scale: 1.2 }}
                  >
                    <Check className="h-6 w-6 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* Comparison Cards - Mobile */}
        <div className="md:hidden space-y-6">
          {Object.entries(comparison).map(([product, productFeatures], productIndex) => (
            <AnimatedSection key={product} variant="slideUp">
              <div className={`rounded-2xl shadow-lg overflow-hidden border ${product === 'Send & Sign'
                ? 'border-violet-500 bg-gradient-to-br from-blue-50 to-violet-50'
                : 'border-gray-200 bg-white'
                }`}>
                {/* Card Header */}
                <div className={`p-6 ${product === 'Send & Sign'
                  ? 'bg-gradient-to-r from-blue-500 to-violet-500'
                  : 'bg-gray-50'
                  }`}>
                  <h3 className={`text-2xl font-bold text-center ${product === 'Send & Sign' ? 'text-white' : 'text-gray-900'
                    }`}>
                    {product}
                  </h3>
                  {product === 'Send & Sign' && (
                    <p className="text-center text-blue-100 text-sm mt-1">Best Value</p>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {features.map((feature, featureIndex) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-gray-700">{feature}</span>
                      {productFeatures[featureIndex] ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Bottom CTA */}
        <AnimatedSection variant="fadeIn" className="text-center mt-12">
          <p className="text-gray-600 text-lg">
            Save time and money with one unified platform
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

