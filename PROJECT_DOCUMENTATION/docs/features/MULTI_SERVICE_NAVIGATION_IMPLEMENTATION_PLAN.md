# Multi-Service Navigation Implementation Plan

## 🎯 Goal
Transform SignTusk into TuskHub - a multi-service platform with top navigation bar for service switching and dynamic sidebars.

---

## 📋 Implementation Phases

### **Phase 1: Foundation & Architecture (Week 1-2)**
Prepare the codebase for multi-service architecture without breaking existing functionality.

### **Phase 2: Navigation Components (Week 3)**
Build the top navigation bar and service switcher components.

### **Phase 3: Service Migration (Week 4-5)**
Migrate existing SignTusk to the new structure.

### **Phase 4: New Services (Week 6+)**
Add ShareTusk, MeetTusk, etc.

---

## 🏗️ PHASE 1: Foundation & Architecture

### **Step 1.1: Create Service Registry**
**File:** `src/config/services.ts`

```typescript
export interface Service {
  id: string
  name: string
  displayName: string
  icon: string
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
    color: '#3B82F6', // blue
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
    description: 'Secure document sharing',
    route: '/send',
    enabled: false, // Not yet implemented
    color: '#10B981', // green
    sidebarItems: []
  },
  // ... more services
]
```

**Effort:** 2 hours  
**Dependencies:** None

---

### **Step 1.2: Restructure Directory Layout**

**Current Structure:**
```
src/app/(dashboard)/
  ├── dashboard/
  ├── sign-inbox/
  ├── drive/
  ├── upload/
  └── settings/
```

**New Structure:**
```
src/app/(platform)/
  ├── layout.tsx                    # Platform layout with top nav
  ├── page.tsx                      # Service hub/dashboard
  │
  ├── sign/                         # SignTusk Service
  │   ├── layout.tsx                # Sign-specific layout with sidebar
  │   ├── inbox/
  │   ├── sent/
  │   ├── drive/
  │   └── templates/
  │
  ├── send/                         # ShareTusk Service (future)
  │   ├── layout.tsx
  │   └── dashboard/
  │
  ├── calendar/                     # MeetTusk Service (future)
  │   ├── layout.tsx
  │   └── dashboard/
  │
  └── settings/                     # Global settings
      └── page.tsx
```

**Migration Steps:**
1. Create `(platform)` directory
2. Move existing pages to `sign/` subdirectory
3. Update all route references
4. Test that existing functionality works

**Effort:** 4-6 hours  
**Dependencies:** Step 1.1

---

### **Step 1.3: Create Service Context**

**File:** `src/contexts/service-context.tsx`

```typescript
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Service, SERVICES } from '@/config/services'

interface ServiceContextType {
  currentService: Service | null
  setCurrentService: (service: Service) => void
  services: Service[]
  enabledServices: Service[]
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined)

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [currentService, setCurrentService] = useState<Service | null>(
    SERVICES.find(s => s.id === 'sign') || null
  )

  const enabledServices = SERVICES.filter(s => s.enabled)

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
  if (!context) throw new Error('useService must be used within ServiceProvider')
  return context
}
```

**Effort:** 2 hours  
**Dependencies:** Step 1.1

---

## 🎨 PHASE 2: Navigation Components

### **Step 2.1: Create Top Navigation Bar**

**File:** `src/components/platform/top-navigation.tsx`

```typescript
'use client'

import { useService } from '@/contexts/service-context'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bell, Settings, HelpCircle } from 'lucide-react'

export function TopNavigation() {
  const { currentService, enabledServices, setCurrentService } = useService()
  const router = useRouter()
  const pathname = usePathname()

  const handleServiceClick = (service: Service) => {
    setCurrentService(service)
    router.push(service.route)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">TuskHub</span>
        </div>

        {/* Service Tabs */}
        <nav className="flex items-center gap-1">
          {enabledServices.map((service) => {
            const isActive = pathname.startsWith(service.route)
            return (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-lg">{service.icon}</span>
                <span>{service.displayName}</span>
              </button>
            )
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <Avatar>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
```

**Effort:** 4 hours  
**Dependencies:** Step 1.3

---

### **Step 2.2: Create Dynamic Sidebar**

**File:** `src/components/platform/service-sidebar.tsx`

```typescript
'use client'

import { useService } from '@/contexts/service-context'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'

export function ServiceSidebar() {
  const { currentService } = useService()
  const pathname = usePathname()
  const router = useRouter()

  if (!currentService) return null

  return (
    <aside className="w-64 border-r bg-gray-50 h-full">
      {/* Service Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentService.icon}</span>
          <div>
            <h2 className="font-semibold text-gray-900">
              {currentService.name}
            </h2>
            <p className="text-xs text-gray-500">
              {currentService.description}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-2 space-y-1">
        {currentService.sidebarItems.map((item) => {
          const Icon = Icons[item.icon as keyof typeof Icons]
          const isActive = pathname === item.route

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.route)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                'transition-colors duration-200',
                isActive
                  ? 'bg-white text-blue-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-white hover:text-gray-900'
              )}
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Effort:** 3 hours  
**Dependencies:** Step 1.3

---

### **Step 2.3: Create Platform Layout**

**File:** `src/app/(platform)/layout.tsx`

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
      <div className="h-screen flex flex-col">
        {/* Top Navigation */}
        <TopNavigation />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <ServiceSidebar />

          {/* Content */}
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </ServiceProvider>
  )
}
```

