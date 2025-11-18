# App Store & Play Store Compliance Analysis

**Arewaflix Mobile App - Critical Issues Report**

Date: November 11, 2025  
App Version: 1.0.0  
Platform: iOS & Android (React Native/Expo)

---

## Executive Summary

This document identifies **critical compliance issues** that may cause Apple App Store rejections for "App Completeness" and Google Play Store listing problems. These issues must be resolved before submission.

**Severity Levels:**

- 🔴 **CRITICAL** - Will cause rejection
- 🟡 **HIGH** - Likely to cause rejection or delay
- 🟠 **MEDIUM** - May trigger review questions
- 🟢 **LOW** - Best practice improvement

---

## 🔴 CRITICAL ISSUES

### 1. Missing Privacy Policy & Terms of Service (Apple Guideline 5.1.1)

**Severity:** 🔴 CRITICAL - GUARANTEED REJECTION

**Issue:**

- The signup screen references "Terms of use & Privacy Policy" (`app/auth/signup.tsx` lines 312-316)
- These links are **non-functional** - they don't navigate anywhere
- No actual privacy policy or terms of service documents exist in the app
- No URLs provided in `app.json` for privacy policy

**Why This Causes Rejection:**

- Apple requires functional privacy policy links **before** data collection
- Google Play requires privacy policy URL in the store listing
- Both stores require privacy policies for apps that collect personal data (email, username, etc.)

**Evidence:**

```tsx
// app/auth/signup.tsx:312-316
<Text className="font-semibold text-primary">
  Terms of use
</Text>{" "}
&{" "}
<Text className="font-semibold text-primary">
  Privacy Policy
</Text>
```

These are just styled text with no `onPress` handlers or navigation.

**Action Required:**

