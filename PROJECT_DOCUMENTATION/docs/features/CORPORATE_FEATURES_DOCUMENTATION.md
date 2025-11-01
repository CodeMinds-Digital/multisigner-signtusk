# SignTusk Corporate Enhancement Documentation

## Overview

The SignTusk platform has been enhanced with comprehensive corporate account support, including advanced email domain validation, corporate-specific fields, and industry-standard signup flows. This documentation covers all the new features and implementation details.

## 🏢 Corporate Features

### 1. Corporate Email Validation

**Purpose**: Ensures corporate accounts use legitimate business email addresses by blocking personal email domains.

**Blocked Personal Domains**:
- Gmail (gmail.com)
- Yahoo (yahoo.com, ymail.com, rocketmail.com)
- Microsoft (hotmail.com, outlook.com, live.com, msn.com)
- Apple (icloud.com, me.com, mac.com)
- Other popular personal domains (aol.com, protonmail.com, tutanota.com, etc.)
- Indian personal domains (rediffmail.com, indiatimes.com, sify.com, vsnl.net)

**Validation Rules**:
- Domain must be at least 4 characters long
- Must contain at least one dot (.)
- Cannot start or end with dot or hyphen
- Must not be in the blocked personal domains list

### 2. Enhanced Database Schema

**New Fields in `user_profiles` Table**:
```sql
-- Personal Information
first_name TEXT
last_name TEXT
full_name TEXT (computed from first + last)

-- Corporate Information
company_name TEXT
company_domain TEXT (extracted from email)
industry_field TEXT
employee_count INTEGER
job_title TEXT
department TEXT
phone_number TEXT

-- Account Management
account_type TEXT ('personal' | 'corporate')
email_verified BOOLEAN
company_verified BOOLEAN
onboarding_completed BOOLEAN
```

### 3. Corporate Signup Flow

**Step 1: Account Type Selection**
- User chooses between Personal or Corporate account
- Visual icons and descriptions for each type
- Responsive design for mobile and desktop

**Step 2: Form Completion**
- **Personal Account**: First name, last name, email, password
- **Corporate Account**: All personal fields plus:
  - Company name (required)
  - Corporate email (validated against personal domains)
  - Industry field (dropdown selection)
  - Employee count (company size ranges)
  - Job title (optional)
  - Department (optional)
  - Phone number (optional)

**Real-time Validation**:
- Email domain validation as user types
- Form field validation with error messages
- Visual feedback for invalid inputs

## 🔧 Technical Implementation

### Database Functions

#### `extract_email_domain(email_address TEXT)`
Extracts the domain portion from an email address.
```sql
SELECT extract_email_domain('user@company.com'); -- Returns: company.com
```

#### `is_valid_corporate_domain(domain TEXT)`
Validates if a domain is acceptable for corporate accounts.
```sql
SELECT is_valid_corporate_domain('company.com'); -- Returns: true
SELECT is_valid_corporate_domain('gmail.com');   -- Returns: false
```

#### `validate_corporate_signup(email, company_name, first_name, last_name)`
Comprehensive validation for corporate signup data.
```sql
SELECT validate_corporate_signup(
  'user@company.com',
  'Acme Corp',
  'John',
  'Doe'
);
-- Returns: JSON with validation results
```

#### `update_user_corporate_profile(user_id, ...)`
Updates corporate-specific profile information.

### Frontend Components

#### Enhanced Signup Form (`signup-form.tsx`)
- Two-step signup process
- Real-time email validation
- Corporate-specific form fields
- Comprehensive error handling
- Responsive design

#### Updated Auth Types (`auth.ts`)
- Extended User interface with corporate fields
- CorporateValidationResult interface
- Enhanced SignUpData interface
- CorporateSignUpData interface

#### Enhanced Auth Hook (`use-auth.ts`)
- `validateCorporateSignup()` - Server-side validation
- `updateCorporateProfile()` - Profile updates
- `isOnboardingComplete()` - Onboarding status check

## 🚀 Usage Examples

### Corporate Signup Validation

