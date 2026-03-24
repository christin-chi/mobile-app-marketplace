import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@grow_therapy/onboarding_completed";

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}

/** Dev / QA: clear onboarding so it shows again */
export async function clearOnboardingCompleted(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
