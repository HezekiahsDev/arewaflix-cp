#!/bin/bash

# ATT Implementation Verification Script
# Run this script to verify ATT is properly configured

echo "🔍 Verifying App Tracking Transparency Implementation..."
echo ""

# Check if package is installed
echo "✓ Checking package.json for expo-tracking-transparency..."
if grep -q "expo-tracking-transparency" package.json; then
    echo "  ✅ expo-tracking-transparency is installed"
else
    echo "  ❌ expo-tracking-transparency is NOT installed"
    exit 1
fi

# Check if plugin is in app.json
echo "✓ Checking app.json for expo-tracking-transparency plugin..."
if grep -q "expo-tracking-transparency" app.json; then
    echo "  ✅ Plugin is configured in app.json"
else
    echo "  ❌ Plugin is NOT configured in app.json"
    exit 1
fi

# Check if NSUserTrackingUsageDescription is set
echo "✓ Checking app.json for NSUserTrackingUsageDescription..."
if grep -q "NSUserTrackingUsageDescription" app.json; then
    echo "  ✅ Usage description is set"
    echo "  Message: $(grep -A 1 'NSUserTrackingUsageDescription' app.json | tail -1 | sed 's/.*: "//;s/",//')"
else
    echo "  ❌ Usage description is NOT set"
    exit 1
fi

# Check if tracking-transparency.ts exists
echo "✓ Checking for tracking-transparency.ts module..."
if [ -f "lib/tracking-transparency.ts" ]; then
    echo "  ✅ ATT utility module exists"
else
    echo "  ❌ ATT utility module is missing"
    exit 1
fi

# Check if device-fingerprint.ts imports tracking
echo "✓ Checking device-fingerprint.ts imports..."
if grep -q "tracking-transparency" lib/device-fingerprint.ts; then
    echo "  ✅ device-fingerprint.ts imports tracking module"
else
    echo "  ❌ device-fingerprint.ts does NOT import tracking module"
    exit 1
fi

# Check if requestTrackingPermission is called
echo "✓ Checking if ATT permission is requested..."
if grep -q "requestTrackingPermission" lib/device-fingerprint.ts; then
    echo "  ✅ Permission request is implemented"
else
    echo "  ❌ Permission request is NOT implemented"
    exit 1
fi

echo ""
echo "🎉 All checks passed! ATT implementation is complete."
echo ""
echo "Next steps:"
echo "  1. Run: npx expo prebuild --clean"
echo "  2. Test on iOS device (14.5+)"
echo "  3. Build: eas build --platform ios"
echo "  4. Submit to App Store"
echo ""
