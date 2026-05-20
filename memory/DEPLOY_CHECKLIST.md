# FuelPro Deploy Checklist — Iter 27 + 28 + 29

Use this when redeploying production. Estimated total time: **8–12 min**.

## 1. Pre-deploy verification (preview)
- [ ] Backend healthcheck: `curl https://create-app-1192.preview.emergentagent.com/api/health` → `{"ok":true,"mongo":true}`
- [ ] Push public key: `curl …/api/push/public-key` → returns `{"public_key":"B…"}`
- [ ] Backend tests pass: `cd /app/backend && python -m pytest tests/ -q` → 157 passed
- [ ] Frontend service worker registers without errors (open DevTools → Application → Service Workers)
- [ ] PWA install prompt appears on a fresh Chrome session (incognito)

## 2. Production env vars to set
These MUST be present in production before the redeploy. They were added to `/app/backend/.env` and need to be mirrored in the Emergent prod-env:

| Variable | Default in preview | Action |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `BHdNvxRsLr3elqFazV3FQsede4x5Y5zFBFYOpPZj6TLXjScS7qtBR_oQfNHCYFrguOT_oOSVAHs5a_blQ3bkkIY` | Copy into prod env exactly |
| `VAPID_PRIVATE_KEY` | `yqRGuL4lPiprODzkXaGoE9PtDpDpVtO28z9ttu3jjqU` | Copy into prod env exactly |
| `VAPID_CONTACT_EMAIL` | `mailto:admin@fuelpro.app` | Optional; set to your real email if you want delivery reports |

> 🚨 **Important**: VAPID keys must stay stable across deploys. If you rotate them, every existing browser subscription becomes invalid and users will need to re-enable notifications.

All other env vars (`STRIPE_API_KEY`, `MPESA_*`, `RESEND_API_KEY`, `TWILIO_*`, `FOUNDER_PASSWORD`, `JWT_SECRET`) are unchanged from the previous deploy.

## 3. Deploy
1. Open the Emergent UI for project `create-app-1192`
2. Click **Deploy** → wait ~5 min for build
3. Watch the build logs for: `pip install pywebpush py-vapid http_ece` succeeds

## 4. Post-deploy smoke tests
Run from any browser:

- [ ] `https://create-app-1192.emergent.host/api/health` → `{"ok":true,"mongo":true}`
- [ ] `https://create-app-1192.emergent.host/api/push/public-key` → returns same key as above
- [ ] Open the app → guest login works → header shows compact Tools dropdown (single pill, not 7)
- [ ] Open `/#/digest` → "Browser notifications" section is visible → click **Enable notifications** → grants permission → click **Send test** → notification pops in OS tray
- [ ] Open DevTools → Application → Manifest → `display_override` shows `window-controls-overlay`, `standalone`, `minimal-ui`
- [ ] Visit `/#/verify?r=ABC123` → Verify button + Share button visible

## 5. Rollback procedure (if needed)
1. In Emergent UI → **Deployments** → select the previous green deploy → **Rollback**
2. Users with the new SW cached will need to refresh once; they will get prompted by the **Update available** toast automatically.

## 6. Known limitations after this deploy
- **iOS Safari**: web push works only when the user has **installed FuelPro as a PWA** (Share → Add to Home Screen). The toggle UI will show that hint automatically on iOS browsers.
- **Capacitor Android wrap**: the in-app SW is identical to the web SW (Capacitor uses WebView). However, native FCM via Capacitor plugin is NOT wired yet — Android web push works via the Chrome/WebView's own subscription, which only fires when the WebView process is alive. If you need true background push on Android native, install `@capacitor/push-notifications` and add an FCM-Sender ID; left out of this iteration to keep scope tight.

## 7. After deploy — paste real API keys
Open `/#/founder` in production and paste:
- Stripe `sk_live_...` or `sk_test_...`
- M-PESA Daraja `CONSUMER_KEY` + `CONSUMER_SECRET`
- AWS S3 `ACCESS_KEY_ID` + `SECRET_ACCESS_KEY` + `BUCKET`
- Apple Sign In: `Team ID`, `Service ID`, `Key ID`, `private key (.p8)`
- Microsoft: `Tenant ID`, `Client ID`, `Client Secret`
- Resend: `re_…`
- Twilio: `SID`, `Auth Token`, `From Number`

The Founder panel persists these in `runtime_config` and `apply_runtime_config_to_env()` injects them at startup.
