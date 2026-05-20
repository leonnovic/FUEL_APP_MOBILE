# FuelPro — Android (Capacitor) Ship Guide

This walks you through building the FuelPro Android wrap from the current codebase, signing it, and uploading to Google Play. Estimated time: **30–60 min** for the first ship, **5 min** for every subsequent release.

## Prerequisites (one-time, on YOUR machine)

| Tool | Version | How to get |
|---|---|---|
| Node | ≥20 | nodejs.org |
| Yarn | 1.22+ | `npm i -g yarn` |
| Android Studio | latest | developer.android.com/studio |
| Android SDK Platform 34 | via Studio's SDK Manager |
| Java JDK | 17 | Comes with Studio |
| Google Play Console account | $25 one-time | play.google.com/console |

## Step 1 — Pull this codebase to your machine

```bash
git clone <your-repo-url> fuelpro
cd fuelpro/frontend
yarn install
```

## Step 2 — Build the production web bundle

```bash
yarn build       # outputs /dist
```

## Step 3 — Add the Android platform (first time only)

```bash
yarn cap:add:android
```

This creates `/frontend/android/` with the Capacitor Gradle project pre-wired.

## Step 4 — Sync dist + manifest + service worker into Android

```bash
npx cap sync android
```

Every time you change web code, run this command before opening Android Studio.

## Step 5 — Open in Android Studio

```bash
npx cap open android
```

Studio opens `frontend/android/`. Wait ~2 min for first Gradle sync to finish.

## Step 6 — Configure app icons + splash

Studio menu: **Tools → Resource Manager → Asset Studio** → Image Asset → use `/frontend/public/logo-main.png`. Generates all density variants automatically.

## Step 7 — Set the version code + name

Edit `frontend/android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.fuelpro.app"
        versionCode 1        // bump by 1 every release
        versionName "1.0.0"  // semver shown to users
    }
}
```

## Step 8 — Generate a signing keystore (FIRST RELEASE ONLY)

```bash
keytool -genkey -v \
  -keystore ~/fuelpro-release.keystore \
  -alias fuelpro \
  -keyalg RSA -keysize 2048 -validity 10000
```

🚨 **Back this keystore up safely.** Lose it and you can never update the app on Play Store — you'd have to publish a new app.

Add the keystore reference to `frontend/android/app/build.gradle` inside `android {}`:

```gradle
signingConfigs {
    release {
        storeFile file(System.getenv("FUELPRO_KEYSTORE_PATH") ?: "${rootDir}/../../fuelpro-release.keystore")
        storePassword System.getenv("FUELPRO_KEYSTORE_PASS")
        keyAlias "fuelpro"
        keyPassword System.getenv("FUELPRO_KEY_PASS")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## Step 9 — Build the signed AAB (Google Play preferred format)

In Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle**
3. Point to your `~/fuelpro-release.keystore`, enter passwords
4. Pick `release` variant
5. Output: `frontend/android/app/release/app-release.aab`

OR from CLI:

```bash
cd frontend/android
FUELPRO_KEYSTORE_PASS=… FUELPRO_KEY_PASS=… ./gradlew bundleRelease
```

## Step 10 — Upload to Play Console

1. Go to **Play Console → Your app → Release → Production → Create new release**
2. Upload `app-release.aab`
3. Fill release notes, save, **Review → Roll out**
4. First-time apps need privacy policy URL + content rating questionnaire (~10 min)
5. Review usually approves within 1–7 days for new apps, hours for updates

## Step 11 — Subsequent releases (≈5 min)

```bash
cd frontend
git pull
yarn install               # only when deps change
yarn build
npx cap sync android
cd android
./gradlew bundleRelease
# Upload new .aab to Play Console; bump versionCode +1 first.
```

## Notes on cross-platform features in this build

| Feature | Behaviour in Android wrap |
|---|---|
| Service worker / offline | Works — Capacitor uses WebView with SW enabled |
| Web Push (FCM via VAPID) | Works while WebView process is alive. For true background push, install `@capacitor/push-notifications` + native FCM (not done yet) |
| PWA install prompt | Hidden inside the wrap (app already installed natively) |
| Web Share API | Works — invokes Android share sheet |
| iOS-specific code | Inert |
| Status bar | Configured to dark (`#0a0a0f`) in `capacitor.config.ts` |
| Splash | Configured to `#0a0a0f` for 1.5s in `capacitor.config.ts` |

## Troubleshooting

- **Build fails with "min SDK"**: open `frontend/android/variables.gradle`, ensure `minSdkVersion = 23` (set by Capacitor 7)
- **White screen on app launch**: usually missing `dist/`. Re-run `yarn build && npx cap sync android`.
- **Push notifications not arriving on Android**: ensure the user has the app open at least once after install so the SW can register.

## Optional next step: native FCM background push

To get true background push (notifications even when WebView is killed):

```bash
yarn add @capacitor/push-notifications
npx cap sync android
```

Then add a Firebase project, drop `google-services.json` into `frontend/android/app/`, and follow the [Capacitor docs](https://capacitorjs.com/docs/apis/push-notifications). The backend already has the `push_to_user()` helper — you'd just call it with a different transport.
