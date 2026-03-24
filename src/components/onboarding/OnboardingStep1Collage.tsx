import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** Same aspect ratio (square) for all four — scattered sizes scale from one base */
const ASPECT = 1;

/** Final layout: nudge top row down & bottom row up (px) for center copy breathing room */
const FINAL_ROW_INSET = 24;

/** Final square size as a fraction of min(container width, height) */
const FINAL_SIZE_FRAC = 0.3;

/** Hold scattered “start” layout before animating to the grid (ms) */
const START_HOLD_MS = 2000;

const SOURCES: ImageSourcePropType[] = [
  require("../../../assets/onboarding/photo-0.png"),
  require("../../../assets/onboarding/photo-1.png"),
  require("../../../assets/onboarding/photo-2.png"),
  require("../../../assets/onboarding/photo-3.png"),
];

type Layout = { w: number; h: number };

type ScatteredSpec = {
  /** position as fraction of container [0–1] */
  x: number;
  y: number;
  /** size as fraction of min(w,h) */
  sizeFrac: number;
};

/**
 * Starting collage — strong size contrast (same square proportion).
 * Portrait: x + sizeFrac ≤ 1 (width uses base = min(w,h)).
 * Landscape: y + sizeFrac ≤ 1 for tall tiles (height uses same base).
 */
const SCATTERED: ScatteredSpec[] = [
  { x: 0.02, y: 0.04, sizeFrac: 0.68 },
  { x: 0.68, y: 0.17, sizeFrac: 0.16 },
  { x: 0.08, y: 0.46, sizeFrac: 0.26 },
  /** y nudged up so sizeFrac can grow without breaking y + sizeFrac ≤ 1 in landscape */
  { x: 0.38, y: 0.38, sizeFrac: 0.62 },
];

type Props = {
  /** When true (user on step 1), play or replay the intro animation */
  isActive: boolean;
  screenW: number;
  screenH: number;
};

export function OnboardingStep1Collage({
  isActive,
  screenW,
  screenH,
}: Props) {
  const [layout, setLayout] = useState<Layout>({ w: 0, h: 0 });
  const progress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const runId = useRef(0);

  const base = useMemo(() => {
    const { w, h } = layout;
    if (w <= 0 || h <= 0) return null;
    return Math.min(w, h);
  }, [layout]);

  const finals = useMemo(() => {
    const { w, h } = layout;
    if (!base || w <= 0) return null;
    /** Flush to left/right; top & bottom rows inset vertically */
    const finalSize = Math.min(w, h) * FINAL_SIZE_FRAC;
    const topY = FINAL_ROW_INSET;
    const bottomY = h - finalSize - FINAL_ROW_INSET;
    return {
      finalSize,
      positions: [
        { left: 0, top: topY },
        { left: w - finalSize, top: topY },
        { left: 0, top: bottomY },
        { left: w - finalSize, top: bottomY },
      ],
    };
  }, [base, layout]);

  const initials = useMemo(() => {
    const { w, h } = layout;
    if (!base || w <= 0) return null;
    return SCATTERED.map((spec) => {
      const size = base * spec.sizeFrac;
      return {
        left: spec.x * w,
        top: spec.y * h,
        width: size,
        height: size / ASPECT,
      };
    });
  }, [base, layout.h, layout.w]);

  useEffect(() => {
    if (!initials || !finals || !isActive || layout.w <= 0) return;

    const id = ++runId.current;
    progress.setValue(0);
    textOpacity.setValue(0);

    const anim = Animated.sequence([
      Animated.delay(START_HOLD_MS),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    anim.start(({ finished }) => {
      if (finished && id !== runId.current) return;
    });

    return () => {
      anim.stop();
    };
  }, [isActive, finals, initials, layout.w, progress, textOpacity]);

  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ w: width, h: height });
  };

  if (!initials || !finals) {
    return (
      <View
        style={[styles.fill, { minHeight: screenH * 0.52 }]}
        onLayout={onLayout}
      />
    );
  }

  return (
    <View
      style={[styles.fill, { minHeight: screenH * 0.52 }]}
      onLayout={onLayout}
      accessibilityRole="none"
      accessibilityLabel="Welcome collage"
    >
      {SOURCES.map((source, i) => {
        const init = initials[i];
        const fin = finals.positions[i];
        const fs = finals.finalSize;

        const left = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [init.left, fin.left],
        });
        const top = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [init.top, fin.top],
        });
        const width = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [init.width, fs],
        });
        const height = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [init.height, fs / ASPECT],
        });

        return (
          <Animated.View
            key={i}
            collapsable={false}
            style={[
              styles.imageWrap,
              {
                left,
                top,
                width,
                height,
              },
            ]}
          >
            <View style={styles.tileImageSlot} pointerEvents="none">
              <Image
                source={source}
                style={styles.tileImage}
                resizeMode="contain"
                {...(Platform.OS === "android"
                  ? ({ resizeMethod: "resize" } as const)
                  : {})}
                accessibilityIgnoresInvertColors
              />
            </View>
          </Animated.View>
        );
      })}

      <Animated.View
        style={[styles.centerTextWrap, { opacity: textOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.centerText}>
          Make more space{"\n"}for the good stuff.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    position: "relative",
  },
  imageWrap: {
    position: "absolute",
    overflow: "hidden",
    /** Matches onboarding frame so letterboxing (contain) isn’t a harsh edge */
    backgroundColor: "#191916",
  },
  /** Inner slot so the image has a stable layout box inside the animated tile. */
  tileImageSlot: {
    ...StyleSheet.absoluteFillObject,
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  centerTextWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  centerText: {
    fontFamily: "SeasonSerifRegular",
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: "#ffffff",
    textAlign: "center",
    ...(Platform.OS === "android"
      ? ({ includeFontPadding: false } as const)
      : {}),
  },
});
