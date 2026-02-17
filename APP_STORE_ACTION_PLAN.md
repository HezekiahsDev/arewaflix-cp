# Arewaflix App Store Action Plan (Concise)

Use this file as a step-by-step checklist to fix the compliance blockers and get ready to submit to Apple App Store and Google Play.

Each step includes the files to edit and a short implementation note.

---

## Phase 1 — Must fix before submission (do these first)

1. Add hosted Privacy Policy & Terms of Service

- Deliverable: `https://arewaflix.co/terms/privacy-policy` and `https://arewaflix.co/terms/terms` (public URLs)
- Files touched: none in app; update `app.json` after URLs are live.
- Notes: Use a generator/template, include data collection, third parties, deletion rights, contact.

2. Make in-app links functional

- Files: `app/auth/signup.tsx`, `app/auth/login.tsx`, `app/(tabs)/profile.tsx`
- Action: Use `expo-web-browser` to open the hosted URLs. Replace plain Text with Pressable + openBrowserAsync.

3. Add Privacy Policy URL to `app.json`

- File: `arewaflix-cp/app.json`
- Add: `"privacy": "https://arewaflix.co/terms/privacy-policy"` under `expo`.

4. Add in-app account deletion

- Files: `lib/api/auth.ts` (add `deleteAccount`), `app/(tabs)/profile.tsx` (UI), `context/AuthContext.tsx` (signOut flow)
- Action: Implement UI with two confirmations; call DELETE `/api/v1/users/me` with Bearer token; clear local storage on success.
- Backend: Ensure backend actually deletes or provides an export.

5. Remove or disable non-functional social login buttons

- Files: `app/auth/login.tsx`, `app/auth/signup.tsx`
- Quick fix: Remove the social login block or replace with a small "Coming soon" button/modal.
- Longer term: Implement OAuth flows (Sign in with Apple mandatory if social sign-in options are present for iOS).

6. Remove or implement profile tiles

- File: `app/(tabs)/profile.tsx`
- Quick fix: Make tiles either show a simple Alert / open support URL or remove them entirely.

7. Update Google Play Data Safety form and Android permissions

- Action: In Play Console, fill Data Safety form declaring all collected data.
- File: `arewaflix-cp/app.json` — include `android.permissions` like `POST_NOTIFICATIONS` and `INTERNET`.

---

## Phase 2 — Should fix (before or shortly after submission)

8. Add iOS Info.plist permission descriptions

- File: `arewaflix-cp/app.json` under `expo.ios.infoPlist`
- Keys: `NSUserTrackingUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibraryAddUsageDescription`.

9. Implement Forgot Password flow

- Files: `app/auth/login.tsx`, `app/auth/reset-password.tsx`, `lib/api/auth.ts`
- Action: Add reset form or link to website reset page.

10. Protect reviewer credentials

- File: `app/auth/login.tsx`
- Action: Only expose reviewer autofill when `__DEV__` or an explicit preview flag is set. Remove `EXPO_PUBLIC_` usage for secrets.

11. Add content reporting and moderation hooks

- Files: `app/player.tsx`, `lib/api/video-interactions.ts` (or new `lib/api/reports.ts`)
- Action: Add a Report button with multiple categories that POSTs to an API endpoint.

---

## Phase 3 — Nice-to-have / polish

12. Prepare App Store & Play Store assets

- Artifacts: screenshots for required device sizes, 1024x1024 icon, promotional text
- Put reviewer account info and test credentials in App Store Connect review notes (do NOT embed in app)

13. QA & Build

- Run: `npx eas build --platform ios --profile production` and Android equivalent
- Verify in TestFlight and internal Play track
- Confirm all Phase 1 issues are resolved

14. Final checks

- Fill Play Console Data Safety form
- Add privacy policy URL in both App Store and Play Store listings
- Confirm target SDK/API levels (Android targetSdk >= 33)

---

## Quick dev commands

Install web browser helper if not present:

```bash
npm install expo-web-browser
```

Run the app locally to test changes:

```bash
npm install
npm run start
# or
npx expo start
```

Build with EAS (after configuration):

```bash
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

---

## Notes

- Make minimal, verifiable changes for Phase 1 to pass review quickly (privacy links, account deletion, remove broken UI).
- Coordinate backend work for account deletion and reporting before submitting.

---

Signed-off-by: Action plan generated for Arewaflix