1. **Create Privacy Policy & Terms of Service documents**
   - Host on `arewaflix.io` domain (e.g., `https://arewaflix.com/terms/privacy-policy`, `https://arewaflix.com/terms/terms`)
   - Must include:
     - What data you collect (email, username, IP address, device ID, etc.)
     - How you use the data
     - Third-party services (Backblaze B2, API providers)
     - User rights (data access, deletion, portability)
     - Contact information
   - Use templates: [Termly](https://termly.io) or [PrivacyPolicies.com](https://www.privacypolicies.com)

2. **Add URLs to app.json**

```json
{
  "expo": {
    "privacy": "https://arewaflix.com/terms/privacy-policy",
    "ios": {
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "permissions": []
    }
  }
}
```

3. **Make links functional in signup.tsx**

```tsx
import * as WebBrowser from 'expo-web-browser';

// In the consent section:
<Pressable onPress={() => WebBrowser.openBrowserAsync('https://arewaflix.com/terms/terms')}>
  <Text className="font-semibold text-primary">Terms of use</Text>
</Pressable>
{" "}&{" "}
<Pressable onPress={() => WebBrowser.openBrowserAsync('https://arewaflix.com/terms/privacy-policy')}>
  <Text className="font-semibold text-primary">Privacy Policy</Text>
</Pressable>
```

4. **Add links to login screen footer**

5. **Add Privacy Policy to Profile/Settings screen**

---

### 2. Missing Account Deletion Mechanism (Apple Guideline 5.1.1(v))

**Severity:** 🔴 CRITICAL - GUARANTEED REJECTION

**Issue:**

- App allows users to create accounts but provides **NO way to delete accounts**
- Apple **requires** account deletion since June 2022
- Profile screen has "Sign Out" but no "Delete Account" option
- No API endpoint visible for account deletion

**Why This Causes Rejection:**

- Apple Guideline 5.1.1(v): Apps that enable account creation must also allow account deletion within the app
- Google Play also requires this for GDPR compliance

**Action Required:**

1. **Add "Delete Account" option to Profile screen** (`app/(tabs)/profile.tsx`)

```tsx
// Add to profileOptions array:
{
  id: "option-7",
  title: "Delete Account",
  description: "Permanently delete your account and data",
  icon: TrashIcon, // Add appropriate icon
  danger: true,
}
```

2. **Create account deletion API endpoint**

```typescript
// lib/api/auth.ts
export async function deleteAccount(
  token: string
): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE_URL}/api/v1/users/me`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return await response.json();
}
```

3. **Implement deletion flow with confirmation**

```tsx
// In profile.tsx
const handleDeleteAccount = useCallback(() => {
  Alert.alert(
    "Delete Account",
    "Are you sure you want to permanently delete your account? This action cannot be undone.\n\nAll your data including:\n• Profile information\n• Watch history\n• Saved videos\n• Comments\n\nwill be permanently deleted.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Show second confirmation
          Alert.alert(
            "Final Confirmation",
            "Type DELETE to confirm account deletion",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Confirm Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteAccount(token);
                    await signOut();
                    router.replace("/");
                  } catch (error) {
                    Alert.alert(
                      "Error",
                      "Failed to delete account. Please try again."
                    );
                  }
                },
              },
            ]
          );
        },
      },
    ]
  );
}, [token, signOut, router]);
```

4. **Backend must:**
   - Actually delete user data (not just soft delete)
   - Or provide data export before deletion
   - Send confirmation email
   - Handle data retention requirements (e.g., legal holds)

---

### 3. Non-Functional Social Login Buttons (Apple Guideline 2.1)

**Severity:** 🔴 CRITICAL - APP COMPLETENESS ISSUE

**Issue:**

- Login screen displays 6 social login buttons: Facebook, X (Twitter), LinkedIn, Instagram, TikTok, Google
- All buttons are **non-functional** - they only log `"Social login implementation"` to console
- These are visible, tappable UI elements that do nothing

**Why This Causes Rejection:**

- Apple's "App Completeness" requirement: All visible features must work
- Presenting non-functional UI is considered deceptive
- Users expect these buttons to work

**Evidence:**

```tsx
// app/auth/login.tsx:98-100
const handleSocialLogin = useCallback((provider: string) => {
  // Social login implementation
}, []);
```

**Action Required - Choose ONE:**

**Option A: Remove Social Login Buttons (RECOMMENDED for quick approval)**

```tsx
// Comment out or remove the entire social login section in login.tsx and signup.tsx
{
  /* Social Login Buttons - Temporarily disabled
<View className="mt-8">
  <Text className="mb-4 text-sm font-semibold...">
    Or continue with
  </Text>
  ...
</View>
*/
}
```

**Option B: Implement Social Login (More work, better UX)**

1. **For Apple (REQUIRED if you have other social logins):**
   - Must add "Sign in with Apple" as the first option
   - Install: `expo-apple-authentication`
   - Add capability in `app.json`

2. **For Google:**
   - Use `@react-native-google-signin/google-signin` or `expo-auth-session`
   - Configure OAuth in Google Cloud Console
   - Add OAuth client IDs to `app.json`

3. **For Facebook:**
   - Use `expo-auth-session` with Facebook OAuth
   - Configure Facebook App ID

4. **Alternative: Link to web authentication**
   - Open web browser for OAuth flow
   - Return to app with deep link

**Option C: Make buttons show "Coming Soon" (Not recommended - still looks unfinished)**

---

### 4. Missing iOS Permission Descriptions

**Severity:** 🟡 HIGH - Will cause build/submission issues

**Issue:**

- App uses push notifications but missing `NSUserTrackingUsageDescription` (if using tracking)
- May trigger App Tracking Transparency (ATT) requirements
- Device fingerprinting (`lib/device-fingerprint.ts`) may require tracking permission

**Why This Causes Issues:**

- iOS requires permission descriptions for all privacy-sensitive APIs
- Missing descriptions cause TestFlight upload failures
- ATT is required if you track users across apps/websites

**Action Required:**

1. **Add to app.json infoPlist:**

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserTrackingUsageDescription": "We use analytics to improve your video recommendations and app experience. Your data is never sold to third parties.",
        "NSPhotoLibraryUsageDescription": "Upload photos for your profile picture",
        "NSCameraUsageDescription": "Take photos for your profile picture",
        "NSMicrophoneUsageDescription": "Record audio for video uploads",
        "NSPhotoLibraryAddUsageDescription": "Save videos to your photo library"
      }
    }
  }
}
```

2. **Review device fingerprinting:**

```typescript
// lib/device-fingerprint.ts uses:
// - Constants.installationId
// - Platform.OS
// - Platform.Version

// This is OK for fraud prevention, but document it in Privacy Policy
```

3. **If NOT tracking users across apps/websites:**
   - Ensure you're not using third-party analytics that track (Firebase Analytics, Facebook SDK, etc.)
   - Document in privacy policy that tracking is only for fraud prevention

