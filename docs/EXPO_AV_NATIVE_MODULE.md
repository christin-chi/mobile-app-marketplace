# Video in the profile gallery (`expo-video`)

The gallery uses **`expo-video`** (SDK 55–aligned), not `expo-av`.

Older errors like **`Cannot find native module 'ExponentAV'`** came from **`expo-av`**, which still referenced legacy `ExpoModulesCore` headers (`EXEventEmitter.h`) that were removed in **expo-modules-core 55**. That mismatch broke iOS builds.

## Building iOS

After dependency changes, clean and rebuild native code:

```bash
cd ios && pod install && cd ..
npx expo run:ios
```

If `ios/` already exists and you still see stale errors:

```bash
rm -rf ios/build ios/Pods ios/Podfile.lock
npx expo prebuild --clean
npx expo run:ios
```

## Expo Go vs dev build

For any native module, use a **development build** (`npx expo run:ios`) when Expo Go’s binary doesn’t match your SDK, or use an **updated Expo Go** from the App Store.
