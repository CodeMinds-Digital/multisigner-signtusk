# Corporate Control Panel Documentation

## 🎯 **Overview**

The Corporate Control Panel provides domain-based access control similar to Zoho Mail's domain administrator dashboard. It allows corporate domain administrators to manage their organization's users, settings, and security policies within SignTusk.

## 🔐 **Access Control Model**

### **Domain-Based Access Control**
- **Domain Administrator**: First corporate user from a domain becomes domain admin
- **Domain Manager**: Additional administrators with limited permissions
- **Corporate User**: Regular users within the organization

### **Access Hierarchy**
```
Domain Administrator (domain_admin)
├── Full control over domain settings
├── User management (invite, deactivate, role assignment)
├── Security policy configuration
├── Billing and subscription management
└── Integration management

Domain Manager (domain_manager)
├── User management (limited)
├── View analytics and reports
├── Basic security settings
└── No billing access

Corporate User (corporate_user)
├── Standard SignTusk features
├── Organization branding
└── Compliance with domain policies
```

## 🏗️ **Architecture**

### **Database Schema**
- `domain_administrators` - Domain admin roles and permissions
- `domain_settings` - Organization-wide configuration
- `domain_user_roles` - User roles within domains
- `domain_analytics` - Organization usage metrics
- `domain_audit_logs` - Administrative action tracking
- `domain_invitations` - User invitation management

### **API Structure**
```
/api/corporate/
├── domain-info/          # Domain information and verification
├── domain-stats/         # Analytics and usage statistics
├── users/                # User management within domain
├── settings/             # Domain configuration
├── security/             # Security policies and compliance
├── billing/              # Subscription and usage management
└── integrations/         # Third-party integrations
```

## 📋 **Required Modules**

### **1. 👥 User Management Module**

**Features:**
- **User Directory**: View all users with @company.com emails
- **User Provisioning**: Invite new users via email
- **Role Management**: Assign domain roles (admin, manager, user)
- **User Lifecycle**: Activate, deactivate, transfer users
- **Bulk Operations**: CSV import, bulk role changes

**Access Control:**
```typescript
// Domain admins can only manage users in their domain
const userDomain = targetUser.email.split('@')[1]
const adminDomain = adminUser.domain
return userDomain === adminDomain
```

### **2. 🔒 Security & Compliance Module**

**Features:**
- **TOTP Enforcement**: Require 2FA for all domain users
- **Password Policies**: Minimum length, complexity requirements
- **Session Management**: Timeout settings, concurrent sessions
- **IP Restrictions**: Whitelist/blacklist IP ranges
- **Audit Logs**: Complete activity tracking

**Implementation:**
```typescript
interface SecurityPolicy {
  enforceTotp: boolean
  passwordMinLength: number
  passwordRequireSpecial: boolean
  sessionTimeoutMinutes: number
  allowedIpRanges: string[]
  auditRetentionDays: number
}
```

### **3. 📊 Analytics & Reporting Module**

**Features:**
- **Usage Analytics**: Document activity, user engagement
- **Security Reports**: Login patterns, failed attempts
- **Compliance Reports**: GDPR, SOX, HIPAA status
- **Cost Analysis**: Usage-based billing breakdown
- **Export Capabilities**: PDF, CSV, Excel formats

### **4. ⚙️ Domain Settings Module**

**Features:**
- **Branding**: Custom logo, colors, email templates
- **Email Configuration**: SMTP settings, domain verification
- **Document Policies**: Retention, approval workflows
- **Notification Settings**: Default preferences
- **API Configuration**: Webhooks, rate limits

### **5. 💳 Billing & Subscription Module**

**Features:**
- **Plan Management**: Upgrade/downgrade subscriptions
- **Usage Monitoring**: Document limits, storage quotas
- **Invoice Management**: View, download, payment history
- **Cost Allocation**: Department-wise billing
- **Payment Methods**: Corporate payment options

### **6. 🔌 Integration Management Module**

**Features:**
- **SSO Configuration**: SAML, OAuth, LDAP
- **API Management**: Keys, rate limits, monitoring
- **Webhook Configuration**: Event notifications
- **Directory Sync**: Active Directory integration
- **Email Integration**: Zoho Mail, Google Workspace

## 🚀 **Implementation Guide**

