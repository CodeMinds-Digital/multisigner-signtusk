'use client'

import { CheckCircle, Eye, FileSignature, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SigningProgressStepperProps {
  progress: {
    viewed: number
    signed: number
    total: number
  }
  status: string
  className?: string
}

interface StepConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

export function SigningProgressStepper({ progress, status, className }: SigningProgressStepperProps) {
  const steps: StepConfig[] = [
    {
      id: 'initiated',
      label: 'Initiated',
      icon: Clock,
      description: 'Request created and sent'
    },
    {
      id: 'viewed',
      label: 'Viewed',
      icon: Eye,
      description: `${progress.viewed}/${progress.total} signers Viewed`
    },
    {
      id: 'signed',
      label: 'Signed',
      icon: FileSignature,
      description: `${progress.signed}/${progress.total} signers Signed`
    }
  ]

  const getStepStatus = (stepId: string) => {
    switch (stepId) {
      case 'initiated':
        return 'completed' // Always completed when request exists
      case 'viewed':
        if (progress.viewed === progress.total) return 'completed'
        if (progress.viewed > 0) return 'in-progress'
        return 'pending'
      case 'signed':
        if (progress.signed === progress.total) return 'completed'
        if (progress.signed > 0) return 'in-progress'
        if (progress.viewed > 0) return 'pending'
        return 'not-started'
      default:
        return 'pending'
    }
  }

  const getStepColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'in-progress':
        return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'not-started':
        return 'text-gray-400 bg-gray-100 border-gray-200'
      default:
        return 'text-gray-400 bg-gray-100 border-gray-200'
    }
  }

  const getConnectorColor = (currentStepStatus: string, nextStepStatus: string) => {
    if (currentStepStatus === 'completed') {
      return 'bg-green-300'
    }
    if (currentStepStatus === 'in-progress') {
      return 'bg-blue-300'
    }
    return 'bg-gray-300'
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Overall Progress Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Signing Progress</h3>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-1" />
            {progress.total} signer{progress.total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${progress.total > 0 ? (progress.signed / progress.total) * 100 : 0}%`
            }}
          />
        </div>

        {/* Progress counts with proper capitalization */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>{progress.viewed} Viewed</span>
          <span>{progress.signed} Signed</span>
        </div>
      </div>

      {/* Step-by-step Progress */}
      <div className="relative">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.id)
          const stepColor = getStepColor(stepStatus)
          const isLast = index === steps.length - 1
          const nextStepStatus = !isLast ? getStepStatus(steps[index + 1].id) : null
          const connectorColor = !isLast ? getConnectorColor(stepStatus, nextStepStatus || '') : ''

          return (
            <div key={step.id} className="relative">
              {/* Step */}
              <div className="flex items-center">
                {/* Icon */}
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                  stepColor
                )}>
                  {stepStatus === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      'text-sm font-medium',
                      stepStatus === 'completed' ? 'text-green-900' :
                        stepStatus === 'in-progress' ? 'text-blue-900' :
                          stepStatus === 'pending' ? 'text-yellow-900' :
                            'text-gray-500'
                    )}>
                      {step.label}
                    </h4>

                    {/* Status Badge */}
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      stepStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        stepStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          stepStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                    )}>
                      {stepStatus === 'completed' ? 'Complete' :
                        stepStatus === 'in-progress' ? 'In Progress' :
                          stepStatus === 'pending' ? 'Pending' :
                            'Not Started'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="ml-5 mt-2 mb-4">
                  <div className={cn(
                    'w-0.5 h-8 transition-all duration-200',
                    connectorColor
                  )} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Status */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            Current Status: {status}
          </span>
          <span className="text-sm text-blue-700">
            {progress.signed === progress.total ?
              'All signatures completed!' :
              `${progress.total - progress.signed} signature${progress.total - progress.signed !== 1 ? 's' : ''} remaining`
            }
          </span>
        </div>
      </div>
    </div>
  )
}
