#!/bin/sh
# Cloudflare Workers build script
set -e
cd frontend
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export ELECTRON_BUILDER_SKIP_PUBLISH=1
export PUPPETEER_SKIP_DOWNLOAD=1
npm ci --legacy-peer-deps
npm run build
