# 🔐 Zoho OneAuth Integration Guide for SignTusk

## Overview

SignTusk's TOTP system is fully compatible with **Zoho OneAuth** and can be enhanced with Zoho-specific configurations for better integration with your Zoho ecosystem.

## 🎯 Two Integration Levels

### **Level 1: Standard TOTP (Already Working)**
✅ **Current Status**: Your SignTusk platform already supports Zoho OneAuth  
✅ **How it works**: Users scan QR codes with Zoho OneAuth app  
✅ **No additional setup needed**: Works out of the box  

### **Level 2: Enhanced Zoho Integration (Optional)**
🆕 **Enhanced Features**: Direct Zoho OAuth integration  
🆕 **Single Sign-On**: Login with Zoho credentials  
🆕 **Unified Experience**: Seamless Zoho ecosystem integration  

---

## 🚀 Quick Start (Level 1 - Already Working)

Your users can **immediately** start using Zoho OneAuth:

1. **User goes to**: Settings → Security → Enable TOTP
2. **Scans QR code** with Zoho OneAuth app
3. **Enters verification code** to confirm setup
4. **Done!** - Zoho OneAuth is now protecting their account

**No additional configuration needed!** ✅

---

## 🔧 Enhanced Zoho Integration Setup (Level 2)

If you want deeper Zoho integration, follow these steps:

### **Step 1: Get Zoho OAuth Credentials**

1. **Go to Zoho API Console**: https://api-console.zoho.com/
2. **Create a new application**:
   - Application Name: `SignTusk TOTP Integration`
   - Application Type: `Web Application`
   - Homepage URL: `http://192.168.1.2:3001`
   - Authorized Redirect URIs: `http://192.168.1.2:3001/api/auth/zoho/callback`

3. **Get your credentials**:
   - Client ID
   - Client Secret

### **Step 2: Update Environment Variables**

Your `.env.local` file has been updated with the configuration template:

```bash
# ===================================
# ZOHO ONEAUTH TOTP CONFIGURATION
# ===================================

# TOTP Service Configuration
TOTP_SERVICE_NAME=SignTusk
TOTP_ISSUER=CodeMinds Digital

# Zoho OneAuth Integration (Optional - for enhanced features)
ZOHO_CLIENT_ID=your_zoho_client_id_here          # ← Replace with your Client ID
ZOHO_CLIENT_SECRET=your_zoho_client_secret_here  # ← Replace with your Client Secret
ZOHO_REDIRECT_URI=http://192.168.1.2:3001/api/auth/zoho/callback

# Zoho OneAuth API URLs (Default values - usually don't need to change)
ZOHO_AUTH_URL=https://accounts.zoho.com/oauth/v2/auth
ZOHO_TOKEN_URL=https://accounts.zoho.com/oauth/v2/token
ZOHO_USER_INFO_URL=https://accounts.zoho.com/oauth/user/info

# TOTP Configuration
TOTP_WINDOW_TOLERANCE=1
TOTP_BACKUP_CODES_COUNT=10
```

### **Step 3: Replace Placeholder Values**

Update these specific values in your `.env.local`:

```bash
# Replace these with your actual Zoho credentials:
ZOHO_CLIENT_ID=1000.ABC123XYZ789.DEF456UVW012
ZOHO_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901
```

### **Step 4: Restart Your Application**

```bash
npm run dev
```

---

## 🎨 User Experience with Zoho OneAuth

### **Standard TOTP Flow (Level 1)**
```
1. User: Settings → Security → Enable TOTP
2. System: Shows QR code
3. User: Opens Zoho OneAuth → Scan QR code
4. User: Enters 6-digit code from Zoho OneAuth
5. System: TOTP enabled ✅
```

### **Enhanced Zoho Flow (Level 2)**
```
1. User: Login → "Login with Zoho"
2. System: Redirects to Zoho OAuth
3. User: Authorizes with Zoho credentials
4. System: Auto-creates account with Zoho profile
5. User: Can still enable TOTP for additional security
```

---

## 🔍 Configuration Locations

### **1. Environment Variables**
**File**: `.env.local`  
**Purpose**: Store Zoho OAuth credentials securely  
**Status**: ✅ Already configured with template  

### **2. TOTP Service Configuration**
**File**: `src/lib/totp-service.ts`  
**Purpose**: Core TOTP functionality  
**Status**: ✅ Already supports Zoho OneAuth  

### **3. Zoho OAuth Integration**
**File**: `src/lib/sso-service.ts`  
**Purpose**: Enhanced Zoho integration  
**Status**: ✅ Ready for your credentials  

### **4. User Interface**
**Files**: 
- `src/components/features/settings/totp-settings.tsx`
- `src/components/features/auth/totp-verification-popup.tsx`  
**Purpose**: User-facing TOTP interfaces  
**Status**: ✅ Already mentions Zoho OneAuth  

---

## 🛡️ Security Features

### **TOTP Security (Both Levels)**
- ✅ **RFC 6238 Compliant**: Industry standard TOTP
- ✅ **30-second Time Window**: Standard security interval
- ✅ **6-digit Codes**: Balance of security and usability
- ✅ **Backup Codes**: Emergency access (10 single-use codes)
- ✅ **Replay Protection**: Prevents code reuse

### **Enhanced Security (Level 2)**
- ✅ **OAuth 2.0**: Secure Zoho authentication
- ✅ **State Parameter**: CSRF protection
- ✅ **Secure Cookies**: HttpOnly, Secure, SameSite
- ✅ **Token Rotation**: Refresh token security

---

## 🎯 Recommended Setup for CodeMinds Digital

### **For Development/Testing**
```bash
# Use Level 1 (Standard TOTP)
# No additional setup needed
# Users can immediately use Zoho OneAuth
```

### **For Production**
```bash
# Use Level 2 (Enhanced Integration)
# Get Zoho OAuth credentials
# Update production environment variables
# Enable "Login with Zoho" button
```

---

## 🚀 Current Status

### **✅ What's Already Working**
- TOTP authentication with Zoho OneAuth app
- QR code generation for easy setup
- Backup codes for emergency access
- Login and signing flow integration
- Organization-level TOTP policies

### **🔧 What You Can Add (Optional)**
- Zoho OAuth login integration
- Automatic account creation from Zoho profiles
- Enhanced user experience for Zoho users

---

## 📞 Quick Help

### **For Standard TOTP (Recommended)**
1. **No setup needed** - it already works!
2. **Test it**: Go to Settings → Security → Enable TOTP
3. **Use Zoho OneAuth app** to scan the QR code

### **For Enhanced Integration**
1. **Get Zoho credentials** from https://api-console.zoho.com/
2. **Update `.env.local`** with your Client ID and Secret
3. **Restart the app** with `npm run dev`

### **Need Help?**
- **Standard TOTP**: Already working, no help needed! 🎉
- **Enhanced Integration**: Follow the Zoho API Console setup guide
- **Issues**: Check the console logs for OAuth errors

---

**🎯 Bottom Line**: Your SignTusk platform already supports Zoho OneAuth perfectly! Users can start using it immediately. The enhanced integration is optional for deeper Zoho ecosystem integration.**
