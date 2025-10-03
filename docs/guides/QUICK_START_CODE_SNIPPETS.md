# Quick Start Code Snippets

## 🚀 Copy-Paste Ready Code for Multi-Service Platform

Use these snippets to quickly implement the multi-service navigation system.

---

## 📁 File 1: Service Registry

**Path:** `src/config/services.ts`

```typescript
import { LucideIcon } from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  icon: string // Lucide icon name
  route: string
  badge?: number
  disabled?: boolean
}

export interface Service {
  id: string
  name: string
  displayName: string
  icon: string // Emoji or icon
  description: string
  route: string
  enabled: boolean
  color: string
  sidebarItems: SidebarItem[]
}

export const SERVICES: Service[] = [
  {
    id: 'sign',
    name: 'SignTusk',
    displayName: 'Sign',
    icon: '📝',
    description: 'Document signing & workflows',
    route: '/sign',
    enabled: true,
    color: '#3B82F6',
    sidebarItems: [
      { id: 'inbox', label: 'Inbox', icon: 'Inbox', route: '/sign/inbox' },
      { id: 'sent', label: 'Sent', icon: 'Send', route: '/sign/sent' },
      { id: 'drive', label: 'Drive', icon: 'FolderOpen', route: '/sign/drive' },
      { id: 'templates', label: 'Templates', icon: 'FileText', route: '/sign/templates' },
    ]
  },
  {
    id: 'send',
    name: 'ShareTusk',
    displayName: 'Send',
    icon: '📤',
    description: 'Secure document sharing & analytics',
    route: '/send',
    enabled: false, // Enable when ready
    color: '#10B981',
    sidebarItems: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/send/dashboard' },
      { id: 'documents', label: 'Documents', icon: 'FileText', route: '/send/documents' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/send/analytics' },
    ]
  },
  {
    id: 'calendar',
    name: 'MeetTusk',
    displayName: 'Calendar',
    icon: '📅',
    description: 'Meeting scheduling & bookings',
    route: '/calendar',
    enabled: false,
    color: '#8B5CF6',
    sidebarItems: [
      { id: 'calendar', label: 'Calendar', icon: 'Calendar', route: '/calendar/view' },
      { id: 'bookings', label: 'Bookings', icon: 'Clock', route: '/calendar/bookings' },
      { id: 'availability', label: 'Availability', icon: 'CalendarCheck', route: '/calendar/availability' },
    ]
  },
]

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find(s => s.id === id)
}

export function getEnabledServices(): Service[] {
  return SERVICES.filter(s => s.enabled)
}

export function getServiceByRoute(route: string): Service | undefined {
  return SERVICES.find(s => route.startsWith(s.route))
}
```

---

## 📁 File 2: Service Context

**Path:** `src/contexts/service-context.tsx`

```typescript
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Service, SERVICES, getServiceByRoute, getEnabledServices } from '@/config/services'

interface ServiceContextType {
  currentService: Service | null
  setCurrentService: (service: Service) => void
  services: Service[]
  enabledServices: Service[]
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined)

export function ServiceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [currentService, setCurrentService] = useState<Service | null>(null)

  // Auto-detect current service from pathname
  useEffect(() => {
    const service = getServiceByRoute(pathname)
    if (service) {
      setCurrentService(service)
    }
  }, [pathname])

  const enabledServices = getEnabledServices()

  return (
    <ServiceContext.Provider value={{
      currentService,
      setCurrentService,
      services: SERVICES,
      enabledServices
    }}>
      {children}
    </ServiceContext.Provider>
  )
}

export function useService() {
  const context = useContext(ServiceContext)
  if (!context) {
    throw new Error('useService must be used within ServiceProvider')
  }
  return context
}
```

---

## 📁 File 3: Top Navigation

**Path:** `src/components/platform/top-navigation.tsx`

```typescript
'use client'

import { useService } from '@/contexts/service-context'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, Settings, HelpCircle, Menu } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export function TopNavigation() {
  const { currentService, enabledServices, setCurrentService } = useService()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleServiceClick = (service: typeof enabledServices[0]) => {
    setCurrentService(service)
    router.push(service.route)
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TuskHub
          </span>
        </div>

        {/* Desktop Service Tabs */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {enabledServices.map((service) => {
            const isActive = pathname.startsWith(service.route)
            return (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-all duration-200 font-medium
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className="text-lg">{service.icon}</span>
                <span className="text-sm">{service.displayName}</span>
              </button>
            )
          })}
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden flex-1">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex flex-col gap-2 mt-8">
                <h3 className="text-sm font-semibold text-gray-500 px-2 mb-2">Services</h3>
                {enabledServices.map((service) => {
                  const isActive = pathname.startsWith(service.route)
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceClick(service)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg
                        transition-colors duration-200
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <span className="text-xl">{service.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium">{service.name}</div>
                        <div className="text-xs text-gray-500">{service.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Help">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Settings" onClick={() => router.push('/settings')}>
            <Settings className="w-5 h-5" />
          </Button>
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarImage src="/avatar.png" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
```

