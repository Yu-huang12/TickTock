# Store Submission Checklist

A start-to-finish sequence for publishing **Tick Tock Challenge** to Google Play and the
Apple App Store. Work top to bottom. Items marked **(one-time)** only happen for your first app.

> Companion files: [store-listing.md](store-listing.md) for all the text, and
> [privacy-policy.html](privacy-policy.html) for the policy page.

---

## 0. Prerequisites (do these first)

- [ ] **Enable GitHub Pages for the privacy policy.**
  Repo → **Settings → Pages → Build and deployment → Source: Deploy from a branch →
  Branch: `main` / folder: `/docs`** → Save. After ~1 min your policy is live at:
  `https://yu-huang12.github.io/TickTock/privacy-policy.html`
- [ ] **Fill placeholders** in `docs/privacy-policy.html` (`CONTACT_EMAIL_HERE`) and
  `docs/store-listing.md` (`<...>` support email/URLs). Commit + push.
- [ ] **Decide a final app name.** "Tick Tock Challenge" — confirm it's free on each store
  (names must be globally unique).
- [ ] **Confirm the app ID** is what you want to ship forever: `com.yuhuang.ticktock`
  (in `capacitor.config.ts` and `android/app/build.gradle`). It **cannot be changed** after
  first publish on either store.

---

## A. Google Play (do this first — easier, cheaper, faster review)

### A1. Account (one-time)
- [ ] Create a **Google Play Developer** account: https://play.google.com/console — **$25 one-time**.
- [ ] Complete identity verification (can take 1–2 days).

### A2. Signing & release build
- [ ] **Generate an upload keystore** (keep this file + passwords forever — losing it means you
  can't update the app):
  ```powershell
  & "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v `
    -keystore ticktock-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
  ```
  Store `ticktock-upload.jks` **outside** the repo (it's git-ignored anyway). Back it up.
- [ ] Build a signed **release App Bundle (.aab)** — easiest via Android Studio:
  `npm run android` → **Build → Generate Signed Bundle / APK → Android App Bundle** → select your
  keystore → release. Output: `android/app/build/outputs/bundle/release/app-release.aab`.
- [ ] (Recommended) Keep **Play App Signing** enabled (default) when prompted.

### A3. Create the app & store listing
- [ ] Play Console → **Create app**: name, default language (English), **App**, **Free**.
- [ ] **Main store listing:** paste from `store-listing.md` (short + full description).
- [ ] **App icon:** upload `assets/icon-only.png` (512×512 — resize if needed).
- [ ] **Feature graphic:** 1024×500 (see "Assets still needed" below).
- [ ] **Phone screenshots:** upload from `assets/screenshots/` (need 2–8; you have 6).
- [ ] **Category:** Games → Casual. **Tags:** Casual, Multiplayer.

### A4. Policy & content
- [ ] **Privacy policy URL:** paste the GitHub Pages URL.
- [ ] **Data safety form:** answer using the "Data safety" section in `store-listing.md`.
- [ ] **Content rating questionnaire:** complete it (expect "Everyone / PEGI 3").
- [ ] **Target audience:** General audiences (no design targeting children).
- [ ] **Ads:** declare **No ads**.

### A5. Release
- [ ] Start with **Internal testing** (instant, up to 100 testers) to verify the build installs
  and online play works on real devices. Add tester emails.
- [ ] Promote to **Production** when happy → submit for review (usually hours–days).

---

## B. Apple App Store (do this on your Mac)

### B1. Account (one-time)
- [ ] Enroll in the **Apple Developer Program**: https://developer.apple.com/programs — **$99/year**.

### B2. Generate the iOS project (on the Mac)
- [ ] Clone the repo on the Mac, then:
  ```bash
  npm install
  npm run build
  npx cap add ios
  npm run ios   # opens Xcode
  ```
- [ ] Add `.env` on the Mac too (it's git-ignored) so online play works in the build.

### B3. Xcode config
- [ ] In Xcode → target **App** → **Signing & Capabilities**: select your Team; let Xcode manage
  signing. Set the Bundle Identifier to `com.yuhuang.ticktock`.
- [ ] Confirm the **camera usage string** exists (for QR scanning). In `ios/App/App/Info.plist`
  add if missing:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Used to scan a room's QR code so you can join a game.</string>
  ```
- [ ] Set the app **Display Name**, **version** (1.0.0) and **build** (1).
- [ ] Add the **app icon**: drag `assets/icon-only.png` into the asset catalog (or use an icon-set
  generator). Apple icons must have **no alpha/transparency**.

### B4. App Store Connect
- [ ] https://appstoreconnect.apple.com → **My Apps → +** → New App. Pick the bundle ID,
  name "Tick Tock Challenge", primary language, SKU (any unique string, e.g. `ticktock001`).
- [ ] **App Information:** subtitle, category (Games), age rating questionnaire (→ 4+).
- [ ] **Privacy Policy URL:** the GitHub Pages URL.
- [ ] **App Privacy:** fill using the "Data safety / App privacy" answers in `store-listing.md`
  (collects: anonymous ID + user-entered name; not used for tracking).
- [ ] **Pricing:** Free.
- [ ] **Screenshots:** upload the 6.7" set from `assets/screenshots/` (1290×2796). Apple also wants
  a **6.5"** set — the same images are accepted by most review flows; regenerate at 1284×2778 if
  asked (tweak the viewport in `scripts/screenshots.mjs`).
- [ ] **Description / keywords / promo text:** paste from `store-listing.md`.

### B5. Upload & submit
- [ ] In Xcode: **Product → Archive** → **Distribute App → App Store Connect → Upload**.
- [ ] In App Store Connect, attach the uploaded build to the version.
- [ ] (Recommended) Test via **TestFlight** first (internal testers, no review for internal).
- [ ] **Submit for Review.** First review typically 1–3 days.

---

## Assets still needed (not generatable from the app)

| Asset | Size | For | Status |
| --- | --- | --- | --- |
| App icon | 512×512 | Play | Use `assets/icon-only.png` (resize) |
| App icon | 1024×1024 | Apple | ✅ `assets/icon-appstore-1024.png` (no alpha) |
| Phone screenshots | 1290×2796 | Both | ✅ `assets/screenshots/` |
| **Feature graphic** | **1024×500** | Play | ✅ `assets/feature-graphic.png` |
| 6.5" screenshots | 1284×2778 | Apple (maybe) | ⬜ optional regen |

> All generatable assets are now in `/assets`. Regenerate any time with `npm run assets`
> (icons, splash, feature graphic, App Store icon) and `npm run screenshots` (phone shots).

---

## Reality check / timeline

- **Google Play:** account approval (1–2 days) + review (hours–few days).
- **Apple:** enrollment (hours–2 days) + review (1–3 days).
- **You must do** the paid signups and run the iOS archive on your Mac — those can't be automated
  from here.
- Keep your **keystore** (Android) and **Apple signing** safe; losing them blocks future updates.
