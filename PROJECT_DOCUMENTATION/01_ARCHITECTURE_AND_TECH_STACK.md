# Architecture & Tech Stack

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  SendTusk    │  │  SignTusk    │  │   Admin      │       │
│  │   Module     │  │   Module     │  │   Module     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Next.js API Routes)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  /api/send   │  │  /api/sign   │  │  /api/admin  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Services & External Integrations                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Supabase    │  │  Upstash     │  │   Resend     │       │
│  │  (Auth/DB)   │  │  (Redis)     │  │   (Email)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Service Communication Flow

```
User Action
    ↓
Frontend Component (React)
    ↓
API Route Handler (Next.js)
    ↓
Business Logic & Validation
    ↓
Database/External Service Call
    ↓
Response to Frontend
    ↓
UI Update & State Management
```

### Data Flow Architecture

```
Client Request
    ↓
Middleware (Auth, Logging)
    ↓
Route Handler
    ↓
Service Layer (Business Logic)
    ↓
Database Layer (Supabase)
    ↓
Cache Layer (Redis)
    ↓
Response
```

---

## 🛠️ Frontend Tech Stack

### Core Framework
- **Next.js:** 15.5.0 (React framework with SSR/SSG)
- **React:** 19.1.0 (UI library)
- **TypeScript:** 5 (Type safety)

### Styling & UI
- **Tailwind CSS:** 3.4.17 (Utility-first CSS)
- **Radix UI:** Component primitives
- **shadcn/ui:** Pre-built components
- **Lucide React:** Icon library
- **Class Variance Authority:** Component styling

### State Management
- **React Context:** Global state
- **React Query:** Server state management
- **Zustand:** (Optional) Client state

### Form Handling
- **React Hook Form:** Form state management
- **Zod/Yup:** Schema validation

### PDF & Document Handling
- **pdf-lib:** PDF manipulation
- **pdfjs-dist:** PDF rendering
- **@codeminds-digital/pdfme-complete:** PDF template engine
- **@react-pdf-viewer/core:** PDF viewer component
- **html-to-image:** HTML to image conversion
- **react-to-image:** React component to image

### Drag & Drop
- **@hello-pangea/dnd:** Drag and drop library

### Notifications & Alerts
- **Sonner:** Toast notifications
- **React Toastify:** Alternative notifications

### Charts & Analytics
- **Recharts:** React charting library

### QR Code & Verification
- **qrcode:** QR code generation
- **qrcode.react:** React QR code component
- **jsqr:** QR code reading
- **qr-code-styling:** Styled QR codes

### Utilities
- **date-fns:** Date manipulation
- **uuid:** UUID generation
- **axios:** HTTP client
- **clsx:** Conditional classnames
- **tailwind-merge:** Merge Tailwind classes

---

## 🔧 Backend Tech Stack

### Runtime & Framework
- **Node.js:** JavaScript runtime
- **Next.js API Routes:** Serverless functions
- **TypeScript:** Type safety

### Authentication & Security
- **Supabase Auth:** Authentication provider
- **JWT (jsonwebtoken):** Token generation
- **NextAuth.js:** Authentication library
- **bcryptjs:** Password hashing
- **speakeasy:** TOTP/2FA
- **node-forge:** Encryption & cryptography

### Email Service
- **Resend:** Email delivery service
- **@react-email/render:** Email template rendering
- **Handlebars:** Email template engine

### Payment Processing
- **Stripe:** Payment processing

### Rate Limiting & Caching
- **@upstash/ratelimit:** Rate limiting
- **@upstash/redis:** Redis client

### Workflow & Task Queue
- **@upstash/qstash:** Message queue

### Middleware
- **cookie:** Cookie parsing and handling

---

## 🗄️ Database & Storage

### Primary Database
- **PostgreSQL:** Relational database (via Supabase)
- **Supabase:** Managed PostgreSQL with auth, storage, realtime

### Caching Layer
- **Upstash Redis:** Serverless Redis
  - Session caching
  - Rate limiting
  - Real-time analytics
  - Temporary data storage

### File Storage
- **Supabase Storage:** Cloud file storage
  - Document uploads
  - PDF storage
  - User avatars

### Workflow Queue
- **Upstash QStash:** Serverless message queue
  - Email sending
  - PDF generation
  - Async tasks

---

## 🔐 Security Stack

### Authentication
- **Supabase Auth:** OAuth, Email/Password, SSO
- **JWT:** Token-based authentication
- **NextAuth.js:** Session management

### Password Security
- **bcryptjs:** Password hashing with salt

### Two-Factor Authentication
- **speakeasy:** TOTP generation and verification
- **QR Codes:** QR code generation for TOTP setup

### Encryption
- **node-forge:** Encryption and decryption
- **TLS/SSL:** HTTPS encryption (via Vercel/Cloudflare)

### Rate Limiting
- **Upstash RateLimit:** API rate limiting

