#!/bin/bash

# Test build script for SignTusk (without NPM_TOKEN requirement)
echo "🚀 Starting SignTusk test build process..."

# Skip NPM_TOKEN check for local testing
echo "⚠️  Skipping NPM_TOKEN check for local testing"

# Install dependencies and build
npm ci && npm run build
