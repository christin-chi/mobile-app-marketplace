import { Platform } from "react-native";
import {
  getLocationPromptAfterAuthDone,
  setLocationPromptAfterAuthDone,
} from "../storage/locationPermissionStorage";

/**
 * First session after onboarding + sign-in / sign-up: ask for foreground location once.
 * No-op on web.
 *
 * `expo-location` is loaded only here (dynamic import) so the app still starts if the
 * native module isn't in the binary yet (e.g. Expo Go / old dev client). Rebuild with
 * `npx expo run:ios` / `expo run:android` after adding the module for the prompt to work.
 */
export async function requestLocationPermissionAfterAuthIfNeeded(): Promise<void> {
  if (Platform.OS === "web") return;

  const alreadyDone = await getLocationPromptAfterAuthDone();
  if (alreadyDone) return;

  try {
    const Location = await import("expo-location");
    await Location.requestForegroundPermissionsAsync();
  } catch {
    // Native module missing (rebuild required) or permission API failed — try again next auth→main.
    return;
  }

  await setLocationPromptAfterAuthDone();
}
