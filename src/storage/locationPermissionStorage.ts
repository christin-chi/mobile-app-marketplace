import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@grow_therapy/location_prompt_after_auth_done";

/** After onboarding + auth, we ask for location once; this remembers we already did. */
export async function getLocationPromptAfterAuthDone(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "true";
  } catch {
    return false;
  }
}

export async function setLocationPromptAfterAuthDone(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}
