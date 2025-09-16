# 🚀 Netlify Deployment Guide for SignTusk

## ✅ **Primary Configuration (Recommended)**

Use the main `netlify.toml` configuration with the Next.js plugin:

```toml
[build]
  command = "./build.sh"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--production=false"
  NPM_CONFIG_LEGACY_PEER_DEPS = "true"
  NEXT_TELEMETRY_DISABLED = "1"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## 🔧 **Fixes Applied**

### 1. **Node.js Version**
- ✅ Updated from Node.js 18 to Node.js 20
- ✅ Added `.nvmrc` file for consistency

### 2. **Build Configuration**
- ✅ Simplified build script (`build.sh`)
- ✅ Removed `output: 'standalone'` from Next.js config
- ✅ Added Netlify Next.js plugin

### 3. **Document Status System**
- ✅ Unified status types to prevent "Unknown document status" errors
- ✅ Extended `DOCUMENT_STATUS_CONFIG` to handle all statuses

## 🆘 **Fallback Configuration**

If the Next.js plugin fails, use the static export approach:

1. **Rename files:**
   ```bash
   mv netlify.toml netlify-nextjs.toml
   mv netlify-static.toml netlify.toml
   ```

2. **Update Next.js config for static export:**
   ```typescript
   const nextConfig: NextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true
     },
     // ... rest of config
   }
   ```

## 🐛 **Troubleshooting**

### Error: "Html should not be imported outside of pages/_document"
- ✅ **Fixed**: Removed unused `@react-email/render` dependency
- ✅ **Root Cause**: The `@react-email/render` package was causing conflicts during static generation
- ✅ **Solution**: Removed the dependency since it wasn't being used in the codebase

### Error: "Your publish directory does not contain expected Next.js build output"
- ✅ **Solution**: Removed `output: 'standalone'` from Next.js config
- ✅ **Solution**: Simplified build script
- ✅ **Verification**: Build produces standard `.next` directory structure

### Error: "Unknown document status: ready"
- ✅ **Fixed**: Extended status configuration to handle all possible statuses
- ✅ **Updated**: `ExtendedDocumentStatus` type includes all statuses

## 📋 **Deployment Checklist**

- [ ] Node.js 20 specified in `netlify.toml`
- [ ] `NPM_TOKEN` environment variable set in Netlify
- [ ] Build script is executable (`chmod +x build.sh`)
- [ ] `.next` directory is generated after build
- [ ] No TypeScript compilation errors
- [ ] All document statuses are properly configured

## 🔍 **Verification Steps**

1. **Local build test:**
   ```bash
   npm run build
   ls -la .next/  # Should show build artifacts
   ```

2. **Check build output:**
   - ✅ `.next/BUILD_ID` exists
   - ✅ `.next/server/` directory exists
   - ✅ Static pages generated successfully

## 📞 **Support**

If deployment still fails:
1. Check Netlify build logs for specific error messages
2. Verify all environment variables are set
3. Try the fallback static configuration
4. Contact support with specific error details