---

### 5. Incomplete Profile/Settings Functionality

**Severity:** 🟡 HIGH - App Completeness Issue

**Issue:**

- Profile screen shows 6 option cards: "My Videos", "Subscriptions", "Settings", "Language", "About", "Help & Support"
- **NONE of these options do anything** - no `onPress` handlers
- They're just decorative UI elements

**Evidence:**

```tsx
// app/(tabs)/profile.tsx:194-198
<Pressable className="items-center justify-center p-4">
  <item.icon size={32} color="white" />
  <Text className="mt-2 text-center font-semibold text-white">
    {item.title}
  </Text>
</Pressable>
```

No navigation or functionality implemented.

**Action Required:**

**Option A: Remove non-functional items (Quick fix)**

```tsx
const profileOptions = [
  // Keep only "Sign Out" functionality
  // Remove or comment out all non-functional options
];
```

**Option B: Implement basic functionality**

1. **Settings:**
   - Create `app/settings.tsx`
   - Add notifications toggle, theme selection, video quality preferences

2. **About:**
   - Create `app/about.tsx`
   - Show app version, developer info, open source licenses

3. **Help & Support:**
   - Create `app/support.tsx`
   - FAQs, email contact, or link to support website

4. **Language:**
   - Implement i18n if you support multiple languages
   - Otherwise remove this option

5. **My Videos & Subscriptions:**
   - Implement or remove if not ready

**Minimum viable fix:**

```tsx
renderItem={({ item }) => (
  <View className="w-1/2 p-2">
    <BlurView intensity={50} tint="dark" className="overflow-hidden rounded-lg">
      <Pressable
        className="items-center justify-center p-4"
        onPress={() => {
          if (item.id === 'option-5') {
            // About - show app version
            Alert.alert('About Arewaflix', `Version: 1.0.0\nBuild: ${Constants.expoConfig?.version}`);
          } else if (item.id === 'option-6') {
            // Help & Support - open email or website
            WebBrowser.openBrowserAsync('https://arewaflix.io/support');
          } else {
            // Others - coming soon
            Alert.alert('Coming Soon', `${item.title} feature is under development.`);
          }
        }}
      >
        <item.icon size={32} color="white" />
        <Text className="mt-2 text-center font-semibold text-white">
          {item.title}
        </Text>
      </Pressable>
    </BlurView>
  </View>
)}
```

---

## 🟠 MEDIUM PRIORITY ISSUES

### 6. Forgot Password Non-Functional

**Severity:** 🟠 MEDIUM

**Issue:**

- Login screen has "Forgot your password?" link
- Button does nothing (no `onPress` handler)

**Action Required:**

```tsx
// app/auth/login.tsx - Add onPress handler
<Pressable onPress={() => {
  // Option 1: Navigate to password reset screen
  router.push('/auth/reset-password');

  // Option 2: Open web browser
  WebBrowser.openBrowserAsync('https://arewaflix.io/forgot-password');

  // Option 3: Show alert (temporary)
  Alert.alert(
    'Reset Password',
    'Please visit arewaflix.io/forgot-password to reset your password.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Website', onPress: () => WebBrowser.openBrowserAsync('https://arewaflix.io/forgot-password') }
    ]
  );
}}>
```

---

### 7. Reviewer Credentials Exposed in Production

**Severity:** 🟠 MEDIUM - Security & App Review Issue

**Issue:**

- Login screen has "Use reviewer credentials" button when `EXPO_PUBLIC_REVIEW_USERNAME` is set
- This could accidentally ship to production if env vars are set

**Evidence:**

```tsx
// app/auth/login.tsx:137-150
{REVIEW_USER && REVIEW_PASS && (
  <View className="mb-4">
    <Pressable
      onPress={() => {
        setUsername(REVIEW_USER);
        setPassword(REVIEW_PASS);
      }}
      ...
    >
      <Text>Use reviewer credentials</Text>
    </Pressable>
  </View>
)}
```

**Action Required:**

1. **Add build environment check:**

```tsx
const isPreview = __DEV__ || Constants.expoConfig?.extra?.eas?.preview;
const REVIEW_USER = isPreview
  ? process.env.EXPO_PUBLIC_REVIEW_USERNAME
  : undefined;
```