### Audit & Logging
- **Sentry:** Error tracking and logging

---

## 🌐 Deployment & Hosting

### Frontend Hosting
- **Vercel:** Next.js hosting platform
  - Automatic deployments
  - Edge functions
  - CDN integration
  - Analytics

### Backend Hosting
- **Vercel:** API routes (serverless)
- **Edge Functions:** For low-latency operations

### CDN & Security
- **Cloudflare:** CDN and security
  - DDoS protection
  - WAF (Web Application Firewall)
  - SSL/TLS
  - Caching

### Monitoring & Observability
- **Sentry:** Error tracking
- **Vercel Analytics:** Performance monitoring
- **Supabase Dashboard:** Database monitoring

---

## 📊 External Services

### Database & Auth
- **Supabase** ($25-100/mo)
  - PostgreSQL database
  - Authentication
  - File storage
  - Realtime subscriptions

### Caching & Queues
- **Upstash Redis** ($10-50/mo)
  - Serverless Redis
  - Rate limiting
  - Session caching

- **Upstash QStash** (included in Redis)
  - Message queue
  - Scheduled jobs

### Email Service
- **Resend** ($20-50/mo)
  - Transactional emails
  - Email templates
  - Delivery tracking

### Payment Processing
- **Stripe** (2.9% + $0.30 per transaction)
  - Payment processing
  - Subscription management
  - Invoicing

### Hosting
- **Vercel** ($20-100/mo)
  - Frontend hosting
  - API routes
  - Edge functions

### CDN & Security
- **Cloudflare** ($0-200/mo)
  - CDN
  - DDoS protection
  - WAF

### Monitoring
- **Sentry** ($26-50/mo)
  - Error tracking
  - Performance monitoring
  - Session replay

### Total Monthly Cost
- **MVP:** $75-300/month
- **Growth:** $150-500/month
- **Scale:** $300-1000+/month

---

## 🔌 Integration Points

### Third-Party APIs
- **Stripe API:** Payment processing
- **Resend API:** Email sending
- **Supabase API:** Database operations
- **Upstash API:** Redis and QStash operations

### Webhooks
- **Stripe Webhooks:** Payment events
- **Supabase Webhooks:** Database events
- **Custom Webhooks:** For external integrations

### OAuth Providers
- **Google OAuth:** Social login
- **GitHub OAuth:** Social login
- **Microsoft OAuth:** Social login

---

## 📦 Dependencies Summary

### Production Dependencies (90+)
- Next.js ecosystem (next, react, react-dom)
- UI libraries (radix-ui, tailwindcss)
- PDF handling (pdf-lib, pdfjs-dist)
- Authentication (supabase, jsonwebtoken)
- Email (resend, react-email)
- Payments (stripe)
- Utilities (date-fns, uuid, axios)
- And many more...

### Development Dependencies
- TypeScript
- ESLint
- Testing libraries

---

## 🚀 Performance Considerations

### Frontend Optimization
- Code splitting with Next.js
- Image optimization
- CSS-in-JS with Tailwind
- Component lazy loading
- React Query for data caching

### Backend Optimization
- Serverless functions (auto-scaling)
- Database connection pooling
- Redis caching
- CDN for static assets
- Compression

### Database Optimization
- Indexes on frequently queried columns
- Connection pooling
- Query optimization
- Caching layer

### Monitoring
- Sentry for errors
- Vercel Analytics for performance
- Custom logging

---

## 🔄 CI/CD Pipeline

### Version Control
- **GitHub:** Repository hosting

### Deployment
- **Vercel:** Automatic deployments on push
- **Environment:** Staging and production

### Testing
- **ESLint:** Code linting
- **TypeScript:** Type checking
- **Manual testing:** QA process

---

## 📈 Scalability Strategy

### Horizontal Scaling
- Vercel serverless (auto-scaling)
- Supabase auto-scaling
- Upstash auto-scaling

### Vertical Scaling
- Database upgrades
- Cache upgrades
- Compute upgrades

### Caching Strategy
- Redis for frequently accessed data
- CDN for static assets
- Browser caching

### Database Optimization
- Indexes
- Query optimization
- Connection pooling

---

## 🔒 Security Best Practices

### Authentication
- JWT tokens with expiration
- Refresh token rotation
- Secure cookie storage

### Authorization
- Role-based access control (RBAC)
- Row-level security (RLS) in database
- API endpoint protection

### Data Protection
- Encryption at rest (Supabase)
- Encryption in transit (HTTPS)
- Sensitive data hashing

### API Security
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention

### Monitoring
- Error tracking (Sentry)
- Audit logs
- Security headers

---

## 📚 Related Documentation

- See `02_DIRECTORY_STRUCTURE.md` for file organization
- See `05_API_ENDPOINTS.md` for API details
- See `06_AUTHENTICATION_FLOW.md` for auth implementation
- See `07_DEVELOPMENT_WORKFLOW.md` for setup instructions
