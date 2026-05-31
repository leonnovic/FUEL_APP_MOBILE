#!/usr/bin/env bash
# Commit and push all fixes to GitHub → triggers Vercel + Cloudflare redeploy
# Usage:  bash /tmp/fuelapp_live/push.sh <YOUR_GITHUB_TOKEN>
# Token:  https://github.com/settings/tokens  (check 'repo' scope)
set -e

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo ""
  echo "ERROR: GitHub token required."
  echo "Usage:  bash /tmp/fuelapp_live/push.sh <TOKEN>"
  echo "Create: https://github.com/settings/tokens  (check 'repo' scope)"
  echo ""
  exit 1
fi

REPO_DIR="/tmp/fuelapp_live"
cd "$REPO_DIR"

echo "Setting authenticated remote..."
git remote set-url origin "https://leonnovic:${TOKEN}@github.com/leonnovic/FUEL_APP_MOBILE"

echo "Committing $(git --no-optional-locks diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ') staged files..."
git -c user.name="leon_novic" \
    -c user.email="68344954+leonnovic@users.noreply.github.com" \
    commit -m "fix: Cloudflare Workers main entry + VITE_ env vars + CI workflow

Cloudflare Workers (fixes instant pre-flight failure on every commit):
- Create frontend/src/worker/index.ts — minimal Worker that proxies all
  requests to ASSETS binding; this is the missing 'main' that Cloudflare
  requires for Worker Services (without it the build rejects in 0s)
- Update wrangler.jsonc: add main field, SPA not_found_handling, improved
  build command with --legacy-peer-deps + ELECTRON_BUILDER_SKIP_PUBLISH=1
- Update frontend/wrangler.json: fix assets path, remove broken D1/R2
  bindings that referenced non-existent resources

Vercel / runtime API (fixes all API calls silently 404ing in production):
- Fix REACT_APP_BACKEND_URL → VITE_REACT_APP_BACKEND_URL in 22 files;
  Vite only exposes VITE_-prefixed vars at build time — without the prefix
  the env var is always undefined and every API call falls back to
  window.location.origin (the Vercel domain), causing 404 on all /api/ routes
- Update frontend/.env.example to document VITE_REACT_APP_BACKEND_URL as the
  required variable in Vercel and Cloudflare project settings

CI:
- Add .github/workflows/frontend-ci.yml: TypeScript check + Vite build on
  every push/PR to main that touches frontend/; runs on Node 20, skips
  electron binary download, uploads dist artifact

Build reliability:
- Add frontend/.npmrc with ELECTRON_SKIP_BINARY_DOWNLOAD=1,
  ELECTRON_BUILDER_SKIP_PUBLISH=1, legacy-peer-deps=true so any CI
  environment reliably installs deps without binary download failures"

echo "Pushing to origin/main..."
git push origin main

echo ""
echo "Resetting remote URL (removes token from URL)..."
git remote set-url origin "https://github.com/leonnovic/FUEL_APP_MOBILE"

echo ""
echo "============================================================"
echo "✅  Pushed! GitHub will now trigger:"
echo "   • Cloudflare Workers rebuild (fuelappmobile) — should PASS"
echo "   • Vercel redeploy — should PASS"
echo "   • GitHub Actions frontend-ci — should PASS"
echo "============================================================"
echo ""
echo "IMPORTANT: Set this variable in BOTH Vercel and Cloudflare:"
echo ""
echo "   Variable name:  VITE_REACT_APP_BACKEND_URL"
echo "   Variable value: https://<your-fastapi-backend-domain>"
echo ""
echo "   Vercel:     Project Settings → Environment Variables"
echo "   Cloudflare: Workers → fuelappmobile → Settings → Variables"
echo ""
