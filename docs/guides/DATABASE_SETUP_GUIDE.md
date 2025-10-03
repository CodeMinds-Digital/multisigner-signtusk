# SignTusk Database Setup Guide

## 🚀 Complete Database Schema Setup

This guide will help you set up the complete SignTusk database schema with all required tables for both the public application and admin panel.

## 📋 What's Included

The `SUPABASE_SETUP.sql` file contains everything needed for a complete SignTusk deployment:

### **Core Application Tables**
- ✅ **user_profiles** - Extended user data and subscription info
- ✅ **documents** - Document management and tracking
- ✅ **document_signatures** - Individual signature tracking
- ✅ **document_templates** - Reusable document templates

### **Admin Panel Tables**
- ✅ **admin_users** - Admin authentication (separate from regular users)
- ✅ **admin_activity_logs** - Complete audit trail
- ✅ **system_config** - Admin-managed system settings
- ✅ **api_keys** - Secure API key management
- ✅ **email_logs** - Email delivery tracking
- ✅ **system_metrics** - Performance monitoring

### **Subscription System**
- ✅ **subscription_plans** - Plan definitions (Free, Basic, Pro, Enterprise)
- ✅ **user_subscriptions** - User subscription tracking
- ✅ **payment_history** - Transaction history

### **Security & Performance**
- ✅ **Row Level Security (RLS)** - Proper data isolation
- ✅ **Storage Policies** - Secure file access
- ✅ **Indexes** - Optimized performance
- ✅ **Functions & Triggers** - Automated workflows

## 🛠️ Setup Instructions

### **Step 1: Access Supabase SQL Editor**
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `ggwfrlufsaczhiigwbhl`
3. Navigate to **SQL Editor** in the left sidebar

### **Step 2: Run the Setup Script**
1. Open the `SUPABASE_SETUP.sql` file
2. Copy the entire contents (all 1000+ lines)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** to execute the script

### **Step 3: Verify Setup**
The script will automatically verify that all tables were created and show a success message with setup summary.

## 📊 Default Data Included

### **Subscription Plans**
- **Free Plan**: 5 documents/month, 100MB storage
- **Basic Plan**: 50 documents/month, 1GB storage ($9.99/month)
- **Pro Plan**: 200 documents/month, 5GB storage ($29.99/month)
- **Enterprise Plan**: Unlimited everything ($99.99/month)

### **Admin Users**
- **admin@signtusk.com** / admin123! (Super Admin)
- **support@signtusk.com** / admin123! (Support)
- **auditor@signtusk.com** / admin123! (Auditor)

### **Document Templates**
- Basic NDA template
- Service Agreement template
- Employment Contract template

### **System Configuration**
- Default app settings
- Email configuration
- File upload limits
- Signature reminder settings

## 🔧 Post-Setup Configuration

### **1. Update Environment Variables**
Make sure your `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ggwfrlufsaczhiigwbhl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
RESEND_API_KEY=re_G5BSo85p_4JikZvdpos8qJaM8cqbtAxXS
```

### **2. Test Admin Panel**
1. Go to: http://localhost:3000/admin/login
2. Login with: admin@signtusk.com / admin123!
3. Verify all tabs work (Overview, Users, Documents, etc.)

### **3. Test Public Application**
1. Go to: http://localhost:3000
2. Sign up for a new account
3. Upload a test document
4. Verify it appears in admin panel

## 🔒 Security Notes

### **⚠️ IMPORTANT: Change Default Passwords**
The setup includes default admin passwords for testing. **Change these immediately in production:**

```sql
-- Update admin passwords (run in SQL Editor)
UPDATE public.admin_users 
SET password_hash = crypt('your_new_password', gen_salt('bf'))
WHERE email = 'admin@signtusk.com';
```

### **🛡️ Row Level Security**
All tables have RLS enabled with proper policies:
- Users can only access their own data
- Admins have elevated access to system data
- Signers can access their signature records
- Public templates are accessible to all

## 📈 Monitoring & Maintenance

### **System Health Checks**
The setup includes utility functions for monitoring:
- `get_system_stats()` - Get system statistics
- `cleanup_expired_documents()` - Clean up expired documents
- `send_signature_reminders()` - Send reminder emails

### **Admin Panel Features**
- Real-time system statistics
- User management and analytics
- Document tracking and completion rates
- Email delivery monitoring
- API key management
- System configuration

## 🚨 Troubleshooting

### **Common Issues**

**1. Permission Errors**
- Ensure you're running the script as the project owner
- Check that RLS policies are properly configured

**2. Missing Tables**
- The script includes verification - check the output messages
- Re-run the script if any tables are missing

**3. Admin Login Issues**
- Verify admin users were created: `SELECT * FROM public.admin_users;`
- Check that passwords are properly hashed

**4. Storage Issues**
- Verify storage buckets were created
- Check storage policies are in place

### **Verification Queries**

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check admin users
SELECT email, role, is_active FROM public.admin_users;

-- Check subscription plans
SELECT name, display_name, price_monthly FROM public.subscription_plans;

-- Check system config
SELECT key, value FROM public.system_config ORDER BY key;
```

## ✅ Success Checklist

- [ ] All tables created successfully
- [ ] Storage buckets configured
- [ ] RLS policies enabled
- [ ] Admin users created
- [ ] Subscription plans loaded
- [ ] System config initialized
- [ ] Admin panel login works
- [ ] Public app signup works
- [ ] Document upload works
- [ ] Email service configured

## 🎉 You're Ready!

Once the setup is complete, you'll have a fully functional SignTusk deployment with:
- Complete document signature workflow
- Professional admin panel
- Subscription management
- Email notifications
- Secure file storage
- Performance monitoring

Your SignTusk application is now ready for production use! 🚀
