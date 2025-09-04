import { HeroSection } from '@/components/sections/hero-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { CTASection } from '@/components/sections/cta-section'

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
    </>
  )
}
