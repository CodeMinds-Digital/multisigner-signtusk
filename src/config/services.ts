import { LucideIcon } from 'lucide-react'
import {
  FileSignature,
  Send,
  BarChart3,
  BarChart2,
  Inbox,
  Workflow,
  PenTool,
  QrCode,
  CreditCard,
  Receipt,
  DollarSign,
  FileText,
  Shield,
  Bell,
  Building2,
  Users,
  Share2,
  TrendingUp,
  Activity,
  PieChart
} from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  icon: LucideIcon
  route: string
  badge?: number
  adminOnly?: boolean
}

export interface Service {
  id: string
  name: string
  displayName: string
  icon: LucideIcon
  description: string
  route: string
  enabled: boolean
  color: string
  sidebarItems: SidebarItem[]
}

export const SERVICES: Service[] = [
  {
    id: 'sign',
    name: 'Sign',
    displayName: 'Sign',
    icon: FileSignature,
    description: 'Document signing & workflows',
    route: '/sign',
    enabled: true,
    color: '#3B82F6', // Blue
    sidebarItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: BarChart2,
        route: '/sign'
      },
      {
        id: 'sign-inbox',
        label: 'Sign Inbox',
        icon: Inbox,
        route: '/sign/inbox'
      },
      {
        id: 'drive',
        label: 'Drive',
        icon: Workflow,
        route: '/sign/drive'
      },
      {
        id: 'signatures',
        label: 'Signatures',
        icon: PenTool,
        route: '/sign/signatures'
      },
      {
        id: 'verify',
        label: 'Verify',
        icon: QrCode,
        route: '/sign/verify'
      },
      {
        id: 'pricing',
        label: 'Pricing',
        icon: DollarSign,
        route: '/sign/pricing'
      },
      {
        id: 'billing',
        label: 'Billing',
        icon: Receipt,
        route: '/sign/billing'
      },
      // Settings section
      {
        id: 'users',
        label: 'User Management',
        icon: Users,
        route: '/sign/settings/users',
        adminOnly: true
      },
      {
        id: 'corporate',
        label: 'Enterprise Settings',
        icon: Building2,
        route: '/sign/settings/corporate',
        adminOnly: true
      },
      {
        id: 'documents',
        label: 'Document Settings',
        icon: FileText,
        route: '/sign/settings/documents'
      },
      {
        id: 'security',
        label: 'Security Settings',
        icon: Shield,
        route: '/sign/settings/security'
      },
      {
        id: 'notifications',
        label: 'Email Preferences',
        icon: Bell,
        route: '/sign/settings/notifications'
      }
    ]
  },
  {
    id: 'send',
    name: 'Send',
    displayName: 'Send',
    icon: Send,
    description: 'Secure document sharing',
    route: '/send',
    enabled: true,
    color: '#10B981', // Green
    sidebarItems: [
      {
        id: 'send-dashboard',
        label: 'Dashboard',
        icon: BarChart2,
        route: '/send'
      },
      {
        id: 'shared',
        label: 'Shared Documents',
        icon: Share2,
        route: '/send/shared'
      },
      {
        id: 'links',
        label: 'Share Links',
        icon: Share2,
        route: '/send/links'
      },
      {
        id: 'send-analytics',
        label: 'Analytics',
        icon: TrendingUp,
        route: '/send/analytics'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics',
    displayName: 'Analytics',
    icon: BarChart3,
    description: 'Insights & reporting',
    route: '/analytics',
    enabled: true,
    color: '#F59E0B', // Orange
    sidebarItems: [
      {
        id: 'analytics-overview',
        label: 'Overview',
        icon: Activity,
        route: '/analytics'
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        route: '/analytics/reports'
      },
      {
        id: 'insights',
        label: 'Insights',
        icon: PieChart,
        route: '/analytics/insights'
      },
      {
        id: 'metrics',
        label: 'Metrics',
        icon: TrendingUp,
        route: '/analytics/metrics'
      }
    ]
  },
  {
    id: 'track',
    name: 'Track',
    displayName: 'Track',
    icon: Activity,
    description: 'Document tracking & monitoring',
    route: '/track',
    enabled: true,
    color: '#8B5CF6', // Purple
    sidebarItems: [
      {
        id: 'track-dashboard',
        label: 'Dashboard',
        icon: BarChart2,
        route: '/track'
      },
      {
        id: 'active-documents',
        label: 'Active Documents',
        icon: FileText,
        route: '/track/active'
      },
      {
        id: 'history',
        label: 'History',
        icon: Activity,
        route: '/track/history'
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        route: '/track/notifications'
      }
    ]
  }
]

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find(s => s.id === id)
}

export function getEnabledServices(): Service[] {
  return SERVICES.filter(s => s.enabled)
}

export function getAllServices(): Service[] {
  return SERVICES
}

export function getServiceByRoute(route: string): Service | undefined {
  // Handle legacy routes
  if (route.startsWith('/dashboard') || route.startsWith('/sign-inbox') ||
    route.startsWith('/drive') || route.startsWith('/signatures') ||
    route.startsWith('/verify') || route.startsWith('/pricing') ||
    route.startsWith('/billing') || route.startsWith('/settings')) {
    return SERVICES.find(s => s.id === 'sign')
  }

  // Match by service route prefix
  return SERVICES.find(s => route.startsWith(s.route))
}

