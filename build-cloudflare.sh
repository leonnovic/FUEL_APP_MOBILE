#!/bin/sh
# Cloudflare Workers native CI – builds the React/Vite SPA before wrangler deploys.
# Called via [build].command in wrangler.toml.
set -e
cd frontend
ELECTRON_SKIP_BINARY_DOWNLOAD=1
ELECTRON_BUILDER_SKIP_PUBLISH=1
PUPPETEER_SKIP_DOWNLOAD=1
export ELECTRON_SKIP_BINARY_DOWNLOAD ELECTRON_BUILDER_SKIP_PUBLISH PUPPETEER_SKIP_DOWNLOAD
npm ci --legacy-peer-deps
npm run build
