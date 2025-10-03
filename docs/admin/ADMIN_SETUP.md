# SignTusk Admin Panel Setup Guide

## Overview

The SignTusk Admin Panel is a separate, secure administration interface for managing the entire SignTusk system. It provides comprehensive tools for user management, system monitoring, API key management, and more.

## 🔐 **Separate Admin Authentication**

The admin panel has its own authentication system, completely separate from the client application:

- **Admin Login URL**: `/admin/login`
- **Admin Dashboard URL**: `/admin/dashboard`
- **Separate session management** from client users
- **Role-based access control** (Super Admin, Support, Auditor)

## 👥 **Default Admin Accounts**

### Demo Credentials (Change in Production!)

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Super Admin** | admin@signtusk.com | admin123! | Full system access |
| **Support** | support@signtusk.com | support123! | User & document management |
| **Auditor** | auditor@signtusk.com | auditor123! | Read-only access to logs & reports |

⚠️ **IMPORTANT**: Change these credentials before deploying to production!

## 🎛️ **Admin Panel Features**

### 1. **Overview Dashboard**
- **System Statistics**: Users, revenue, documents, success rates
- **User Distribution**: Free vs paid accounts breakdown
- **Performance Metrics**: Email delivery, storage usage, resend attempts
- **Quick Actions**: Refresh data, export reports, test systems

### 2. **User Management Overview**
- **Total Users**: Complete count of registered users
- **Account Types**: Breakdown of free vs paid accounts
- **Activity Tracking**: Active vs inactive users
- **Signup Statistics**: Recent registrations and usage trends

### 3. **Subscription & Billing Insights**
- **Revenue Dashboard**: Monthly revenue tracking
- **Plan Distribution**: Users by subscription plan
- **Renewal Tracking**: Upcoming renewals and expirations
- **Payment Analytics**: Success rates and failed payments

### 4. **API Key Management**
- **Centralized Key Storage**: Secure management of all external API keys
- **Service Integration**: Resend, Supabase, Stripe, and other services
- **Usage Monitoring**: Track API key usage and performance
- **Security Controls**: Activate/deactivate keys, rotation tracking

### 5. **System Monitoring & Reports**
- **Real-time Metrics**: Document uploads, signatures, completions
- **Error Tracking**: Failed signature attempts and system errors
- **Email Analytics**: Delivery rates, resend attempts, bounce tracking
- **Performance Reports**: System health and uptime monitoring

### 6. **Security & Access Control**
- **Role-based Permissions**: Different access levels for admin users
- **Activity Logging**: Complete audit trail of admin actions
- **Session Management**: Secure admin session handling
- **2FA Support**: Two-factor authentication for admin accounts (planned)

## 🚀 **Getting Started**

### 1. **Access the Admin Panel**
```
http://localhost:3000/admin/login
```

### 2. **Login with Demo Credentials**
Use any of the demo accounts listed above to access the admin panel.

### 3. **Navigate the Interface**
- **Overview**: System statistics and quick actions
- **User Management**: User accounts and subscriptions
- **Documents**: Document management and analytics
- **Billing**: Revenue and subscription tracking
- **API Keys**: External service management
- **System Health**: Monitoring and diagnostics
- **Activity Logs**: Admin action audit trail

## 🔧 **Configuration**

### Environment Variables
The admin panel uses the same environment variables as the main application:

```bash
# Required for admin functionality
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Tables (Optional)
For enhanced functionality, create these admin-specific tables:

```sql
-- Admin activity logs
CREATE TABLE admin_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Admin users (if using database storage)
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'support', 'auditor')),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  two_fa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

## 🔒 **Security Considerations**

### Production Deployment

1. **Change Default Credentials**
   - Update admin passwords in `src/lib/admin-auth.ts`
   - Use strong, unique passwords
   - Consider using environment variables for credentials

2. **Enable HTTPS**
   - Always use HTTPS in production
   - Secure admin session cookies
   - Implement proper CORS policies

3. **Database Security**
   - Store admin credentials securely (hashed passwords)
   - Use proper database access controls
   - Enable audit logging

4. **Access Control**
   - Restrict admin panel access by IP if possible
   - Implement rate limiting on login attempts
   - Enable two-factor authentication

### Role Permissions

| Permission | Super Admin | Support | Auditor |
|------------|-------------|---------|---------|
| View Dashboard | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ✅ | ❌ |
| View Documents | ✅ | ✅ | ✅ |
| Manage API Keys | ✅ | ✅ | ❌ |
| System Settings | ✅ | ❌ | ❌ |
| View Logs | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ |

## 📊 **Monitoring & Analytics**

### Key Metrics Tracked
- **User Growth**: Registration trends and user acquisition
- **Revenue Metrics**: Monthly recurring revenue and churn
- **Document Processing**: Upload, signature, and completion rates
- **System Performance**: Response times and error rates
- **Email Delivery**: Success rates and bounce tracking

### Reports Available
- **User Activity Reports**: Login patterns and feature usage
- **Revenue Reports**: Subscription analytics and payment tracking
- **System Health Reports**: Performance and uptime metrics
- **Security Reports**: Failed login attempts and suspicious activity

## 🛠️ **Customization**

### Adding New Admin Features

1. **Create New Tab Component**
   ```typescript
   function NewFeatureTab() {
     return (
       <Card>
         <CardHeader>
           <CardTitle>New Feature</CardTitle>
         </CardHeader>
         <CardContent>
           {/* Your feature content */}
         </CardContent>
       </Card>
     )
   }
   ```

2. **Add to Tab Navigation**
   ```typescript
   const tabs = [
     // ... existing tabs
     { id: 'new-feature', label: 'New Feature', icon: YourIcon }
   ]
   ```

3. **Implement Permission Checks**
   ```typescript
   if (!hasAdminPermission('your_permission')) {
     return <AccessDenied />
   }
   ```

### Extending User Roles

1. **Update Role Definitions** in `src/lib/admin-auth.ts`
2. **Add Permission Mappings** for new roles
3. **Update UI Components** to handle new roles

## 🚨 **Troubleshooting**

### Common Issues

1. **Cannot Access Admin Panel**
   - Check if admin credentials are correct
   - Verify admin authentication is working
   - Check browser console for errors

2. **API Keys Not Working**
   - Verify environment variables are set
   - Check API key permissions in external services
   - Review usage limits and quotas

3. **Data Not Loading**
   - Check database connections
   - Verify Supabase configuration
   - Review browser network tab for failed requests

### Support

For additional support or questions about the admin panel:
1. Check the activity logs for error details
2. Review the browser console for JavaScript errors
3. Verify all environment variables are properly configured
4. Test individual system components using the health checks

The admin panel provides comprehensive tools for managing your SignTusk deployment with security, monitoring, and administrative capabilities.
