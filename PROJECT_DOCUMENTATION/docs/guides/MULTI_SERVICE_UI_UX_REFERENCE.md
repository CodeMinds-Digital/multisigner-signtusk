# Multi-Service Platform UI/UX Visual Reference
## TuskHub Design Patterns & Component Examples

---

## 📐 Layout Specifications

### Desktop Layout (1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [🦣] [Sign] [Send] [Meet] [Analytics]    [🔍 Search] [🔔 3] [⚙️] [👤 User] │ 56px
├──────────┬─────────────────────────────────────────────────────────────────┤
│          │                                                                  │
│ SignTusk │  ┌────────────────────────────────────────────────────────┐    │
│          │  │                                                          │    │
│ 📥 Inbox │  │                                                          │    │
│ 📤 Sent  │  │                                                          │    │
│ 📁 Drive │  │              Main Content Area                          │    │
│ 📋 Tmpl  │  │              (Responsive Grid)                          │    │
│          │  │                                                          │    │
│ ─────────│  │                                                          │    │
│          │  │                                                          │    │
│ ⚙️ Set   │  │                                                          │    │
│          │  └────────────────────────────────────────────────────────┘    │
│  240px   │                        1680px                                   │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768x1024)

```
┌──────────────────────────────────────────┐
│ [☰] TuskHub - Sign    [🔍] [🔔] [👤]    │ 56px
├──────────────────────────────────────────┤
│                                          │
│                                          │
│         Main Content                     │
│         (Full Width)                     │
│                                          │
│                                          │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

### Mobile Layout (375x667)

```
┌─────────────────────────┐
│ [☰] Sign    [🔍] [🔔]  │ 56px
├─────────────────────────┤
│                         │
│                         │
│    Main Content         │
│    (Stacked)            │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ [📥] [📤] [📁] [⚙️] [👤]│ 64px
│ Inbox Sent Drive Set Me │
└─────────────────────────┘
```

---

## 🎨 Component Library

### 1. Top Navigation Bar

**Desktop Version:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  [🦣 TuskHub]  [Sign] [Send] [Meet] [Analytics]  [Search...] [🔔 3] [👤] │
│                  ▔▔▔▔                                                      │
│                 Active                                                     │
└────────────────────────────────────────────────────────────────────────────┘

Specifications:
- Height: 56px
- Background: #FFFFFF
- Border-bottom: 1px solid #E5E7EB
- Box-shadow: 0 1px 3px rgba(0,0,0,0.1)
- Padding: 0 24px
- Z-index: 1000
- Position: sticky top-0
```

**Service Tab States:**

```css
/* Inactive Tab */
.service-tab {
  padding: 12px 20px;
  color: #6B7280;
  background: transparent;
  border-radius: 8px;
  transition: all 200ms ease;
}

.service-tab:hover {
  background: #F3F4F6;
  color: #374151;
}

/* Active Tab */
.service-tab.active {
  background: #EFF6FF;
  color: #3B82F6;
  font-weight: 600;
  box-shadow: inset 0 -2px 0 #3B82F6;
}
```

---

### 2. Service Switcher (Mobile)

**Hamburger Menu:**

```
Tap [☰]:

┌─────────────────────────────┐
│ 🦣 TuskHub                  │
│                             │
│ Services                    │
├─────────────────────────────┤
│ ✓ 📝 SignTusk          →   │ ← Active (blue checkmark)
│   📤 SendTusk          →   │
│   📅 MeetTusk          →   │
│   📊 Analytics         →   │
├─────────────────────────────┤
│ ⚙️  Settings                │
│ 💳 Billing                  │
│ 📚 Help & Support           │
│ 🚪 Logout                   │
└─────────────────────────────┘

Animation: Slide in from left (300ms ease-out)
Overlay: Semi-transparent black (opacity: 0.5)
Width: 280px
```

---

### 3. Service Sidebar

**SignTusk Sidebar Example:**

```
┌──────────────────────────┐
│                          │
│  📝 SignTusk             │
│  Document Signing        │
│                          │
├──────────────────────────┤
│                          │
│  📥 Inbox           12   │ ← Badge for count
│                          │
│  📤 Sent                 │
│                          │
│  📁 Drive                │
│                          │
│  📋 Templates            │
│                          │
│  ─────────────────       │
│                          │
│  ⚙️  Settings            │
│                          │
└──────────────────────────┘

Width: 240px
Background: #F9FAFB
Border-right: 1px solid #E5E7EB
```

**Navigation Item States:**