### **Step 1: Database Setup**
```sql
-- Run the corporate control panel schema
\i src/sql/corporate-control-panel.sql
```

### **Step 2: Promote First Corporate User**
```typescript
// In corporate signup flow
if (accountType === 'corporate') {
  await promoteFirstUserToDomainAdmin(userId, email)
}
```

### **Step 3: Access Control Integration**
```typescript
// In API routes
import { withDomainAdminAuth } from '@/lib/corporate-access-control'

export const GET = withDomainAdminAuth(async (request) => {
  const domainAdmin = request.domainAdmin
  // Handle request with domain admin context
})
```

### **Step 4: Frontend Integration**
```typescript
// Check if user has domain admin access
const { hasAccess, user } = await checkDomainAdminAccess(token)
if (hasAccess) {
  // Show corporate control panel
  router.push('/corporate/control-panel')
}
```

## 🔄 **User Flow**

### **Domain Administrator Setup**
1. **Corporate Signup**: User signs up with corporate email
2. **Domain Detection**: System detects new corporate domain
3. **Auto-Promotion**: First user becomes domain administrator
4. **Domain Verification**: Admin verifies domain ownership
5. **Control Panel Access**: Full administrative capabilities

### **Additional User Management**
1. **User Invitation**: Domain admin invites new users
2. **Role Assignment**: Assign appropriate domain roles
3. **Policy Enforcement**: Apply security and compliance policies
4. **Monitoring**: Track usage and compliance

## 🛡️ **Security Features**

### **Row Level Security (RLS)**
- Domain admins can only access their domain data
- Users can only see their own information
- Audit logs track all administrative actions

### **Domain Verification**
- DNS TXT record verification
- Email domain ownership confirmation
- SSL certificate validation

### **Access Logging**
- All administrative actions logged
- IP address and user agent tracking
- Compliance audit trail

## 📊 **Analytics & Monitoring**

### **Key Metrics**
- User adoption and activity
- Document signing patterns
- Security compliance scores
- Cost per user/department

### **Compliance Reporting**
- GDPR data processing records
- SOX financial document tracking
- HIPAA healthcare compliance
- Custom compliance frameworks

## 🔧 **Configuration Examples**

### **Domain Settings**
```typescript
const domainSettings = {
  domain: 'acme.com',
  branding: {
    logoUrl: 'https://acme.com/logo.png',
    primaryColor: '#1F2937',
    secondaryColor: '#3B82F6'
  },
  security: {
    enforceTotp: true,
    passwordMinLength: 12,
    sessionTimeoutMinutes: 480
  },
  integrations: {
    ssoEnabled: true,
    ssoProvider: 'saml',
    webhookUrl: 'https://acme.com/webhooks/signtusk'
  }
}
```

### **User Role Assignment**
```typescript
const userRole = {
  domain: 'acme.com',
  userId: 'user-123',
  role: 'domain_manager',
  department: 'Legal',
  costCenter: 'CC-001',
  isActive: true
}
```

## 🎯 **Benefits**

### **For Organizations**
- **Centralized Management**: Single dashboard for all users
- **Security Compliance**: Enforce organization-wide policies
- **Cost Control**: Monitor and allocate usage costs
- **Brand Consistency**: Custom branding across all documents

### **For Domain Administrators**
- **User Oversight**: Complete visibility into user activity
- **Policy Enforcement**: Ensure compliance with corporate policies
- **Integration Control**: Manage third-party connections
- **Audit Capability**: Complete activity tracking

### **For End Users**
- **Seamless Experience**: Automatic organization branding
- **Security Assurance**: Enterprise-grade security policies
- **Support Access**: Direct connection to domain administrators
- **Compliance Automation**: Automatic policy compliance

## 🚀 **Next Steps**

1. **Implement User Management Module** - Core functionality for managing domain users
2. **Add Security Policy Engine** - Enforce organization-wide security settings
3. **Build Analytics Dashboard** - Comprehensive reporting and insights
4. **Integrate Billing System** - Usage tracking and cost allocation
5. **Add SSO Integration** - Enterprise authentication providers
6. **Implement Audit System** - Comprehensive compliance tracking

The Corporate Control Panel transforms SignTusk into an enterprise-ready platform with domain-based multi-tenancy, similar to leading SaaS platforms like Zoho, Google Workspace, and Microsoft 365.