---

## 📁 File 4: Service Sidebar

**Path:** `src/components/platform/service-sidebar.tsx`

```typescript
'use client'

import { useService } from '@/contexts/service-context'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ServiceSidebar() {
  const { currentService } = useService()
  const pathname = usePathname()
  const router = useRouter()

  if (!currentService) return null

  return (
    <aside className="hidden md:block w-64 border-r bg-gray-50 h-full overflow-y-auto">
      {/* Service Header */}
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${currentService.color}20` }}
          >
            {currentService.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {currentService.name}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {currentService.description}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-3 space-y-1">
        {currentService.sidebarItems.map((item) => {
          const IconComponent = Icons[item.icon as keyof typeof Icons] as Icons.LucideIcon
          const isActive = pathname === item.route

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.route)}
              disabled={item.disabled}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-all duration-200 text-sm font-medium',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isActive
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                  : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm'
              )}
            >
              {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0" />}
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
```

---

## 📁 File 5: Platform Layout

**Path:** `src/app/(platform)/layout.tsx`

```typescript
import { ServiceProvider } from '@/contexts/service-context'
import { TopNavigation } from '@/components/platform/top-navigation'
import { ServiceSidebar } from '@/components/platform/service-sidebar'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ServiceProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <TopNavigation />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <ServiceSidebar />

          {/* Content */}
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ServiceProvider>
  )
}
```

---

## 📁 File 6: Example Service Page

**Path:** `src/app/(platform)/sign/inbox/page.tsx`

```typescript
'use client'

import { useService } from '@/contexts/service-context'

export default function SignInboxPage() {
  const { currentService } = useService()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
        <p className="text-gray-600 mt-1">
          View and manage your signature requests
        </p>
      </div>

      {/* Your existing inbox content here */}
      <div className="bg-white rounded-lg shadow p-6">
        <p>Current Service: {currentService?.name}</p>
        {/* ... rest of your inbox component ... */}
      </div>
    </div>
  )
}
```

---

## 🔄 Migration Helper Script

**Path:** `scripts/migrate-routes.sh`

```bash
#!/bin/bash

# Backup current structure
echo "Creating backup..."
cp -r src/app src/app.backup

# Create new structure
echo "Creating new directory structure..."
mkdir -p src/app/\(platform\)/sign/{inbox,sent,drive,templates}
mkdir -p src/app/\(platform\)/settings

# Copy files (adjust paths as needed)
echo "Copying files..."
cp src/app/\(dashboard\)/sign-inbox/page.tsx src/app/\(platform\)/sign/inbox/
cp src/app/\(dashboard\)/drive/page.tsx src/app/\(platform\)/sign/drive/

echo "Migration structure created!"
echo "Next steps:"
echo "1. Update imports in migrated files"
echo "2. Test each page"
echo "3. Update route references"
echo "4. Remove old files when confirmed working"
```

---

## 🎨 Tailwind Config Addition

Add to `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    animation: {
      'fade-in': 'fadeIn 0.2s ease-in-out',
      'slide-in': 'slideIn 0.3s ease-out',
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      slideIn: {
        '0%': { transform: 'translateX(-10px)', opacity: '0' },
        '100%': { transform: 'translateX(0)', opacity: '1' },
      },
    },
  },
}
```

---

## 🧪 Testing Utilities

**Path:** `src/lib/test-utils/service-test-wrapper.tsx`

```typescript
import { ServiceProvider } from '@/contexts/service-context'

export function ServiceTestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ServiceProvider>
      {children}
    </ServiceProvider>
  )
}
```

---

## 📝 Usage Examples

### **Get Current Service:**
```typescript
const { currentService } = useService()
console.log(currentService?.name) // "SignTusk"
```

### **Switch Service:**
```typescript
const { setCurrentService, services } = useService()
const sendService = services.find(s => s.id === 'send')
if (sendService) setCurrentService(sendService)
```

### **Check if Service is Active:**
```typescript
const pathname = usePathname()
const isSignActive = pathname.startsWith('/sign')
```

---

**All code is ready to copy and paste! Start with File 1 and work your way down. 🚀**

