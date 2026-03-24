import { useCallback, useRef, useState } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  GROW_LOGO_VIEWBOX_H,
  GROW_LOGO_VIEWBOX_W,
  GrowLogoVector,
} from "../components/GrowLogoVector";
import { OnboardingStep1Collage } from "../components/onboarding/OnboardingStep1Collage";
import { OnboardingStep2TherapyMerge } from "../components/onboarding/OnboardingStep2TherapyMerge";
import {
  body,
  displayMedium,
  eyebrow,
  primaryCtaLabel,
  secondaryCtaLabel,
} from "../theme/typography";

const FRAME_BACKGROUND = "#191916";
const CTA_BACKGROUND = "#f3ff00";

const GROW_LOGO_BASE_W = 72;
const GROW_LOGO_BASE_H =
  (GROW_LOGO_BASE_W * GROW_LOGO_VIEWBOX_H) / GROW_LOGO_VIEWBOX_W;

type Step = {
  eyebrow: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    eyebrow: "Welcome",
    title: "Therapy that fits your life",
    body: "Grow connects you with licensed therapists you can meet on your schedule—so getting support feels a little easier.",
  },
  {
    eyebrow: "Care",
    title: "Therapy and medication together",
    body: "Get therapy and medication support in one place.",
  },
  {
    eyebrow: "Your care",
    title: "Filters & full profiles",
    body: "Use filters to narrow your search, then open a profile to read more and book when you’re ready.",
  },
];

type Props = {
  onComplete: () => void | Promise<void>;
};

export default function OnboardingScreen({ onComplete }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const logoHeight = useRef(new Animated.Value(GROW_LOGO_BASE_H)).current;
  const [page, setPage] = useState(0);
  const lastIndex = STEPS.length - 1;

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(lastIndex, next));
      scrollRef.current?.scrollTo({
        x: clamped * screenW,
        animated: true,
      });
      setPage(clamped);
    },
    [lastIndex, screenW],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      setPage(Math.round(x / Math.max(screenW, 1)));
    },
    [screenW],
  );

  const handlePrimary = useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.logoWrap} accessibilityRole="header">
            <GrowLogoVector width={GROW_LOGO_BASE_W} height={logoHeight} />
          </View>
        </View>

        <View style={styles.body}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="none"
            accessibilityLabel="Onboarding steps"
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {STEPS.map((step, i) => (
              <View
                key={i}
                style={[
                  styles.page,
                  i === 0 && styles.pageStep1Bleed,
                  i === 1 && styles.pageStep2Bleed,
                  {
                    width: screenW,
                    minHeight:
                      i === 0
                        ? screenH * 0.52
                        : i === 1
                          ? screenH * 0.52
                          : screenH * 0.48,
                  },
                ]}
              >
                {i === 0 ? (
                  <OnboardingStep1Collage
                    isActive={page === 0}
                    screenW={screenW}
                    screenH={screenH}
                  />
                ) : i === 1 ? (
                  <OnboardingStep2TherapyMerge isActive={page === 1} screenW={screenW} />
                ) : (
                  <>
                    <Text style={[eyebrow, styles.stepEyebrow]}>{step.eyebrow}</Text>
                    <Text style={[displayMedium, styles.stepTitle]}>{step.title}</Text>
                    <Text style={[body, styles.stepBody]}>{step.body}</Text>
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots} accessibilityRole="tablist">
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === page && styles.dotActive]}
                accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}
                accessibilityState={{ selected: i === page }}
              />
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              onPress={() => {
                void handleSkip();
              }}
              style={({ pressed }) => [
                styles.outlineBtn,
                pressed && styles.outlineBtnPressed,
              ]}
            >
              <Text style={secondaryCtaLabel}>Skip</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get started"
              accessibilityHint="Opens sign in or create account"
              onPress={handlePrimary}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={primaryCtaLabel}>Get started</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FRAME_BACKGROUND,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoWrap: {
    alignItems: "flex-start",
  },
  body: {
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    justifyContent: "center",
  },
  /** Step 1 collage: full width so corner images align with screen edges */
  pageStep1Bleed: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  /** Step 2 hero: full-bleed image row */
  pageStep2Bleed: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  stepEyebrow: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 36,
    lineHeight: 42,
    marginBottom: 16,
  },
  stepBody: {
    maxWidth: 520,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  dotActive: {
    backgroundColor: "#ffffff",
    transform: [{ scale: 1.35 }],
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  outlineBtnPressed: {
    opacity: 0.88,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  primaryBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    backgroundColor: CTA_BACKGROUND,
  },
  primaryBtnPressed: {
    opacity: 0.88,
  },
});
