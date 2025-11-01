import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import { SendSignHeroSection } from '@/components/sections/send-sign/hero-section'
import { HowItWorksSection } from '@/components/sections/send-sign/how-it-works-section'
import { FeaturesGridSection } from '@/components/sections/send-sign/features-grid-section'
import { ProductDemoSection } from '@/components/sections/send-sign/product-demo-section'
import { ComparisonSection } from '@/components/sections/send-sign/comparison-section'
import { IntegrationsSection } from '@/components/sections/send-sign/integrations-section'
import { TestimonialsSection } from '@/components/sections/send-sign/testimonials-section'
import { SendSignPricingSection } from '@/components/sections/send-sign/pricing-section'
import { SecuritySection } from '@/components/sections/send-sign/security-section'
import { FinalCTASection } from '@/components/sections/send-sign/final-cta-section'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <SendSignHeroSection />
        <HowItWorksSection />
        <FeaturesGridSection />
        <ProductDemoSection />
        <ComparisonSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <SendSignPricingSection />
        <SecuritySection />
        <FinalCTASection />
      </main>
      <PublicFooter />
    </div>
  )
}