**Effort:** 1 hour  
**Dependencies:** Steps 2.1, 2.2

---

## 🔄 PHASE 3: Service Migration

### **Step 3.1: Migrate Sign Inbox**

**Current:** `src/app/(dashboard)/sign-inbox/page.tsx`  
**New:** `src/app/(platform)/sign/inbox/page.tsx`

**Changes:**
1. Move file to new location
2. Update imports
3. Remove old sidebar (now handled by ServiceSidebar)
4. Keep all existing functionality

**Effort:** 2 hours  
**Dependencies:** Phase 2 complete

---

### **Step 3.2: Migrate Drive**

**Current:** `src/app/(dashboard)/drive/page.tsx`  
**New:** `src/app/(platform)/sign/drive/page.tsx`

**Effort:** 2 hours

---

### **Step 3.3: Migrate Upload & Templates**

Similar process for all existing pages.

**Effort:** 4 hours total

---

### **Step 3.4: Update All Route References**

Search and replace all route references:
- `/sign-inbox` → `/sign/inbox`
- `/drive` → `/sign/drive`
- etc.

**Files to update:**
- Navigation components
- API redirects
- Email links
- Breadcrumbs

**Effort:** 3 hours

---

## 🆕 PHASE 4: Add New Services (Future)

### **Step 4.1: ShareTusk (DocSend-like)**

**Structure:**
```
src/app/(platform)/send/
  ├── layout.tsx
  ├── dashboard/
  ├── documents/
  ├── analytics/
  └── settings/
```

**Effort:** 2-3 weeks

---

### **Step 4.2: MeetTusk (Calendly-like)**

**Structure:**
```
src/app/(platform)/calendar/
  ├── layout.tsx
  ├── dashboard/
  ├── bookings/
  ├── availability/
  └── settings/
```

**Effort:** 2-3 weeks

---

## 📱 Mobile Considerations

### **Responsive Top Nav**

```typescript
// Mobile: Hamburger menu
<div className="lg:hidden">
  <Button onClick={() => setMobileMenuOpen(true)}>
    <Menu />
  </Button>
</div>

// Desktop: Full nav
<div className="hidden lg:flex">
  {/* Service tabs */}
</div>
```

**Effort:** 4 hours

---

## 🧪 Testing Strategy

### **Phase 1 Testing:**
- [ ] Service registry loads correctly
- [ ] Directory structure is correct
- [ ] All existing routes still work

### **Phase 2 Testing:**
- [ ] Top nav renders correctly
- [ ] Service switching works
- [ ] Sidebar updates dynamically
- [ ] Active states are correct

### **Phase 3 Testing:**
- [ ] All migrated pages work
- [ ] No broken links
- [ ] Data loads correctly
- [ ] Existing features work

---

## ⏱️ Timeline Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Foundation | 1-2 weeks | 12-16 hours |
| Phase 2: Navigation | 1 week | 8-12 hours |
| Phase 3: Migration | 1-2 weeks | 12-16 hours |
| **Total (SignTusk only)** | **3-5 weeks** | **32-44 hours** |
| Phase 4: New Services | 2-3 weeks each | Per service |

---

## 🎯 Success Criteria

- [ ] Top navigation bar works smoothly
- [ ] Service switching is instant (<200ms)
- [ ] Sidebar updates correctly per service
- [ ] All existing SignTusk features work
- [ ] Mobile responsive
- [ ] No broken routes
- [ ] Clean, professional UI
- [ ] Easy to add new services

---

## 🚀 Quick Start (Minimal Viable Implementation)

If you want to start small and iterate:

### **Week 1: Proof of Concept**
1. Create service registry (2 hours)
2. Create basic top nav (3 hours)
3. Create basic sidebar (2 hours)
4. Test with one page (1 hour)

**Total:** 8 hours for working prototype

### **Week 2-3: Full Migration**
Complete Phase 3 migration

### **Week 4+: Polish & New Services**
Add animations, mobile support, new services

---

## 📚 Key Files to Create/Modify

### **New Files:**
- `src/config/services.ts`
- `src/contexts/service-context.tsx`
- `src/components/platform/top-navigation.tsx`
- `src/components/platform/service-sidebar.tsx`
- `src/app/(platform)/layout.tsx`

### **Modified Files:**
- All existing page routes (move to new structure)
- Navigation components
- API route references

---

## 💡 Pro Tips

1. **Start with one service** - Get SignTusk working first
2. **Use feature flags** - Enable services gradually
3. **Keep old routes** - Redirect to new ones during migration
4. **Test incrementally** - Don't migrate everything at once
5. **Document as you go** - Update README with new structure

---

**Ready to start? Begin with Phase 1, Step 1.1! 🚀**

