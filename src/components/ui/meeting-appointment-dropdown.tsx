'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, FileSignature, ChevronDown, Clock, Users } from 'lucide-react'

interface AppointmentType {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  route: string
  features: string[]
  pricing: string
  recommended?: boolean
}

const appointmentTypes: AppointmentType[] = [
  {
    id: 'quick-meeting',
    name: 'Quick Meeting',
    description: 'Simple scheduling for casual meetings and consultations',
    icon: CalendarDays,
    route: '/schedule/quick-meeting',
    features: [
      'Calendar booking',
      'Email confirmations',
      'Basic analytics',
      'Video/phone/in-person'
    ],
    pricing: 'Free - $25/month'
  },
  {
    id: 'business-meeting',
    name: 'Business Meeting',
    description: 'Advanced scheduling with document workflows and signatures',
    icon: FileSignature,
    route: '/schedule/business-meeting',
    features: [
      'All Quick Meeting features',
      'Document automation',
      'Signature workflows',
      'Advanced security',
      'Enterprise analytics'
    ],
    pricing: '$50 - $150/month',
    recommended: true
  }
]

interface MeetingAppointmentDropdownProps {
  currentType?: string
  className?: string
}

export function MeetingAppointmentDropdown({
  currentType,
  className = ''
}: MeetingAppointmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAppointmentSelect = (appointmentType: AppointmentType) => {
    setIsOpen(false)
    router.push(appointmentType.route)
  }

  const currentAppointment = appointmentTypes.find(type => type.id === currentType)

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <CalendarDays className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-900">
          {currentAppointment ? currentAppointment.name : 'Schedule Meeting'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Choose Appointment Type</h3>
            <p className="text-xs text-gray-600 mt-1">Select the type of meeting you want to schedule</p>
          </div>

          {/* Appointment Types */}
          <div className="py-2">
            {appointmentTypes.map((type) => {
              const Icon = type.icon
              const isSelected = currentType === type.id

              return (
                <button
                  key={type.id}
                  onClick={() => handleAppointmentSelect(type)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors relative ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${type.id === 'quick-meeting'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-purple-100 text-purple-600'
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{type.name}</h4>
                        {type.recommended && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {type.description}
                      </p>

                      {/* Features */}
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {type.features.slice(0, 3).map((feature, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                          {type.features.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{type.features.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-900">{type.pricing}</span>
                        {isSelected && (
                          <span className="text-xs text-blue-600 font-medium">Current</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Setup takes 2-5 minutes</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>No guest account required</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
