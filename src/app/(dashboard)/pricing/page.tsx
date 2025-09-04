'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for getting started',
        features: [
            '3 documents per month',
            'Basic e-signature',
            'Email support',
            'Standard templates'
        ],
        limitations: [
            'No advanced features',
            'Limited storage',
            'No priority support'
        ],
        buttonText: 'Current Plan',
        buttonVariant: 'outline' as const,
        popular: false
    },
    {
        name: 'Professional',
        price: '$15',
        period: 'per month',
        description: 'For professionals and small teams',
        features: [
            'Unlimited documents',
            'Advanced e-signature',
            'Priority email support',
            'Custom templates',
            'Document analytics',
            'Team collaboration',
            'API access'
        ],
        limitations: [],
        buttonText: 'Upgrade Now',
        buttonVariant: 'default' as const,
        popular: true
    },
    {
        name: 'Enterprise',
        price: '$49',
        period: 'per month',
        description: 'For large organizations',
        features: [
            'Everything in Professional',
            'Advanced security',
            'SSO integration',
            'Dedicated support',
            'Custom integrations',
            'Compliance tools',
            'Advanced analytics',
            'White-label options'
        ],
        limitations: [],
        buttonText: 'Contact Sales',
        buttonVariant: 'outline' as const,
        popular: false
    }
]

export default function PricingPage() {
    const { user } = useAuth()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    const handleUpgrade = (planName: string) => {
        // TODO: Implement Stripe integration
        console.log(`Upgrading to ${planName}`)
        alert(`Upgrade to ${planName} - Integration with payment provider coming soon!`)
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
                <p className="text-lg text-gray-600 mb-8">
                    Select the perfect plan for your document signing needs
                </p>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center space-x-4 mb-8">
                    <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        Monthly
                    </span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                    <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        Yearly
                        <span className="ml-1 text-xs text-green-600 font-medium">(Save 20%)</span>
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <Card key={plan.name} className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <span className="bg-blue-500 text-white px-3 py-1 text-sm font-medium rounded-full">
                                    Most Popular
                                </span>
                            </div>
                        )}

                        <CardHeader className="text-center">
                            <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                            <div className="mt-4">
                                <span className="text-4xl font-bold text-gray-900">
                                    {plan.name === 'Free' ? plan.price :
                                        billingCycle === 'yearly' ?
                                            `$${Math.floor(parseInt(plan.price.replace('$', '')) * 0.8)}` :
                                            plan.price}
                                </span>
                                <span className="text-gray-500 ml-1">
                                    {plan.name === 'Free' ? plan.period :
                                        billingCycle === 'yearly' ? 'per month (billed yearly)' : plan.period}
                                </span>
                            </div>
                            <CardDescription className="mt-2">{plan.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-center space-x-3">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{feature}</span>
                                    </div>
                                ))}
                                {plan.limitations.map((limitation) => (
                                    <div key={limitation} className="flex items-center space-x-3">
                                        <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-500">{limitation}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                className="w-full"
                                variant={plan.buttonVariant}
                                onClick={() => handleUpgrade(plan.name)}
                                disabled={plan.name === 'Free'}
                            >
                                {plan.buttonText}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* FAQ Section */}
            <div className="mt-16">
                <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
                    Frequently Asked Questions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Can I change my plan anytime?
                        </h3>
                        <p className="text-gray-600">
                            Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Is there a free trial?
                        </h3>
                        <p className="text-gray-600">
                            Our Free plan allows you to try our basic features. You can upgrade to access advanced features anytime.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            What payment methods do you accept?
                        </h3>
                        <p className="text-gray-600">
                            We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Do you offer refunds?
                        </h3>
                        <p className="text-gray-600">
                            Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}