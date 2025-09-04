'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Send, Rocket, Building2 } from "lucide-react"

interface PricingPlan {
  name: string
  price: number
  icon: React.ReactNode
  features: string[]
  buttonText: string
  isPopular: boolean
}

export function PricingPlans() {
  const plans: PricingPlan[] = [
    {
      name: 'Basic',
      price: 29,
      icon: <Send className="w-8 h-8 text-blue-500 mb-4" />,
      features: [
        '100 Credits',
        'Basic Support',
        'Monthly Reports'
      ],
      buttonText: 'Choose Basic',
      isPopular: false
    },
    {
      name: 'Pro',
      price: 79,
      icon: <Rocket className="w-8 h-8 text-blue-500 mb-4" />,
      features: [
        '500 Credits',
        'Priority Support',
        'Advanced Analytics',
        'Custom Reports'
      ],
      buttonText: 'Choose Pro',
      isPopular: true
    },
    {
      name: 'Enterprise',
      price: 199,
      icon: <Building2 className="w-8 h-8 text-blue-500 mb-4" />,
      features: [
        '2000 Credits',
        '24/7 Support',
        'White Label Reports',
        'API Access',
        'Dedicated Account Manager'
      ],
      buttonText: 'Choose Enterprise',
      isPopular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your document signing needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${
                plan.isPopular 
                  ? 'border-2 border-blue-500 shadow-lg' 
                  : 'border border-gray-200 shadow'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center">
                {plan.icon}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex justify-center items-baseline">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="ml-1 text-gray-600">/month</span>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="mb-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    plan.isPopular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            All plans include SSL security, 99.9% uptime guarantee, and email support.
          </p>
          <p className="text-sm text-gray-500">
            Need a custom solution? <a href="#" className="text-blue-600 hover:underline">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  )
}
