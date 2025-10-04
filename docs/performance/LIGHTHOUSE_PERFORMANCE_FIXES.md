# 🚀 Lighthouse Performance Optimization Guide

## 📊 Current Performance Score: 66/100

### 🎯 Goal: Achieve 90+ Performance Score

---

## 🔴 **CRITICAL ISSUES** (Immediate Impact)

### 1. **Reduce Unused JavaScript** (0.77s savings)

**Problem**: Large JavaScript bundles with unused code
- `_app-9ab38573d6dfa76c.js`: 116.8 KiB (45.2 KiB unused)
- `chunks/5040-f44051f4641c0686.js`: 37.2 KiB (34.2 KiB unused)
- Third-party libraries loaded but not used on all pages

**Solutions**:

#### A. Implement Dynamic Imports for Heavy Components

```typescript
// ❌ BAD: Import everything upfront
import { Designer } from '@codeminds-digital/pdfme-complete'
import { PDFViewer } from '@react-pdf-viewer/core'

// ✅ GOOD: Dynamic import when needed
const Designer = dynamic(() => 
  import('@codeminds-digital/pdfme-complete').then(mod => mod.Designer),
  { ssr: false, loading: () => <LoadingSpinner /> }
)

const PDFViewer = dynamic(() => 
  import('@react-pdf-viewer/core').then(mod => mod.PDFViewer),
  { ssr: false }
)
```

#### B. Code Split by Route

```typescript
// src/app/(dashboard)/drive/page.tsx
import dynamic from 'next/dynamic'

// Only load document designer when user navigates to drive
const DocumentDesignerWrapper = dynamic(
  () => import('@/components/features/drive/document-designer-wrapper'),
  { ssr: false, loading: () => <LoadingPage /> }
)
```

#### C. Remove Unused Dependencies

**Candidates for removal** (check if actually used):
- `axios-cache-adapter` (18.4 KiB) - Use native fetch with Next.js caching
- `@bugsnag/browser` (10.5 KiB) - Consider lighter error tracking
- `tinycolor2` (3.7 KiB) - Use CSS or smaller alternative
- `easy-peasy` (3.8 KiB) - Not needed if using React Context

---

### 2. **Eliminate Render-Blocking Resources** (0.32s savings)

**Problem**: CSS files block initial paint

**Solution**: Inline critical CSS

```typescript
// next.config.js
const nextConfig = {
  // ... existing config
  
  compiler: {
    // Remove unused CSS
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optimize CSS
  experimental: {
    optimizeCss: true, // Enable CSS optimization
  },
}
```

---

### 3. **Reduce Unused CSS** (0.3s savings)

**Problem**: 10 KiB of unused CSS from stylesheets

**Solutions**:

