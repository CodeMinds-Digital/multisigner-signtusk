# Fix: Build Error - Cannot Find Module './chunks/vendor-chunks/next.js'

## Problem

When running `npm run build`, the build process failed with this error:

```
✓ Linting and checking validity of types 
unhandledRejection [Error: Cannot find module './chunks/vendor-chunks/next.js'
Require stack:
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/.next/server/webpack-runtime.js
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/.next/server/pages/_document.js
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/node_modules/next/dist/server/require.js
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/node_modules/next/dist/server/load-components.js
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/node_modules/next/dist/build/utils.js
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/node_modules/next/dist/build/worker.js
- /Users/naveenselvam/Desktop/ai_pair_programming/multisigner-signtusk/node_modules/next/dist/compiled/jest-worker/processChild.js] {
  type: 'Error',
  code: 'MODULE_NOT_FOUND',
  requireStack: [Array]
}
```

## Root Cause

This error is caused by **corrupted Next.js build cache**. It typically happens when:

1. **Incomplete previous build**: A previous build was interrupted or failed partway through
2. **Cache corruption**: The `.next` directory has stale or corrupted files
3. **Module resolution issues**: Webpack chunks are referencing files that don't exist
4. **Node modules cache**: The `node_modules/.cache` directory has outdated data

### Why This Happens:

Next.js uses a sophisticated caching system to speed up builds:
- Stores compiled chunks in `.next/cache`
- Stores webpack runtime in `.next/server`
- Stores module metadata in `node_modules/.cache`

When these caches get out of sync (due to code changes, interrupted builds, or file system issues), the build process can't find the modules it expects.

## Solution

Clean all caches and rebuild from scratch:

```bash
rm -rf .next && rm -rf node_modules/.cache && npm run build
```

### What This Does:

1. **`rm -rf .next`**: Removes the entire Next.js build output directory
   - Deletes all compiled pages
   - Deletes all webpack chunks
   - Deletes all server-side bundles
   - Forces a complete rebuild

2. **`rm -rf node_modules/.cache`**: Removes Node.js module cache
   - Deletes Babel cache
   - Deletes Webpack cache
   - Deletes other build tool caches
   - Forces fresh compilation

3. **`npm run build`**: Runs a fresh build
   - Compiles all pages from scratch
   - Generates new webpack chunks
   - Creates new server bundles
   - Rebuilds all caches

## Build Result

After cleaning caches, the build completed successfully:

```
✓ Linting and checking validity of types
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (48/48)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                                       Size     First Load JS
┌ ○ /                                             5.42 kB        109 kB
├ ○ /_not-found                                   871 B          104 kB
├ ○ /access-request                               4.25 kB        115 kB
├ ○ /admin                                        4.25 kB        115 kB
├ ○ /dashboard                                    17.5 kB        178 kB
├ ○ /drive                                        17.5 kB        178 kB
├ ○ /editor                                       168 B          2.05 MB
├ ○ /settings/corporate                           8.57 kB        163 kB
├ ○ /settings/documents                           10.7 kB        157 kB
├ ○ /settings/users                               8.13 kB        162 kB
├ ƒ /signup                                       8.89 kB        154 kB
├ ƒ /verify-email                                 5.09 kB        158 kB
└ ... (48 total routes)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

First Load JS shared by all: 103 kB
```

**Total Routes**: 48
**Build Status**: ✅ SUCCESS

## Prevention

To avoid this issue in the future:

### 1. Clean Build Script

Add a clean build script to `package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "build:clean": "rm -rf .next && rm -rf node_modules/.cache && next build"
  }
}
```

Usage:
```bash
npm run build:clean
```

### 2. Regular Cache Cleaning

Clean caches periodically, especially:
- After major code changes
- After updating dependencies
- After switching branches
- When build errors occur

### 3. Git Ignore

Ensure `.next` and `node_modules/.cache` are in `.gitignore`:

```gitignore
# Next.js
.next/
out/

# Cache
node_modules/.cache/
.cache/
```

### 4. CI/CD Best Practices

In CI/CD pipelines:
- Always start with a clean slate
- Don't cache `.next` directory between builds
- Use fresh `node_modules` or cache them properly

## Common Scenarios

### Scenario 1: After Git Pull
```bash
git pull
rm -rf .next
npm run build
```

### Scenario 2: After Dependency Update
```bash
npm install
rm -rf .next && rm -rf node_modules/.cache
npm run build
```

### Scenario 3: After Branch Switch
```bash
git checkout main
rm -rf .next
npm run build
```

### Scenario 4: Build Interrupted
If a build is interrupted (Ctrl+C):
```bash
rm -rf .next && rm -rf node_modules/.cache
npm run build
```

## Alternative Solutions

If cleaning caches doesn't work, try these in order:

### 1. Clean Install
```bash
rm -rf node_modules
rm -rf .next
rm -rf node_modules/.cache
npm install
npm run build
```

### 2. Clear NPM Cache
```bash
npm cache clean --force
rm -rf node_modules
rm -rf .next
npm install
npm run build
```

### 3. Update Next.js
```bash
npm update next react react-dom
rm -rf .next
npm run build
```

### 4. Check Node Version
Ensure you're using a compatible Node.js version:
```bash
node --version  # Should be 18.x or higher for Next.js 15
```

## Related Issues

This error is similar to:
- `MODULE_NOT_FOUND` errors
- `Cannot find module` errors
- Webpack chunk loading errors
- Build cache corruption errors

All typically resolved by cleaning caches.

## Summary

✅ **Problem**: Build failed with MODULE_NOT_FOUND error
✅ **Cause**: Corrupted Next.js build cache
✅ **Solution**: Clean `.next` and `node_modules/.cache` directories
✅ **Result**: Build completed successfully with 48 routes
✅ **Prevention**: Use clean build script and clean caches regularly

**Quick Fix Command:**
```bash
rm -rf .next && rm -rf node_modules/.cache && npm run build
```

This should be the first thing to try when encountering build errors in Next.js!