```css
/* Default State */
.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin: 4px 8px;
  border-radius: 8px;
  color: #4B5563;
  transition: all 150ms ease;
}

/* Hover State */
.nav-item:hover {
  background: #FFFFFF;
  color: #1F2937;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* Active State */
.nav-item.active {
  background: #FFFFFF;
  color: #3B82F6;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Badge */
.nav-item-badge {
  margin-left: auto;
  background: #EF4444;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
```

---

### 4. Global Search

**Search Bar (Collapsed):**

```
┌─────────────────────────────┐
│ 🔍 Search...         ⌘K     │
└─────────────────────────────┘

Width: 240px (collapsed)
Expands to: 480px (on focus)
```

**Search Modal (Expanded):**

```
┌────────────────────────────────────────────────────┐
│ 🔍 Search across all services...                  │
├────────────────────────────────────────────────────┤
│                                                    │
│ Recent Searches                                    │
│ • Contract with Acme Corp                          │
│ • Meeting notes                                    │
│                                                    │
│ Suggestions                                        │
│ 📝 SignTusk                                        │
│   • Contract_Final.pdf (Signed yesterday)          │
│   • NDA Template                                   │
│                                                    │
│ 📤 SendTusk                                        │
│   • Q4 Report (Shared 2 days ago)                  │
│                                                    │
│ 📅 MeetTusk                                        │
│   • Team Standup (Tomorrow at 10 AM)               │
│                                                    │
└────────────────────────────────────────────────────┘

Keyboard Navigation:
- ↑↓ to navigate results
- Enter to select
- Esc to close
- Tab to switch between sections
```

---

### 5. Notification Center

**Bell Icon with Badge:**

```
┌────┐
│ 🔔 │  ← Badge shows "3" in red circle
└────┘
```

**Notification Panel:**

```
┌──────────────────────────────────────────────────┐
│ Notifications                    Mark all read   │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📝 SignTusk                                      │
│ ● John Doe signed "Contract.pdf"                │
│   2 minutes ago                                  │
│                                                  │
│ 📤 SendTusk                                      │
│ ● Sarah viewed "Proposal.pdf" (3 times)         │
│   1 hour ago                                     │
│                                                  │
│ 📅 MeetTusk                                      │
│ ○ Reminder: Team meeting in 30 minutes          │
│   Just now                                       │
│                                                  │
│ ─────────────────────────────────────────────   │
│                                                  │
│ 💳 Platform                                      │
│ ○ Your payment was successful                   │
│   Yesterday                                      │
│                                                  │
├──────────────────────────────────────────────────┤
│              View all notifications →            │
└──────────────────────────────────────────────────┘

Width: 400px
Max-height: 600px
Position: Absolute (top-right)
Animation: Fade in + slide down (200ms)

Legend:
● = Unread (blue dot)
○ = Read (gray dot)
```

---

### 6. User Profile Menu

**Avatar Dropdown:**

```
Click [👤]:

┌──────────────────────────────────┐
│ 👤 John Doe                      │
│    john.doe@example.com          │
├──────────────────────────────────┤
│ 👤 Profile                       │
│ ⚙️  Account Settings             │
│ 🔐 Security                      │
│ 💳 Billing & Plans               │
├──────────────────────────────────┤
│ 📚 Help Center                   │
│ 💬 Contact Support               │
│ 🐛 Report a Bug                  │
├──────────────────────────────────┤
│ 🚪 Logout                        │
└──────────────────────────────────┘

Width: 240px
Position: Absolute (top-right)
```

---

### 7. Service Dashboard Cards

**Dashboard Grid Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Dashboard                                                  │
│  Overview of your activities                                │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ 📝 Documents │ │ ✅ Completed │ │ ⏳ Pending   │       │
│  │              │ │              │ │              │       │
│  │     142      │ │      89      │ │      12      │       │
│  │              │ │              │ │              │       │
│  │  ↑ 12% ▲    │ │  ↑ 8% ▲     │ │  ↓ 3% ▼     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ 📤 Shared    │ │ 👥 Signers   │ │ 📅 Meetings  │       │
│  │              │ │              │ │              │       │
│  │      45      │ │      67      │ │      23      │       │
│  │              │ │              │ │              │       │
│  │  ↑ 5% ▲     │ │  → 0%        │ │  ↑ 15% ▲    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
Gap: 24px
Card padding: 24px
Card border-radius: 12px
Card shadow: 0 1px 3px rgba(0,0,0,0.1)
```

---

### 8. Empty States

**No Documents Yet:**

```
┌─────────────────────────────────────────┐
│                                         │
│              📄                         │
│                                         │
│      No documents yet                   │
│                                         │
│  Upload your first document to          │
│  get started with SignTusk              │
│                                         │
│      [Upload Document]                  │
│                                         │
│      or drag and drop here              │
│                                         │
└─────────────────────────────────────────┘

