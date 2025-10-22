# Auto-Refresh Comments Feature

## Overview

The player screen now automatically refreshes the comments section at safe intervals to keep the content up-to-date without requiring user interaction.

## Implementation Details

### Refresh Interval

- **Interval**: 30 seconds (`COMMENTS_REFRESH_INTERVAL = 30000`)
- **Safe for**: Production use with minimal server load
- **Adjustable**: Can be configured based on video popularity or server capacity

### Silent Background Updates

The auto-refresh feature works silently in the background:

- ✅ No loading spinners shown during periodic updates
- ✅ No error messages displayed for background fetch failures
- ✅ Seamless UI updates - comments appear naturally
- ✅ User experience is not disrupted

### How It Works

#### 1. Initial Load

When the video player opens:

- Shows loading indicator
- Fetches comments (page 1)
- Fetches likes and user reaction
- Displays any errors if initial load fails

#### 2. Periodic Refresh

Every 30 seconds:

- Silently fetches fresh comments (page 1)
- Updates the comments list in the background
- No loading indicators shown
- Errors are silently ignored (doesn't disrupt viewing)
- Previous error messages are preserved (only cleared on successful user action)

#### 3. User Actions

When user posts a comment:

- Shows loading indicator
- Posts the comment
- Refreshes comments immediately
- Shows errors if posting fails

### Code Structure

```typescript
// Configurable constant
const COMMENTS_REFRESH_INTERVAL = 30000; // 30 seconds

// Reusable refresh function with silent mode
const refreshComments = useCallback(
  async (signal?: AbortSignal, silent = false) => {
    // silent = true: No loading states, no error messages
    // silent = false: Show loading, show errors (user-initiated)
  },
  [videoId, commentsError]
);

// Auto-refresh effect
useEffect(() => {
  const intervalId = setInterval(() => {
    refreshComments(undefined, true); // silent mode
  }, COMMENTS_REFRESH_INTERVAL);

  return () => clearInterval(intervalId);
}, [videoId, refreshComments]);
```

### Benefits

1. **Real-time Feel**: Users see new comments as they're posted by others
2. **No Disruption**: Silent updates don't interrupt video watching
3. **Battery Efficient**: 30-second interval is reasonable for mobile devices
4. **Server Friendly**: Reasonable request rate (2 requests per minute per viewer)
5. **Graceful Degradation**: Network failures don't show errors or interrupt viewing

### Customization Options

You can adjust the refresh interval based on:

- **High traffic videos**: Reduce to 15-20 seconds for more active discussions
- **Low traffic content**: Increase to 60 seconds to reduce server load
- **Live events**: Reduce to 10 seconds for real-time engagement
- **Battery saving mode**: Increase to 60+ seconds or pause when video is paused

### Example Configurations

```typescript
// Very active content (live streams, trending videos)
const COMMENTS_REFRESH_INTERVAL = 15000; // 15 seconds

// Normal content (default)
const COMMENTS_REFRESH_INTERVAL = 30000; // 30 seconds

// Low activity or battery saving
const COMMENTS_REFRESH_INTERVAL = 60000; // 60 seconds
```

### Future Enhancements

Potential improvements:

1. **Adaptive intervals**: Adjust refresh rate based on comment velocity
2. **Pause when paused**: Stop refreshing when video is paused
3. **WebSocket support**: Real-time push notifications for new comments
4. **Smart batching**: Group requests with likes/dislikes updates
5. **Visibility aware**: Only refresh when app is in foreground

## Testing

Test scenarios:

1. ✅ Open video player → Comments load initially
2. ✅ Wait 30 seconds → Comments refresh silently
3. ✅ Post a comment → Comments refresh immediately with loading state
4. ✅ Network offline during interval → No error shown, previous comments remain
5. ✅ Multiple videos → Each player has independent refresh cycle
6. ✅ Close player → Interval is cleared (no memory leaks)

## Performance Impact

- **Network**: ~2 API calls per minute per viewer
- **Memory**: Minimal (replaces existing comment array)
- **CPU**: Negligible (simple state update)
- **Battery**: Low impact with 30-second interval
