#!/bin/bash

# Static build script for SignTusk (fallback)
echo "🚀 Starting SignTusk static build process..."

# Check if NPM_TOKEN is set
if [ -z "$NPM_TOKEN" ]; then
  echo "❌ NPM_TOKEN environment variable is not set"
  exit 1
fi

# Create .npmrc with the actual token
cat > .npmrc << EOF
@codeminds-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
EOF

# Install dependencies
npm ci

# Build and export static files
npm run build && npm run export