2. **Or use EAS Secrets** (better approach):
   - Don't use `EXPO_PUBLIC_` prefix (it's client-side visible)
   - Add credentials to App Store Connect "Review Information" section
   - Provide demo account in store listing notes

3. **Remove this feature entirely** (safest):
   - Provide reviewer credentials only in App Store Connect notes
   - Prevents accidental exposure

---

### 8. Gender Field Not Required (Best Practice)

**Severity:** 🟢 LOW - Best Practice

**Issue:**

- Signup form has gender selection but it's optional
- API may accept empty/null gender
- Some regions require justification for collecting gender

**Recommendation:**

- Either make it truly optional on backend
- Or explain why you collect it ("To provide personalized recommendations")
- Consider removing if not essential

---

### 9. Missing App Store Metadata

**Severity:** 🟠 MEDIUM - Store Listing Issue

**Issue:**

- No app description visible in codebase
- No screenshots prepared
- No app preview video
- No keywords defined

**Action Required:**

1. **Create App Store listing content:**
   - **Name:** "Arewaflix - Hausa Entertainment"
   - **Subtitle:** "Stream Hausa Movies & Shows"
   - **Description:**

     ```
     Discover the best of Hausa entertainment with Arewaflix!

     🎬 FEATURES:
     • Stream thousands of Hausa movies and shows
     • Watch trending videos and shorts
     • Search and discover new content
     • Save your favorite videos
     • High-quality streaming

     📱 WHY AREWAFLIX?
     • Free to use
     • Regular content updates
     • Easy-to-use interface
     • Works on all devices

     Download now and enjoy unlimited Hausa entertainment!
     ```

2. **Prepare screenshots:**
   - iPhone 6.7" (iPhone 14 Pro Max): Required
   - iPhone 5.5" (iPhone 8 Plus): Required
   - iPad Pro 12.9" (3rd gen): Required if supporting iPad
   - Use actual app screens: Home, Player, Search, Profile

3. **App Icon Requirements:**
   - 1024x1024px PNG (no alpha channel)
   - Check current icon meets requirements
   - iOS: No rounded corners (system applies)
   - Android: Can be rounded

4. **Keywords (max 100 characters):**
   ```
   hausa,movies,entertainment,video,streaming,africa,nollywood,kannywood,shorts
   ```

---

### 10. Video Content Moderation Concerns

**Severity:** 🟠 MEDIUM - Content Policy

**Issue:**

- App displays user-generated content
- No visible content moderation UI
- API has `approved` and `privacy` filters but may not be enforced
- Apple requires content moderation for UGC apps

**Action Required:**

1. **Add content reporting:**

```tsx
// In player.tsx or video cards, add report button
<Pressable
  onPress={() => {
    Alert.alert("Report Video", "Why are you reporting this video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Inappropriate Content",
        onPress: () => reportVideo("inappropriate"),
      },
      { text: "Spam", onPress: () => reportVideo("spam") },
      { text: "Copyright Violation", onPress: () => reportVideo("copyright") },
    ]);
  }}
>
  <Ionicons name="flag-outline" size={20} />
</Pressable>
```

2. **Add community guidelines link:**
   - Create guidelines document
   - Link in app footer and about page

3. **Implement backend moderation:**
   - Queue for manual review
   - Automated filtering
   - User reports system

---

## 🟢 GOOGLE PLAY STORE SPECIFIC ISSUES

### 11. Missing Android Permissions Declarations

**Severity:** 🟡 HIGH for Play Store

**Issue:**

- Push notifications requires `POST_NOTIFICATIONS` permission (Android 13+)
- Not explicitly declared in `app.json`

