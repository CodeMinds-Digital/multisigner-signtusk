# 🔐 TOTP Authentication System Documentation

## Overview

SignTusk now features a comprehensive **Time-based One-Time Password (TOTP) Authentication System** that provides enterprise-grade security for both login and document signing processes. This system seamlessly integrates with your existing corporate authentication flow while adding multi-factor authentication capabilities.

## 🎯 Key Features

### **Multi-Level Security**
- **Personal TOTP Settings**: Individual user control over MFA preferences
- **Organization Policies**: Enterprise-wide TOTP enforcement
- **Context-Aware Authentication**: Different requirements for login vs signing
- **Emergency Access**: Admin override and backup codes for critical situations

### **Corporate Integration**
- **Seamless Integration**: Works with existing corporate email validation and SSO
- **Organization Mapping**: Automatic organization creation from corporate domains
- **Backward Compatibility**: Existing corporate users unaffected until they opt-in
- **Admin Controls**: Organization-level policy management and compliance tracking

## 🏗️ Architecture

### **Database Schema**
```sql
-- User TOTP Configuration
user_totp_configs (
  user_id, secret, enabled, login_mfa_enabled, signing_mfa_enabled,
  backup_codes, last_used_at, created_at, updated_at
)

-- Organization Structure
organizations (id, name, domain, plan, status, created_at, updated_at)
user_organizations (user_id, organization_id, role, status, joined_at)

-- Organization TOTP Policies
organization_totp_policies (
  organization_id, enforce_login_mfa, enforce_signing_mfa,
  require_totp_for_all_documents, allow_user_override, ...
)

-- Emergency Access
organization_totp_exemptions (
  organization_id, user_id, exemption_type, reason, expires_at, ...
)
```

### **API Endpoints**
```
/api/auth/totp/setup          - Initial TOTP setup with QR code
/api/auth/totp/verify         - TOTP verification for login/signing
/api/auth/totp/config         - Get/update TOTP configuration
/api/auth/totp/backup-codes   - Generate/use backup codes

/api/admin/organizations      - Organization management
/api/admin/emergency-access   - Emergency exemptions and overrides
/api/signing/totp-verify      - Document signing TOTP verification
```

## 🚀 User Experience

### **For End Users**

#### **1. TOTP Setup Process**
1. Navigate to **Settings → Security**
2. Click **"Enable TOTP Authentication"**
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter verification code to confirm setup
5. Save backup codes in secure location
6. Choose contexts: Login, Signing, or Both

#### **2. Login with TOTP**
```
Standard Flow: Email/Password → Dashboard
TOTP Flow:     Email/Password → TOTP Code → Dashboard
```

#### **3. Document Signing with TOTP**
```
Standard Flow: View Document → Accept & Sign → Complete
TOTP Flow:     View Document → Accept & Sign → TOTP Code → Complete
```

### **For Administrators**

#### **1. Organization TOTP Policies**
- Access **Admin Panel → Organization TOTP**
- Configure organization-wide policies:
  - Enforce login MFA for all users
  - Require TOTP for document signing
  - Set grace periods and exemptions
  - Configure backup and recovery options

#### **2. Security Dashboard**
- Monitor TOTP adoption rates
- Track security events and compliance
- View organization-level metrics
- Manage emergency access requests

#### **3. Emergency Access Management**
- Grant temporary TOTP exemptions
- Reset user TOTP configurations
- Override organization policies
- Audit emergency access usage

## 🔧 Integration with Corporate Flow

### **Existing Corporate Features Preserved**
✅ **Corporate Email Validation** - Domain-based company detection  
✅ **Corporate Signup Process** - Enhanced profile with company details  
✅ **SSO Integration** - Zoho OAuth and other providers  
✅ **Corporate User Management** - Existing admin controls  

### **New Organization Enhancements**
🆕 **Automatic Organization Creation** - Corporate domains → Organizations  
🆕 **TOTP Policy Enforcement** - Organization-wide security requirements  
🆕 **Emergency Access Controls** - Admin override capabilities  
🆕 **Compliance Tracking** - Audit trails and security metrics  

### **Migration Strategy**
1. **Existing Corporate Users**: Automatically linked to organizations
2. **TOTP Policies**: Start disabled, admins can enable gradually
3. **Backward Compatibility**: No disruption to existing workflows
4. **Opt-in Approach**: Users choose when to enable TOTP

## 📋 Configuration Examples

### **Personal TOTP Settings**
```typescript
// User enables TOTP for signing only
{
  login_mfa_enabled: false,
  signing_mfa_enabled: true,
  backup_codes: ['ABC123', 'DEF456', ...]
}
```

