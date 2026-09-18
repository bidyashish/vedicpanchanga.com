# Plan: iOS + Android apps for vedicpanchanga.com

## Context

Ship iOS and Android apps that mirror the existing vedicpanchanga.com webapp (Kundali / Panchang / Muhurta calculator). User-stated constraints:

- **Reuse the existing Python code on-device** — same 17 calculation modules and PDF generator as the website (one source of truth).
- **Reuse the Swiss Ephemeris `.se1` data files** (`backend/ephe/`).
- **Offline-first**: no internet for core features.
- **Ad-supported** (AdMob), **no login**, **multi-language UX** (web already supports 9 langs), **offline PDF**.
- **Easy to release** on both stores. Good UX, fast performance.

## Architecture

**Capacitor wrapping the existing Vite/React build, with on-device Python via a custom native plugin** — Chaquopy on Android, BeeWare's Python-Apple-support on iOS.

Why this over Flutter or native Swift+Kotlin:

| | Capacitor (chosen) | Flutter | Native Swift+Kotlin |
|---|---|---|---|
| Reuses existing UI | 100% (44 .tsx files) | 0% (rebuild in Dart) | 0% (rebuild twice) |
| Sources of truth for calc logic | 1 (Python) | 1 (Python) | 3 (Python web, Swift, Kotlin) |
| 16-page multilingual PDF | fpdf2 verbatim | fpdf2 verbatim | reimplement on PDFKit + PdfDocument |
| Effort (solo dev) | 7-9 weeks | 11-13 weeks | 30-35 weeks |
| Web app keeps working unchanged | yes | yes | yes |

Pyodide-in-WebView was rejected: `pyswisseph` and `uharfbuzz` are CPython C extensions with no prebuilt Pyodide wheels. Native CPython runtimes (Chaquopy, Python-Apple-support) already ship them.

## Implementation

### Phase 1 — Capacitor scaffold (week 1)

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android \
  @capacitor/geolocation @capacitor/filesystem @capacitor/share \
  @capacitor/network @capacitor-community/admob
