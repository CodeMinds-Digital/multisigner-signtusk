#!/bin/bash
set -euo pipefail

echo "🚀 Starting SignTusk build process..."

# 1. Check if NPM_TOKEN is set
if [ -z "${NPM_TOKEN:-}" ]; then
  echo "❌ NPM_TOKEN environment variable is not set"
  exit 1
fi

# 2. Create .npmrc for GitHub Packages
echo "📝 Writing .npmrc..."
cat > .npmrc << EOF
@codeminds-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
registry=https://registry.npmjs.org/
EOF

# 3. Install dependencies
echo "📦 Installing dependencies..."
if npm ci; then
  echo "✅ npm ci completed successfully"
else
  echo "⚠️ npm ci failed — falling back to npm install"
  npm install
fi

# 4. Run Next.js build
echo "🏗 Running build..."
# Disable CI mode to prevent ESLint warnings from being treated as errors
CI=false npm run build

echo "✅ Build completed successfully!"
