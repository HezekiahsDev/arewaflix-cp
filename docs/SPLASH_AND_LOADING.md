# Animated Splash Screen & Skeleton Loading

This document explains the animated splash screen and skeleton loading features implemented in Arewaflix.

## 1. Animated Splash Screen

### Overview

An animated splash screen displays when the app first launches, showing the Arewaflix logo with smooth animations before transitioning to the main app.

### Implementation Details

- **Location**: `components/AnimatedSplashScreen.tsx`
- **Duration**: ~3 seconds total
- **Animations**:
  - Logo scales up with spring animation
  - Logo and text fade in
  - Everything fades out before transitioning to main app
- **Built with**: React Native Reanimated for smooth 60fps animations

### Usage

The splash screen is automatically integrated in `app/_layout.tsx` and will show on every app launch.

### Customization

To customize the splash screen, edit `components/AnimatedSplashScreen.tsx`:

```typescript
// Change animation duration
setTimeout(() => {
  logoOpacity.value = withTiming(0, { duration: 400 });
  // ...
}, 2500); // Change this value (in milliseconds)

// Change colors
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a", // Change background color
  },
  title: {
    color: "#ffffff", // Change title color
  },
});
```

## 2. Skeleton Loading

### Overview

Skeleton loaders provide a better user experience by showing placeholders that mimic the actual content layout while data is loading.

### Components Available

#### `SkeletonLoader` (Base Component)

A basic shimmer effect loader that can be customized:

```typescript
<SkeletonLoader
  width={200}
  height={100}
  borderRadius={12}
/>
```

#### `VideoCardSkeleton`

Skeleton for individual video cards with thumbnail and metadata.

#### `VideoRailSkeleton`

Skeleton for horizontal scrolling video rails (shows 3 cards).

#### `ShortsRailSkeleton`

Skeleton for shorts rail (shows 4 vertical cards).

#### `FeaturedVideoSkeleton`

Skeleton for the large featured video card at the top.

#### `HomeScreenSkeleton`

Complete skeleton for the entire home screen, including:

- Featured video
- Shorts section
- Trending section
- Categories chips
- Top videos section

### Usage

In your screen component:

```typescript
import { HomeScreenSkeleton } from "@/components/ui/SkeletonLoader";

function MyScreen() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  return <YourActualContent />;
}
```

Or use individual components:

```typescript
import { VideoRailSkeleton, ShortsRailSkeleton } from "@/components/ui/SkeletonLoader";

function MyComponent() {
  return (
    <View>
      <Text>Trending Videos</Text>
      {loading ? <VideoRailSkeleton /> : <VideoRail videos={videos} />}

      <Text>Shorts</Text>
      {loading ? <ShortsRailSkeleton /> : <ShortsRail items={shorts} />}
    </View>
  );
}
```

### Features

- **Smooth shimmer effect**: Animated opacity changes create a loading effect
- **Dark mode support**: Automatically adapts to dark/light themes
- **Performance optimized**: Uses Reanimated for 60fps animations
- **Reusable**: Individual skeleton components can be used anywhere

## Implementation in Home Screen

The home screen (`app/(tabs)/index.tsx`) has been updated to show skeleton loading:

```typescript
if (loading && !hasData) {
  return <HomeScreenSkeleton />;
}
```

This provides immediate visual feedback while:

- Fetching featured videos
- Loading trending content
- Retrieving shorts
- Loading top videos

## Benefits

1. **Better UX**: Users see content placeholders instead of blank screens
2. **Perceived Performance**: App feels faster even if loading takes the same time
3. **Professional Look**: Modern apps use skeleton loading (YouTube, Instagram, etc.)
4. **Reduced Bounce Rate**: Users are less likely to leave during loading

## Additional Notes

- Both features use `react-native-reanimated` which is already installed
- Skeleton loaders automatically respect your app's dark/light theme
- The splash screen only shows once when the app launches
- Skeleton loading appears whenever content is being fetched (including pull-to-refresh)
