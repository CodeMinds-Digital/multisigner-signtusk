#!/bin/bash

# Exit on any error
set -e

# Netlify build script for SignTusk
echo "🚀 Starting SignTusk build process..."

# Check if NPM_TOKEN is set
if [ -z "$NPM_TOKEN" ]; then
  echo "❌ NPM_TOKEN environment variable is not set"
  exit 1
fi

echo "✅ NPM_TOKEN is set"

# Create .npmrc with the actual token
echo "📝 Creating .npmrc with authentication..."
cat > .npmrc << EOF
@codeminds-digital:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
EOF

echo "✅ .npmrc created successfully"

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
