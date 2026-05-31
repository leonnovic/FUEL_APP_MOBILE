#!/usr/bin/env bash
# Commit and push all fixes to GitHub.
# This triggers Vercel redeploy + Cloudflare Workers rebuild automatically.
#
# Usage:  bash /tmp/fuelapp_live/push.sh <YOUR_GITHUB_TOKEN>
# Token:  https://github.com/settings/tokens → New token (classic) → check "repo"
set -e

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo ""; echo "ERROR: GitHub token required."
  echo "Usage:  bash /tmp/fuelapp_live/push.sh <TOKEN>"
  echo "Create: https://github.com/settings/tokens (repo scope)"; echo ""
  exit 1
fi

REPO_DIR="/tmp/fuelapp_live"
cd "$REPO_DIR"

echo "Authenticating..."
git remote set-url origin "https://leonnovic:${TOKEN}@github.com/leonnovic/FUEL_APP_MOBILE"

NFILES=$(git --no-optional-locks diff --cached --name-only | wc -l | tr -d ' ')
echo "Committing ${NFILES} files..."

git -c user.name="leon_novic" \
    -c user.email="68344954+leonnovic@users.noreply.github.com" \
    commit -m "fix: Cloudflare Worker entry point + VITE_ env vars + CI checks

Cloudflare Workers (fixes instant pre-flight failure on every push since May 30):
- Create frontend/src/worker/index.ts — minimal Worker that proxies all
  requests to ASSETS binding; Cloudflare Worker Services require a 'main'
  script — without it, pre-flight validation rejects the build in 0 seconds
  before the build command ever runs
- Update wrangler.jsonc: add 'main' field, SPA not_found_handling, better
  build command with --legacy-peer-deps + ELECTRON_BUILDER_SKIP_PUBLISH=1
- Update frontend/wrangler.json: fix assets path, remove broken D1/R2
  bindings that referenced non-existent database/bucket IDs

Vercel / API runtime (fixes all API calls silently 404ing in production):
- Fix REACT_APP_BACKEND_URL → VITE_REACT_APP_BACKEND_URL in 22 files;
  Vite only exposes VITE_-prefixed vars at build time — without the prefix
  the value is always undefined and every API call falls back to
  window.location.origin (the Vercel domain has no backend) → 404 on all /api/
- Update frontend/.env.example to document VITE_REACT_APP_BACKEND_URL

Build reliability:
- Add frontend/.npmrc: ELECTRON_SKIP_BINARY_DOWNLOAD=1,
  ELECTRON_BUILDER_SKIP_PUBLISH=1, legacy-peer-deps=true — ensures any
  CI environment installs deps without electron binary download failures

GitHub Actions CI:
- Add .github/workflows/frontend-ci.yml: TypeScript + Vite build on every
  push/PR touching frontend/; runs on Node 20; uploads dist artifact
- Add .github/workflows/cloudflare-worker-ci.yml: verifies worker entry
  point exists, validates wrangler.jsonc has all required fields (name, main,
  assets, build), TypeScript check — prevents recurrence of worker failures"

echo "Pushing..."
git push origin main

echo ""
git remote set-url origin "https://github.com/leonnovic/FUEL_APP_MOBILE"

echo "========================================================"
echo "✅  Pushed!  Three deploys will now run automatically:"
echo "   1. Cloudflare Workers (fuelappmobile) — should now PASS"
echo "   2. Vercel — should PASS"
echo "   3. GitHub Actions: frontend-ci + cloudflare-worker-ci"
echo "========================================================"
echo ""
echo "ACTION REQUIRED — set backend URL in both dashboards:"
echo "   Variable: VITE_REACT_APP_BACKEND_URL"
echo "   Value:    https://<your-fastapi-backend-domain>"
echo ""
echo "   Vercel:     Project Settings → Environment Variables"
echo "   Cloudflare: Workers → fuelappmobile → Settings → Variables"
echo ""
