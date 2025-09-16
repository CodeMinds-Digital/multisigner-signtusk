#!/bin/bash

# Netlify build script for SignTusk
echo "🚀 Starting SignTusk build process..."

# Check Node.js version
echo "📋 Node.js version: $(node --version)"
echo "📋 NPM version: $(npm --version)"

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

# Clean any existing build artifacts
echo "🧹 Cleaning previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

echo "🎉 Build completed successfully!"
