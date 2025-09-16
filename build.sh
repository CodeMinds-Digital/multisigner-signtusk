#!/bin/bash

# Exit on any error
set -e

# Netlify build script for SignTusk
echo "🚀 Starting SignTusk build process..."

# Debug environment
echo "🔍 Environment debug info:"
echo "NODE_VERSION: ${NODE_VERSION:-not set}"
echo "PWD: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if NPM_TOKEN is set
if [ -z "$NPM_TOKEN" ]; then
  echo "❌ NPM_TOKEN environment variable is not set"
  exit 1
fi

echo "✅ NPM_TOKEN is set (length: ${#NPM_TOKEN})"

# Create .npmrc with the actual token
echo "📝 Creating .npmrc with authentication..."
cat > .npmrc << EOF
@codeminds-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
EOF

echo "✅ .npmrc created successfully"

# Debug: Check tsconfig.json paths
echo "🔍 Checking tsconfig.json paths..."
grep -A 5 '"paths"' tsconfig.json || echo "No paths found in tsconfig.json"

# Install dependencies
echo "📦 Installing dependencies..."
if ! npm ci; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

# Build the application
echo "🔨 Building application..."
if ! npm run build; then
  echo "❌ Build failed"
  exit 1
fi

echo "🎉 Build completed successfully!"