### **Organization Policy Examples**

#### **High-Security Organization**
```typescript
{
  enforce_login_mfa: true,           // All users must use TOTP for login
  enforce_signing_mfa: true,         // All signatures require TOTP
  require_totp_for_all_documents: true,  // No exceptions
  allow_user_override: false,        // Users cannot disable
  login_mfa_grace_period_days: 3     // 3-day setup period
}
```

#### **Flexible Organization**
```typescript
{
  enforce_login_mfa: false,          // Optional login TOTP
  enforce_signing_mfa: true,         // Required for signing only
  require_totp_for_all_documents: false,  // Document-specific
  allow_user_override: true,         // Users can choose
  login_mfa_grace_period_days: 30    // 30-day setup period
}
```

## 🛡️ Security Features

### **TOTP Implementation**
- **RFC 6238 Compliant**: Standard TOTP algorithm
- **30-second Time Window**: Industry standard
- **6-digit Codes**: Balance of security and usability
- **Replay Protection**: Prevents code reuse
- **Time Drift Tolerance**: ±1 window for clock differences

### **Backup & Recovery**
- **10 Backup Codes**: Single-use emergency codes
- **Admin Reset**: Emergency TOTP configuration reset
- **Temporary Exemptions**: Time-limited policy overrides
- **Audit Logging**: Complete trail of all security events

### **Data Protection**
- **Encrypted Secrets**: TOTP secrets encrypted at rest
- **Row Level Security**: Database-level access controls
- **Secure Sessions**: JWT-based authentication
- **HTTPS Only**: All TOTP operations over secure connections

## 📊 Compliance & Auditing

### **Audit Trail**
Every TOTP-related action is logged:
- TOTP setup and configuration changes
- Successful and failed verification attempts
- Admin actions and emergency access
- Policy changes and exemptions

### **Compliance Features**
- **SOC 2 Ready**: Comprehensive logging and controls
- **GDPR Compliant**: User data protection and deletion
- **Legal Signatures**: Enhanced signature validity with MFA
- **Retention Policies**: Configurable audit log retention

## 🚀 Deployment Guide

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Supabase project with admin access
- TOTP library dependencies installed

### **Installation Steps**

1. **Install Dependencies**
```bash
npm install otplib qrcode uuid
npm install --save-dev @types/qrcode
```

2. **Apply Database Migrations**
```bash
# Apply TOTP schema
psql -f database/migrations/add_zoho_oauth_support.sql

# Apply organization integration
psql -f database/migrations/add_organization_totp_policies.sql

# Apply corporate integration
psql -f database/migrations/integrate_corporate_with_organizations.sql
```

3. **Environment Variables**
```env
# Existing variables remain unchanged
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# No additional environment variables needed for TOTP
```

4. **Verify Installation**
- Check database tables created successfully
- Test TOTP setup flow in development
- Verify organization policies work correctly
- Run comprehensive test suite

### **Production Deployment**
1. **Database Migration**: Apply all migrations in order
2. **Feature Rollout**: Enable TOTP gradually by organization
3. **User Communication**: Notify users of new security features
4. **Admin Training**: Train administrators on policy management
5. **Monitoring**: Set up alerts for security events

## 🎉 Business Impact

### **Enhanced Security**
- **Cryptographic Authentication**: Stronger than passwords alone
- **Phishing Protection**: TOTP codes can't be reused
- **Compliance Ready**: Meets enterprise security requirements
- **Legal Validity**: Stronger signature authentication

### **Competitive Advantage**
- **Enterprise Features**: Professional-grade security controls
- **Differentiation**: Few signature platforms offer this level of security
- **Customer Trust**: Demonstrates commitment to security
- **Market Positioning**: Premium security-focused solution

### **User Benefits**
- **Choice & Control**: Users decide their security level
- **Familiar Experience**: Standard authenticator apps
- **Emergency Access**: Backup codes prevent lockouts
- **Seamless Integration**: Works with existing workflows

---

## 📞 Support & Troubleshooting

### **Common Issues**
- **Clock Sync**: Ensure device time is accurate
- **App Compatibility**: Use standard TOTP apps (Google Authenticator, Authy)
- **Backup Codes**: Keep backup codes secure and accessible
- **Organization Policies**: Contact admin for policy questions

### **Admin Support**
- **Emergency Access**: Use admin override for locked accounts
- **Policy Conflicts**: User settings vs organization requirements
- **Audit Questions**: Review security dashboard and logs
- **Integration Issues**: Check corporate domain mapping

**🎯 Your SignTusk platform now offers enterprise-grade authenticated document signing with comprehensive TOTP security! 🔐**
