#!/usr/bin/env bash
# Render build script for Puppeteer/whatsapp-web.js
# This ensures Chrome is installed in a persistent location

set -o errexit

echo "=== Eden Build Script for Render ==="

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

# Install Puppeteer Chrome to a persistent cache location
# Render's /opt/render/.cache is preserved between deploys
echo "Installing Puppeteer Chrome..."
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR
npx puppeteer browsers install chrome

echo "=== Build complete ==="