Icon size: 64px
Text color: #6B7280
Button: Primary blue
```

---

### 9. Loading States

**Skeleton Loader:**

```
┌─────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                       │
│                                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│                                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
│                                         │
└─────────────────────────────────────────┘

Animation: Shimmer effect (1.5s infinite)
Background: Linear gradient
```

---

## 🎯 Interaction Patterns

### 10. Service Switching Animation

**Transition Flow:**

```
User clicks "SendTusk" tab:

Step 1: Fade out current content (150ms)
Step 2: Update sidebar (instant)
Step 3: Fade in new content (150ms)
Total: 300ms

CSS:
.content-transition {
  transition: opacity 150ms ease-in-out;
}
```

---

### 11. Keyboard Shortcuts Reference

**Global Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `Cmd/Ctrl + /` | Show keyboard shortcuts |
| `Cmd/Ctrl + ,` | Open settings |
| `G then S` | Go to SignTusk |
| `G then D` | Go to SendTusk |
| `G then M` | Go to MeetTusk |

---

## 🎨 Responsive Design Examples

### Mobile Bottom Navigation

```
┌─────────────────────────────────────────┐
│ [📥] [📤] [📁] [⚙️] [👤]                │
│ Inbox Sent Drive Set  Me                │
└─────────────────────────────────────────┘

Height: 64px
Background: White
Border-top: 1px solid #E5E7EB
Position: Fixed bottom
```

---

## 📊 Real-World Platform Comparisons

### Navigation Pattern Comparison

**Zoho One:**
- Waffle menu (top-left) for app switching
- Persistent search bar
- Notification bell
- User profile (top-right)

**HubSpot:**
- Hub tabs (horizontal) at top
- Service-specific sidebar
- Global search (Cmd+K)
- Notification center

**Google Workspace:**
- App switcher (3x3 grid icon)
- Minimal top bar
- Each app has unique layout
- Shared account menu

**Microsoft 365:**
- Vertical app bar (left side)
- Horizontal command ribbon
- Unified search
- Consistent Office UI

**Recommended for TuskHub:**
- Hybrid of HubSpot + Zoho
- Horizontal service tabs (like HubSpot hubs)
- Dynamic sidebar per service (like Zoho apps)
- Global search and notifications (like all platforms)

---

## 🎯 Implementation Checklist

### Phase 1: Core Components
- [ ] Top navigation bar with service tabs
- [ ] Service switcher (mobile)
- [ ] Dynamic sidebar component
- [ ] Global search modal
- [ ] Notification center
- [ ] User profile menu

### Phase 2: Shared Components
- [ ] Button library (primary, secondary, ghost, danger)
- [ ] Form inputs (text, select, checkbox, radio)
- [ ] Card components
- [ ] Table components
- [ ] Modal/dialog system
- [ ] Toast notifications

### Phase 3: Service-Specific
- [ ] SignTusk dashboard
- [ ] SendTusk dashboard
- [ ] MeetTusk dashboard
- [ ] Analytics dashboard

### Phase 4: Polish
- [ ] Animations and transitions
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Accessibility audit
- [ ] Performance optimization

---

## 📚 Design Resources

### Recommended Tools

1. **Figma** - Design and prototyping
2. **Storybook** - Component documentation
3. **Tailwind CSS** - Utility-first CSS framework
4. **Radix UI** - Accessible component primitives
5. **Framer Motion** - Animation library
6. **React Hook Form** - Form management
7. **Recharts** - Data visualization

### Inspiration Sources

1. **Dribbble** - https://dribbble.com/tags/dashboard
2. **Behance** - https://www.behance.net/search/projects?search=saas+dashboard
3. **Mobbin** - https://mobbin.com (Mobile app patterns)
4. **UI Sources** - https://www.uisources.com
5. **SaaS Landing Page** - https://saaslandingpage.com

---

## 🎯 Key Takeaways

1. **Consistency is King** - Use the same patterns across all services
2. **Mobile-First** - Design for mobile, enhance for desktop
3. **Accessibility Matters** - WCAG 2.1 AA compliance from day one
4. **Performance First** - Fast page loads and smooth transitions
5. **User Feedback** - Test with real users early and often

---

**Next Steps:**
1. Review this document with your design team
2. Create high-fidelity mockups in Figma
3. Build component library in Storybook
4. Implement responsive layouts
5. Test with users and iterate

---

*Document Version: 1.0*
*Last Updated: 2025-10-03*
*Companion to: MULTI_SERVICE_PLATFORM_PRODUCT_STRATEGY.md*

