# 🔐 SignTusk Login Types & Authentication System

## Overview

SignTusk has **3 distinct authentication systems** for different user types and purposes. Each has its own login flow, database tables, and access levels.

---

## 🎯 **1. Personal Login (Individual Users)**

### **Purpose**: Individual users signing documents
### **Login URL**: `/login` or `/auth/login`
### **Database**: Supabase Auth (`auth.users` table)
### **Features**:
- ✅ Email/password authentication
- ✅ Social login (Google, GitHub, etc.)
- ✅ Email verification
- ✅ Password reset
- ✅ Profile management
- ✅ Document creation and signing
- ✅ Personal dashboard

### **User Flow**:
```
1. User visits SignTusk.com
2. Clicks "Sign Up" or "Login"
3. Creates account with email/password
4. Verifies email
5. Access personal dashboard
6. Create/sign documents
```

### **Database Schema**:
```sql
-- Supabase Auth (built-in)
auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR,
  created_at TIMESTAMP,
  last_sign_in_at TIMESTAMP,
  user_metadata JSONB,
  app_metadata JSONB
)

-- Extended user data
user_profiles (
  id UUID REFERENCES auth.users(id),
  full_name VARCHAR,
  company VARCHAR,
  phone VARCHAR,
  avatar_url VARCHAR
)
```

---

## 🏢 **2. Corporate Login (Business Users)**

### **Purpose**: Business users with enhanced features
### **Login URL**: `/corporate/login` or `/auth/corporate`
### **Database**: Supabase Auth + Corporate Extensions
### **Features**:
- ✅ All personal features +
- ✅ Company domain validation
- ✅ Team management
- ✅ Advanced analytics
- ✅ Bulk operations
- ✅ Custom branding
- ✅ SSO integration (Zoho OAuth)
- ✅ Organization-wide policies

### **User Flow**:
```
1. User signs up with corporate email
2. System detects corporate domain
3. Enhanced corporate profile creation
4. Access to team features
5. Organization management
6. Advanced document workflows
```

### **Database Schema**:
```sql
-- Corporate users (extends auth.users)
corporate_users (
  id UUID REFERENCES auth.users(id),
  company_name VARCHAR,
  domain VARCHAR,
  industry VARCHAR,
  employee_count INTEGER,
  subscription_tier VARCHAR
)

-- Organizations
organizations (
  id UUID PRIMARY KEY,
  name VARCHAR,
  domain VARCHAR,
  settings JSONB,
  created_at TIMESTAMP
)

-- User organization memberships
user_organizations (
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR,
  joined_at TIMESTAMP
)
```

---

## 🛡️ **3. Admin Login (SignTusk Administration)**

### **Purpose**: SignTusk platform administration
### **Login URL**: `/admin/login`
### **Database**: Custom admin tables (separate from user auth)
### **Features**:
- ✅ Platform-wide user management
- ✅ System configuration
- ✅ Feature flag management
- ✅ Analytics and reporting
- ✅ Billing management
- ✅ Support tools
- ✅ Audit trails

### **User Flow**:
```
1. Admin visits /admin/login
2. Uses admin credentials (separate from user accounts)
3. Access admin dashboard
4. Manage platform operations
5. Monitor system health
6. Configure platform settings
```

### **Database Schema**:
```sql
-- Admin users (completely separate from auth.users)
admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  name VARCHAR,
  role VARCHAR CHECK (role IN ('super_admin', 'support', 'auditor')),
  is_active BOOLEAN,
  two_fa_enabled BOOLEAN,
  last_login TIMESTAMP,
  created_at TIMESTAMP
)

-- Admin sessions
admin_sessions (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id),
  token VARCHAR UNIQUE,
  expires_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT
)
```

---

## 🔑 **Current Login Credentials**

### **Personal Users**
```bash
# Individual users can sign up at:
URL: http://localhost:3000/login
Method: Self-registration with email verification

# Any personal email (gmail.com, yahoo.com, etc.)
Example: john@gmail.com
```

### **Corporate Users**
```bash
# Business users with corporate email domains:
URL: http://localhost:3000/login
Method: Self-registration with corporate email

# Current corporate domain: codeminds.digital
Example: user@codeminds.digital
# System automatically detects corporate domain and provides enhanced features
```

### **Admin Users (SignTusk Platform Administration)**
```bash
# Super Admin
URL: http://localhost:3000/admin/login
Email: admin@signtusk.com
Password: admin123!

# Support Admin
Email: support@signtusk.com
Password: support123!

# Auditor
Email: auditor@signtusk.com
Password: auditor123!
```

---

## 🎯 **Authentication Flow Comparison**

| Feature | Personal | Corporate | Admin |
|---------|----------|-----------|-------|
| **Registration** | Self-service | Self-service + domain validation | Admin-created only |
| **Database** | Supabase Auth | Supabase Auth + Extensions | Custom admin tables |
| **Session Management** | Supabase JWT | Supabase JWT | Custom tokens |
| **Password Reset** | Email-based | Email-based | Admin-managed |
| **2FA Support** | Optional | Optional | Available |
| **SSO Integration** | Limited | Zoho OneAuth | Not applicable |
| **Access Level** | Personal documents | Team/org documents | Platform administration |

---

## 🔐 **Security Features**

### **Personal/Corporate**
- ✅ Supabase Auth security
- ✅ JWT token-based sessions
- ✅ Email verification
- ✅ Password strength requirements
- ✅ Rate limiting
- ✅ TOTP authentication (optional)

### **Admin**
- ✅ Separate authentication system
- ✅ Bcrypt password hashing
- ✅ Role-based access control
- ✅ Session timeout
- ✅ IP tracking
- ✅ Audit logging
- ✅ 2FA support

---

## 🚀 **How to Access Each System**

### **1. Personal Login**
```bash
# Development
http://localhost:3000/login

# Production
https://signtusk.com/login
```

### **2. Corporate Login**
```bash
# Same as personal, but with corporate email domain
# System automatically detects corporate users
http://localhost:3000/login
```

### **3. Admin Login**
```bash
# Development
http://localhost:3000/admin/login

# Production
https://admin.signtusk.com/login
# or
https://signtusk.com/admin/login
```

---

## 🎯 **Summary**

**SignTusk has 3 login types:**

1. **👤 Personal**: Individual users (`/login`)
2. **🏢 Corporate**: Business users with enhanced features (`/login` with corporate email)
3. **🛡️ Admin**: Platform administrators (`/admin/login`)

Each system is designed for different use cases and has appropriate security measures and access levels. The admin system is completely separate to ensure platform security and prevent conflicts with user authentication.

---

## 🔧 **Development Notes**

- **Personal/Corporate** users share the same login endpoint but get different features based on their profile
- **Admin** users have a completely separate authentication system
- All systems support proper session management and security features
- The admin system includes comprehensive audit logging for compliance
