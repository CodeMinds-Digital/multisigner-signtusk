'use client'

import { useCallback } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface WorkflowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'current' | 'completed'
  component: React.ComponentType<any>
}

interface DocumentWorkflowLayoutProps {
  steps: WorkflowStep[]
  currentStepIndex: number
  onStepChange: (stepIndex: number) => void
  onNext: () => void
  onPrevious: () => void
  onComplete: () => void
  canProceed: boolean
  isLastStep: boolean
  documentData?: any
  onDataChange?: (data: any) => void
}

export function DocumentWorkflowLayout({
  steps,
  currentStepIndex,
  onStepChange,
  onNext,
  onPrevious,
  onComplete,
  canProceed,
  isLastStep,
  documentData,
  onDataChange
}: DocumentWorkflowLayoutProps) {
  const currentStep = steps[currentStepIndex]
  const CurrentStepComponent = currentStep?.component

  const handleStepClick = useCallback((stepIndex: number) => {
    // Only allow navigation to completed steps or the next immediate step
    const targetStep = steps[stepIndex]
    if (targetStep.status === 'completed' || stepIndex <= currentStepIndex) {
      onStepChange(stepIndex)
    }
  }, [steps, currentStepIndex, onStepChange])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
            <p className="mt-2 text-gray-600">
              Follow the steps below to prepare and configure your document for signing.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                {steps.map((step, stepIndex) => (
                  <li key={step.id} className={`relative ${stepIndex !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                    {/* Step Connector Line */}
                    {stepIndex !== steps.length - 1 && (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                    )}

                    {/* Step Button */}
                    <button
                      onClick={() => handleStepClick(stepIndex)}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${step.status === 'completed'
                          ? 'border-blue-600 bg-blue-600 hover:bg-blue-700'
                          : step.status === 'current'
                            ? 'border-blue-600 bg-white'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        } ${step.status === 'completed' || stepIndex <= currentStepIndex
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed'
                        }`}
                      disabled={step.status === 'pending' && stepIndex > currentStepIndex}
                    >
                      {step.status === 'completed' ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <span
                          className={`text-sm font-medium ${step.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                            }`}
                        >
                          {stepIndex + 1}
                        </span>
                      )}
                    </button>

                    {/* Step Label */}
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-32 text-center">
                      <p
                        className={`text-sm font-medium ${step.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                          }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Step Content Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep.status === 'completed'
                      ? 'bg-blue-600'
                      : currentStep.status === 'current'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}
                >
                  {currentStep.status === 'completed' ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <span
                      className={`text-sm font-medium ${currentStep.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                        }`}
                    >
                      {currentStepIndex + 1}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">{currentStep.title}</h2>
                <p className="text-sm text-gray-500">{currentStep.description}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="px-6 py-6">
            {CurrentStepComponent && (
              <CurrentStepComponent
                data={documentData}
                onDataChange={onDataChange}
                onNext={onNext}
                onPrevious={onPrevious}
                canProceed={canProceed}
                isLastStep={isLastStep}
              />
            )}
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentStepIndex === 0}
              className="flex items-center"
            >
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
            </div>

            {isLastStep ? (
              <Button
                onClick={onComplete}
                disabled={!canProceed}
                className="flex items-center bg-green-600 hover:bg-green-700"
              >
                Complete & Save
                <Check className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={onNext}
                disabled={!canProceed}
                className="flex items-center"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
