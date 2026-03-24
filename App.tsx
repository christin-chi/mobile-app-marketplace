import { useCallback, useEffect, useState } from "react";
import { useFonts } from "expo-font";
import FigmaRebrandScreen from "./src/screens/FigmaRebrandScreen";
import LoginSignupScreen from "./src/screens/LoginSignupScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { requestLocationPermissionAfterAuthIfNeeded } from "./src/location/requestLocationAfterAuth";
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from "./src/storage/onboardingStorage";

/** Set `EXPO_PUBLIC_FORCE_ONBOARDING=1` in `.env` or when starting Expo (see `.env.example`). */
const FORCE_ONBOARDING =
  process.env.EXPO_PUBLIC_FORCE_ONBOARDING === "true" ||
  process.env.EXPO_PUBLIC_FORCE_ONBOARDING === "1";

type AppRoute = "onboarding" | "auth" | "main";

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SeasonSansRegular: require("./assets/fonts/SeasonSans-TRIAL-Regular.ttf"),
    SeasonSansSemiBold: require("./assets/fonts/SeasonSans-TRIAL-SemiBold.ttf"),
    SeasonMixRegular: require("./assets/fonts/SeasonMix-TRIAL-Regular.ttf"),
    SeasonSerifRegular: require("./assets/fonts/SeasonSerif-TRIAL-Regular.ttf"),
  });

  const [storageReady, setStorageReady] = useState(false);
  const [route, setRoute] = useState<AppRoute | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOnboardingCompleted().then((done) => {
      if (!cancelled) {
        if (FORCE_ONBOARDING) {
          setRoute("onboarding");
        } else {
          setRoute(done ? "main" : "onboarding");
        }
        setStorageReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await setOnboardingCompleted();
    setRoute("auth");
  }, []);

  const handleAuthContinue = useCallback(async () => {
    setRoute("main");
    await requestLocationPermissionAfterAuthIfNeeded();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!storageReady || route === null) {
    return null;
  }

  if (route === "onboarding") {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onLogin={handleOnboardingComplete}
      />
    );
  }

  if (route === "auth") {
    return <LoginSignupScreen onContinue={handleAuthContinue} />;
  }

  return <FigmaRebrandScreen onLogout={() => setRoute("auth")} />;
}