npx cap init "Vedic Panchanga" "com.vedicpanchanga.app" --web-dir=dist
npx cap add ios && npx cap add android
npm run build && npx cap sync
```

Verify launchable empty shell on Xcode + Android Studio.

### Phase 2 — Android Python bridge with Chaquopy (weeks 2-3)

- Add Chaquopy Gradle plugin to `frontend/android/app/build.gradle`.
- Configure `python { pip { install "pyswisseph"; install "fpdf2"; install "uharfbuzz"; install "pytz"; install "timezonefinderL" } }`.
- Copy the calc modules from `backend/` to `frontend/android/app/src/main/python/` (drop `server.py`, `requirements.txt`, tests).
- Bundle `backend/ephe/*.se1` (1.9 MB) under `android/app/src/main/assets/ephe/`.
- Bundle Latin + Devanagari + Tamil fonts (~1.7 MB) under `android/app/src/main/assets/fonts/`; CJK fonts (12 MB) lazy-downloaded on first zh/ja PDF export and cached in `Filesystem` Documents dir.
- Implement `PythonBridgePlugin.kt` — holds a singleton `Python.getInstance()` started with `Python.start(AndroidPlatform(context))` at app launch in a background thread. On first launch copies ephemeris + fonts from assets into `context.filesDir` (CPython's `open()` can't read APK assets directly). Exposes one method to JS: `call(path, method, body) -> {status, body}`.

### Phase 3 — iOS Python bridge with Python-Apple-support (weeks 4-5)

This phase carries the project's biggest schedule risk. **Spike pyswisseph cross-compile on day 1 — if blocked after 3 days, fall back (see Risks).**

- Add BeeWare's `Python.xcframework` to `frontend/ios/App/Frameworks/`.
- Cross-compile `pyswisseph` and `uharfbuzz` for ios-arm64 + simulator-arm64 using BeeWare's [`mobile-forge`](https://github.com/beeware/mobile-forge).
- Bundle Python source as a folder reference at `frontend/ios/App/App/python/`; ephe + fonts under `App/Resources/`.
- Implement `PythonBridgePlugin.swift` — calls `Py_SetPythonHome(bundlePath)` then `Py_Initialize` once at launch, holds `PyObject*` for `mobile_entry`, exposes the same `call(path, method, body)` contract as Android.

### Phase 4 — Same-origin API illusion (parallel with Phase 3)

- Add `backend/mobile_entry.py` — one function `dispatch(path, method, body) -> (status, response)` mirroring the 7 FastAPI routes (`/api/`, `/api/calculate`, `/api/ayanamsa-options`, `/api/get-panchang`, `/api/muhurta-purposes`, `/api/find-muhurta`, `/api/print-pdf`). Calls into the existing `compute_chart`, `compute_detailed_panchang`, `find_muhurtas`, `pdf.report.build_pdf`, etc.
- Modify `frontend/src/lib/api.ts` — branch on `Capacitor.isNativePlatform()` and route through `PythonBridge.call()` instead of `fetch('/api/...')`. Public function signatures unchanged — pages need **zero edits**.
- For PDF: native bridge returns base64-encoded bytes; existing `printPdf()` decodes to `Blob` (web path preserved); on native, write to `Filesystem` and open `Share`.
- Add `frontend/src/native/python-bridge.ts` — thin TS wrapper.

### Phase 5 — Native features (week 6)

- **Geolocation**: replace `navigator.geolocation.getCurrentPosition` (`PanchangPage.tsx:165` and any others) with `@capacitor/geolocation`. Same callback shape.
- **Offline city search**: ship `frontend/public/data/cities.json` (~3 MB, GeoNames `cities15000.txt`). `CitySearch.tsx` queries local first, falls back to Nominatim when `@capacitor/network` reports online. Use `Fuse.js` (~6 KB gz) or a pre-built kdbush index for fuzzy + nearest-neighbor.
- **Timezone**: stays in Python via `timezonefinderL` (~10 MB lightweight variant).
- **PDF share**: `Filesystem.writeFile({path, data: base64, directory: Cache})` then `Share.share({url, dialogTitle})`.
- **AdMob**: branch `frontend/src/components/shell/AdSlot.tsx` on `Capacitor.isNativePlatform()`. Native: `AdMob.showBanner` for header/footer; native banner units (320×100 / 300×250) for inline/sidebar; `AdMob.prepareInterstitial` after PDF export (frequency-cap 1/session). Set AdMob app IDs in `Info.plist` (`GADApplicationIdentifier`) and `AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`).

### Phase 6 — Compliance & polish (week 7)

- iOS App Tracking Transparency prompt + Google UMP SDK (GDPR).
- Cold-start loader: eager-import `mobile_entry` in a background thread at app launch; show `MandalaLoader` on the form until ready. Target P95 ≤ 1.5 s on a 3-year-old device.
- Offline graceful-degradation states (e.g., Nominatim fallback disabled).
- Dark mode QA on physical devices.

### Phase 7 — Store submission (week 8)

- Apple Developer Program ($99/yr) + provisioning profiles; Google Play Console ($25) + upload keystore.
- Screenshots in all 9 languages via fastlane `snapshot` (iOS) and `screengrab` (Android).
- Privacy manifest (iOS), data-safety form (Play). TestFlight + Play Internal Testing → public submission.

## Critical files

### New
- `frontend/capacitor.config.ts` — appId `com.vedicpanchanga.app`, webDir `dist`.
- `frontend/src/native/python-bridge.ts` — TS wrapper around the custom plugin.
- `backend/mobile_entry.py` — single `dispatch()` over the existing modules; mirrors the 7 routes.
- `frontend/android/app/src/main/java/com/vedicpanchanga/python/PythonBridgePlugin.kt` — Chaquopy host.
- `frontend/ios/App/App/PythonBridge/PythonBridgePlugin.swift` — Python-Apple-support host.
- `frontend/public/data/cities.json` — offline city DB (~3 MB).

### Modified
- `frontend/src/lib/api.ts` — branch on `Capacitor.isNativePlatform()`.
- `frontend/src/components/shell/AdSlot.tsx` — AdMob branch alongside AdSense.
- `frontend/src/components/common/CitySearch.tsx` — local DB first, Nominatim fallback.
- `frontend/src/pages/KundaliPage.tsx` — PDF download via Filesystem + Share on native.
- `frontend/src/pages/PanchangPage.tsx` — geolocation via `@capacitor/geolocation`.
- `frontend/.env` — add `VITE_ADMOB_APP_ID_IOS`, `VITE_ADMOB_APP_ID_ANDROID`, per-slot ad unit IDs.

### Reused unchanged
- All 17 calc modules in `backend/` (`calculator.py`, `advanced_panchang.py`, `panchang_extras.py`, `gowri_panchang.py`, `hora.py`, `vargas.py`, `ayanamsa.py`, `muhurta.py`, `dasha_extras.py`, `jaimini.py`, `relationships.py`, `kalsarpa.py`, `mangal.py`, `sade_sati.py`, `constants.py`, `panchang_constants.py`).
- `backend/pdf/` — fpdf2 generator runs as-is.
- `backend/ephe/*.se1` — bundled as native assets.
- `frontend/src/i18n.tsx` — 9-language dictionary used unchanged.
- `frontend/src/components/kundali/VedicChart.tsx`, `SouthIndianChart.tsx` — SVG renders identically inside WebView.
- `frontend/src/types/api.ts` — TS shapes describe the bridge response contract too.

## Bundle size budget

| Component | Android (AAB) | iOS (IPA) |
|---|---|---|
| Capacitor + WebView shell | 5 MB | 4 MB |
| Vite dist (gz) | 1.5 MB | 1.5 MB |
| Python runtime | 7 MB | 13 MB |
| pyswisseph + uharfbuzz | 3 MB | 4 MB |
| `ephe/*.se1` | 1.9 MB | 1.9 MB |
| Bundled fonts (Latin + Devanagari + Tamil) | 1.7 MB | 1.7 MB |
| timezonefinderL data | 10 MB | 10 MB |
| cities.json | 3 MB | 3 MB |
| **Total install** | **~33 MB** | **~39 MB** |

CJK fonts (~12 MB) lazy-downloaded on first zh/ja export, cached afterwards.

## Top risks

1. **iOS `pyswisseph` (and especially `uharfbuzz`) cross-compile** — biggest schedule risk. Mitigation: spike day 1 of Phase 3 against BeeWare's `mobile-forge`. If blocked after 3 days, fallback A: keep Python only on Android for v1, ship iOS using a `dart:ffi`-style direct C-bridge to the Swiss Ephemeris source on iOS (calc only) + Flutter `pdf` package for iOS PDF (accept layout divergence). Fallback B: ship Android v1 first, defer iOS by 4-6 weeks while resolving the cross-compile properly.
2. **Bundle bloat** — easy to drift past 80 MB. Mitigation: ABI-split (arm64-v8a only on Android), lazy CJK fonts, app-thinning on iOS, `timezonefinderL` (not full `timezonefinder`). Re-measure each phase.
3. **AdMob policy compliance** — misconfigured ATT/UMP gets apps pulled. Mitigation: integrate UMP SDK day one; AdMob test-ad-unit IDs until launch; review Apple ATT + Play Families policies thoroughly before first submission.

## Verification

End-to-end on each platform:

1. `cd frontend && npm run build && npx cap sync`
2. `npx cap open ios` → run on simulator + physical device → exercise Kundali, Panchang, Muhurta with airplane mode on after first warmup.
3. `npx cap open android` → emulator + physical device → repeat.
4. **Parity check**: pick 5 birth charts (varying timezones, ayanamsas, edge dates near tithi/nakshatra boundaries). Compute on the website, on Android, on iOS. JSON output should match byte-for-byte.
5. **PDF parity**: generate the same chart's PDF on each platform and the website. Expect identical output (same fpdf2, same fonts, same Python).
6. **Backend tests still pass**: `cd backend && source venv/bin/activate && pytest tests/ -v`. The calc modules are untouched; this catches regressions to the shared codebase.
7. **Build size**: AAB ≤ 35 MB, IPA ≤ 40 MB before submission.
8. **Cold-start**: P95 ≤ 1.5 s from tap to first interactive screen on a 3-year-old device.