#### A. Use Tailwind JIT Mode (Already enabled, but optimize)

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Add safelist for dynamic classes
  safelist: [
    // Only include classes you actually use dynamically
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### B. Remove Unused UI Libraries

Check if you're using all of these:
- `@radix-ui/*` - Only import what you need
- Consider tree-shaking

---

### 4. **Third-Party Code Blocking** (540ms)

**Problem**: Netlify scripts blocking main thread for 543ms

**Solutions**:

#### A. Defer Third-Party Scripts

```typescript
// src/app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        
        {/* Load analytics after page interactive */}
        <Script
          src="https://cdn.segment.com/analytics.min.js"
          strategy="lazyOnload" // Changed from 'afterInteractive'
        />
        
        <Script
          src="https://app.netlify.com/scripts/cdp"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
```

#### B. Self-Host Critical Scripts

Instead of loading from CDN, bundle critical scripts:
```bash
npm install @segment/analytics-next
```

Then import directly:
```typescript
import { Analytics } from '@segment/analytics-next'
```

---

## 🟡 **HIGH PRIORITY** (Significant Impact)

### 5. **Minimize Main-Thread Work** (2.6s)

**Problem**: 1,456ms spent on script evaluation

**Solutions**:

#### A. Lazy Load Non-Critical Components

```typescript
// src/components/features/documents/request-signature-modal.tsx
import dynamic from 'next/dynamic'

// Lazy load heavy modals
const RequestSignatureModal = dynamic(
  () => import('./request-signature-modal-content'),
  { ssr: false }
)
```

#### B. Use React.memo for Expensive Components

```typescript
// Wrap expensive components
export const DocumentList = React.memo(({ documents }) => {
  // ... component code
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.documents === nextProps.documents
})
```

#### C. Optimize Re-renders

```typescript
// Use useMemo for expensive calculations
const sortedDocuments = useMemo(() => {
  return documents.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}, [documents])

// Use useCallback for event handlers
const handleDocumentClick = useCallback((id: string) => {
  router.push(`/documents/${id}`)
}, [router])
```

---

### 6. **Reduce JavaScript Execution Time** (1.4s)

**Problem**: Heavy JavaScript execution blocking interaction

**Solutions**:

#### A. Implement Code Splitting

```typescript
// next.config.js
const nextConfig = {
  webpack: (config, { isServer }) => {
    // ... existing config
    
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1]
                return `vendor.${packageName.replace('@', '')}`
              },
            },
            // Separate PDF libraries
            pdf: {
              test: /[\\/]node_modules[\\/](pdfjs-dist|pdf-lib|@react-pdf-viewer)[\\/]/,
              name: 'pdf-libs',
              priority: 10,
            },
            // Separate UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui-libs',
              priority: 9,
            },
          },
        },
      }
    }
    
    return config
  },
}
```

#### B. Use Web Workers for Heavy Computations

```typescript
// src/workers/pdf-processor.worker.ts
self.addEventListener('message', async (e) => {
  const { type, data } = e.data
  
  if (type === 'PROCESS_PDF') {
    // Heavy PDF processing here
    const result = await processPDF(data)
    self.postMessage({ type: 'RESULT', data: result })
  }
})

// Usage in component
const worker = new Worker(new URL('./pdf-processor.worker.ts', import.meta.url))
worker.postMessage({ type: 'PROCESS_PDF', data: pdfData })
```

---

### 7. **Optimize Images and Media** (1,287 KiB)

**Problem**: Large media files

**Solutions**:

#### A. Use Next.js Image Component

```typescript
// ❌ BAD
<img src="/logo.png" alt="Logo" />

// ✅ GOOD
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // For above-fold images
  placeholder="blur" // Optional blur-up effect
/>
```

#### B. Optimize Image Formats

```bash
# Convert images to WebP
npm install sharp
```

```javascript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    domains: ['gzxfsojbbfipzvjxucci.supabase.co'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

---

## 🟢 **MEDIUM PRIORITY** (Nice to Have)

### 8. **Implement Resource Hints**

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://gzxfsojbbfipzvjxucci.supabase.co" />
        <link rel="dns-prefetch" href="https://cdn.segment.com" />
        
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

### 9. **Enable Compression**

```javascript
// netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    # Enable compression
    Content-Encoding = "gzip"
    
    # Cache static assets
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### Phase 1: Quick Wins (1-2 hours)
- [ ] Add dynamic imports for PDF libraries
- [ ] Defer third-party scripts (Segment, Netlify)
- [ ] Enable CSS optimization in next.config.js
- [ ] Add resource hints (preconnect, dns-prefetch)
- [ ] Optimize images with Next.js Image component

### Phase 2: Code Splitting (2-4 hours)
- [ ] Implement route-based code splitting
- [ ] Split vendor bundles (PDF, UI, utilities)
- [ ] Lazy load modals and heavy components
- [ ] Remove unused dependencies

### Phase 3: Performance Tuning (4-6 hours)
- [ ] Add React.memo to expensive components
- [ ] Implement useMemo/useCallback optimizations
- [ ] Set up Web Workers for heavy tasks
- [ ] Add compression and caching headers

---

## 📊 **EXPECTED IMPROVEMENTS**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Performance Score | 66 | 90+ | +36% |
| JavaScript Size | 475 KiB | 250 KiB | -47% |
| Main Thread Work | 2.6s | 1.0s | -62% |
| LCP | ~3s | <2.5s | -17% |
| TBT | 540ms | <200ms | -63% |

---

## 🎯 **PRIORITY ORDER**

1. **Immediate** (Do Today):
   - Dynamic imports for PDF libraries
   - Defer third-party scripts
   - Enable Next.js optimizations

2. **This Week**:
   - Code splitting configuration
   - Remove unused dependencies
   - Optimize images

3. **Next Week**:
   - React performance optimizations
   - Web Workers for heavy tasks
   - Advanced caching strategies

---

## 🔍 **MONITORING**

After implementing fixes, monitor:
- Lighthouse scores (aim for 90+)
- Core Web Vitals (LCP, FID, CLS)
- Bundle size (use `npm run build` to check)
- Real user metrics (RUM)

```bash
# Analyze bundle size
npm run build
# Check .next/analyze/ for bundle report
```