**Action Required:**

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.POST_NOTIFICATIONS"
      ]
    }
  }
}
```

---

### 12. Data Safety Form Requirements

**Severity:** 🔴 CRITICAL for Play Store

**Issue:**

- Google Play requires "Data Safety" form
- Must declare what data you collect

**Data You Collect:**
Based on code analysis:

- ✅ Personal info: Email, Username, Name
- ✅ User-generated content: Comments, reactions
- ✅ App activity: Watch history, search queries
- ✅ Device identifiers: Device fingerprint, Installation ID
- ✅ App interactions: Likes, views, comments

**Action Required:**

1. Fill out Data Safety form in Google Play Console
2. Declare all data collection
3. Specify data sharing (with API backend)
4. Specify security measures (HTTPS, token auth)

---

### 13. Target API Level

**Severity:** 🟡 HIGH for Play Store

**Issue:**

- Google Play requires target API 33+ (Android 13)
- Expo SDK 54 should handle this, but verify

**Verification:**

```bash
# Check build.gradle or app.json
eas build:configure
```

Ensure:

```json
{
  "expo": {
    "android": {
      "targetSdkVersion": 34
    }
  }
}
```

---

## ADDITIONAL RECOMMENDATIONS

### 14. Add Loading States & Error Handling

Currently implemented well in most screens, but ensure:

- All API calls have error handling ✅ (mostly done)
- Network errors show user-friendly messages ✅
- Retry mechanisms in place ✅

### 15. Accessibility

- Add accessibility labels to all buttons ⚠️ (partially done)
- Test with VoiceOver (iOS) and TalkBack (Android)
- Ensure minimum touch target size (44x44pt)

### 16. Performance

- Optimize images (use WebP format)
- Add image caching (expo-image)
- Lazy load video thumbnails

### 17. Analytics & Crash Reporting

Consider adding:

- Sentry for crash reporting
- Firebase Analytics (requires ATT permission)
- Or minimal custom analytics

---

## IMPLEMENTATION PRIORITY

### Phase 1: MUST FIX BEFORE SUBMISSION (1-2 days)

1. ✅ Create Privacy Policy & Terms of Service
2. ✅ Make privacy links functional
3. ✅ Add account deletion feature
4. ✅ Remove or implement social login buttons
5. ✅ Remove or implement profile options
6. ✅ Fill out Google Play Data Safety form

### Phase 2: SHOULD FIX (3-5 days)

7. ⚠️ Add forgot password functionality
8. ⚠️ Add content reporting
9. ⚠️ Add iOS permission descriptions
10. ⚠️ Prepare App Store screenshots & metadata
11. ⚠️ Remove reviewer credentials button

### Phase 3: NICE TO HAVE (ongoing)

12. 🔧 Improve accessibility
13. 🔧 Add analytics
14. 🔧 Performance optimizations
15. 🔧 Add settings functionality

---

## TESTING CHECKLIST

Before submission, test:

### Functionality

- [ ] Can create account
- [ ] Can login
- [ ] Can delete account
- [ ] Privacy policy links work
- [ ] Terms of service links work
- [ ] All visible buttons do something
- [ ] Videos play correctly
- [ ] Comments post successfully
- [ ] Likes/dislikes work
- [ ] Search works
- [ ] Navigation works throughout app

### App Store Specific

- [ ] App builds successfully for iOS
- [ ] TestFlight upload succeeds
- [ ] No missing permission descriptions
- [ ] Privacy policy is live and accessible
- [ ] Account deletion works
- [ ] All features shown in screenshots work
- [ ] App doesn't crash on launch

### Play Store Specific

- [ ] App builds successfully for Android
- [ ] Data Safety form completed
- [ ] Privacy policy linked in listing
- [ ] Target API level is current
- [ ] All permissions justified

---

## ESTIMATED TIMELINE

**Minimum viable fixes (Priority 1):** 1-2 days  
**Full compliance (Priority 1 + 2):** 3-5 days  
**Polish and improvements (All phases):** 1-2 weeks

---

## DEVELOPER NOTES

### Quick Wins

1. Remove social login buttons → Immediate fix
2. Remove non-functional profile options → 30 minutes
3. Create privacy policy using template → 2 hours
4. Add account deletion API + UI → 4-6 hours

### Backend Requirements

You'll need your backend team to implement:

- DELETE /api/v1/users/me (account deletion)
- Account deletion confirmation email
- Data export feature (optional but recommended)
- Content moderation/reporting endpoints

### Resources

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- [Terms & Conditions Generator](https://www.termsandconditionsgenerator.com/)

---

## CONCLUSION

Your app is well-built technically but has several **compliance gaps** that will **guarantee rejection** from both stores:

**Blockers:**

1. ❌ No functional privacy policy/terms
2. ❌ No account deletion
3. ❌ Non-functional social login buttons
4. ❌ Non-functional profile options

**Fix these 4 issues first**, then address the medium-priority items. The app's core functionality (video streaming, authentication, comments) works well and shouldn't cause issues.

Good luck with your submission! 🚀