```typescript
import { useAuth } from '@/hooks/use-auth'

const { validateCorporateSignup } = useAuth()

const handleCorporateSignup = async () => {
  const validation = await validateCorporateSignup(
    'user@company.com',
    'Acme Corporation',
    'John',
    'Doe'
  )
  
  if (!validation.valid) {
    console.log('Validation errors:', validation.errors)
    return
  }
  
  // Proceed with signup
}
```

### Update Corporate Profile

```typescript
const { updateCorporateProfile } = useAuth()

const updateProfile = async () => {
  await updateCorporateProfile(userId, {
    companyName: 'Updated Company Name',
    industryField: 'Technology',
    employeeCount: 150,
    jobTitle: 'Senior Developer',
    department: 'Engineering',
    phoneNumber: '+1-555-0123'
  })
}
```

### Check Onboarding Status

```typescript
const { user, isOnboardingComplete } = useAuth()

if (!isOnboardingComplete(user)) {
  // Redirect to onboarding completion
  router.push('/complete-profile')
}
```

## 🔒 Security Features

### Row Level Security (RLS)
- Users can only access their own profile data
- Corporate validation functions are security definer
- Proper permission grants for authenticated users

### Email Domain Validation
- Server-side validation prevents bypass attempts
- Comprehensive list of blocked personal domains
- Domain format validation

### Data Integrity
- Required field validation
- Type checking for numeric fields
- Proper error handling and user feedback

## 📊 Industry Standards Compliance

### Corporate Account Requirements
- **Company Information**: Name, domain, industry
- **Employee Details**: Job title, department, contact info
- **Verification**: Email and company verification status
- **Onboarding**: Completion tracking for compliance

### Data Collection Standards
- Minimal required fields for quick signup
- Optional fields for enhanced profiles
- Industry-standard company size ranges
- Common industry field options

## 🎨 User Experience

### Visual Design
- Consistent with existing SignTusk branding
- Clear visual distinction between account types
- Intuitive form progression
- Responsive mobile-first design

### Error Handling
- Real-time validation feedback
- Clear, actionable error messages
- Visual indicators for field status
- Graceful degradation for validation failures

### Accessibility
- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- High contrast error states

## 🔄 Migration Guide

### Database Migration
1. Run the base setup: `SUPABASE_SETUP.sql`
2. Apply corporate enhancements: `CORPORATE_ENHANCEMENT.sql`
3. Verify all functions and triggers are active

### Frontend Updates
1. Update auth types to use new field names
2. Implement corporate validation in forms
3. Update user profile displays
4. Test all authentication flows

### Testing Checklist
- [ ] Personal account signup works
- [ ] Corporate account signup validates email domains
- [ ] Personal email domains are properly blocked
- [ ] Corporate fields are saved correctly
- [ ] Profile updates work for both account types
- [ ] Onboarding completion detection works
- [ ] RLS policies prevent unauthorized access

## 🐛 Troubleshooting

### Common Issues

**Corporate Email Validation Not Working**
- Verify `CORPORATE_ENHANCEMENT.sql` has been run
- Check that validation functions exist in database
- Ensure proper permissions are granted

**Personal Domains Not Blocked**
- Verify the personal domains list in validation function
- Check that frontend validation matches backend rules
- Test with various personal email providers

**Profile Data Not Saving**
- Check RLS policies allow user updates
- Verify field names match database schema
- Ensure user is properly authenticated

**Onboarding Status Incorrect**
- Verify all required fields are populated
- Check account type is set correctly
- Ensure email verification status is updated

## 📈 Future Enhancements

### Planned Features
- Company verification process
- Bulk user management for corporate accounts
- Advanced corporate analytics
- Integration with corporate SSO providers
- Custom branding for corporate accounts

### Scalability Considerations
- Database indexing for corporate domain lookups
- Caching for validation results
- Rate limiting for validation endpoints
- Monitoring for validation performance

## 📞 Support

For technical support or questions about corporate features:
1. Check this documentation first
2. Review the SQL migration files
3. Test with the provided examples
4. Check browser console for validation errors

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Compatibility**: SignTusk Next.js v1.0+, Supabase v2.0+