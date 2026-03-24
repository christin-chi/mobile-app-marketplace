import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HERO = require("../../../assets/onboarding/step2.png");

const START_DELAY_MS = 140;
const RESOLVE_DURATION_MS = 1200;
const RESOLVE_EASING = Easing.bezier(0.4, 0, 0.14, 1);

/** Fraction of screen width — hero starts further down + left, then eases in */
const HERO_START_TX_FRAC = -0.2;
const HERO_START_TY_FRAC = 0.34;
/** When resolve crosses this, tiles drop below the hero so motion reads “behind” the largest image */
const TILES_BEHIND_RESOLVE = 0.24;

const HEADLINE = "Get therapy and medication\nsupport in one place";

type Props = {
  isActive: boolean;
  screenW: number;
};

/**
 * Step 2: full-bleed hero starts further offscreen and slides in. Smaller tiles sit
 * above it first, then z-order swaps so they move behind the largest image as they
 * animate away.
 */
export function OnboardingStep2TherapyMerge({ isActive, screenW }: Props) {
  const resolve = useRef(new Animated.Value(0)).current;
  const runId = useRef(0);
  const tilesBehindRef = useRef(false);
  const [tilesBehindLargest, setTilesBehindLargest] = useState(false);

  const imageW = useMemo(() => Math.max(0, screenW), [screenW]);
  const w = imageW;

  const {
    heroTx,
    heroTy,
    layer1Opacity,
    layer1Scale,
    layer1Tx,
    layer1Ty,
    layer2Opacity,
    layer2Scale,
    layer2Tx,
    layer2Ty,
    textOpacity,
  } = useMemo(() => {
    const t = (x: number) => x * w;
    return {
      heroTx: resolve.interpolate({
        inputRange: [0, 0.44, 1],
        outputRange: [t(HERO_START_TX_FRAC), 0, 0],
        extrapolate: "clamp",
      }),
      heroTy: resolve.interpolate({
        inputRange: [0, 0.44, 1],
        outputRange: [t(HERO_START_TY_FRAC), 0, 0],
        extrapolate: "clamp",
      }),
      layer1Tx: resolve.interpolate({
        inputRange: [0, 0.38, 1],
        outputRange: [0, t(-0.15), t(-0.15)],
        extrapolate: "clamp",
      }),
      layer1Ty: resolve.interpolate({
        inputRange: [0, 0.38, 1],
        outputRange: [0, t(0.11), t(0.11)],
        extrapolate: "clamp",
      }),
      layer1Scale: resolve.interpolate({
        inputRange: [0, 0.38, 1],
        outputRange: [1, 0.86, 0.86],
        extrapolate: "clamp",
      }),
      layer1Opacity: resolve.interpolate({
        inputRange: [0, 0.48, 0.62, 1],
        outputRange: [1, 1, 0, 0],
        extrapolate: "clamp",
      }),
      layer2Tx: resolve.interpolate({
        inputRange: [0, 0.12, 0.44, 1],
        outputRange: [0, 0, t(-0.1), t(-0.1)],
        extrapolate: "clamp",
      }),
      layer2Ty: resolve.interpolate({
        inputRange: [0, 0.12, 0.44, 1],
        outputRange: [0, 0, t(0.075), t(0.075)],
        extrapolate: "clamp",
      }),
      layer2Scale: resolve.interpolate({
        inputRange: [0, 0.12, 0.44, 1],
        outputRange: [1, 1, 0.9, 0.9],
        extrapolate: "clamp",
      }),
      layer2Opacity: resolve.interpolate({
        inputRange: [0, 0.52, 0.68, 1],
        outputRange: [1, 1, 0, 0],
        extrapolate: "clamp",
      }),
      textOpacity: resolve.interpolate({
        inputRange: [0, 0.72, 0.92, 1],
        outputRange: [0, 0, 1, 1],
        extrapolate: "clamp",
      }),
    };
  }, [resolve, w]);

  useEffect(() => {
    if (!isActive) {
      resolve.setValue(0);
      tilesBehindRef.current = false;
      setTilesBehindLargest(false);
      return;
    }

    const id = ++runId.current;
    resolve.setValue(0);
    tilesBehindRef.current = false;
    setTilesBehindLargest(false);

    const anim = Animated.sequence([
      Animated.delay(START_DELAY_MS),
      Animated.timing(resolve, {
        toValue: 1,
        duration: RESOLVE_DURATION_MS,
        easing: RESOLVE_EASING,
        useNativeDriver: true,
      }),
    ]);

    const sub = resolve.addListener(({ value }) => {
      if (value >= TILES_BEHIND_RESOLVE && !tilesBehindRef.current) {
        tilesBehindRef.current = true;
        setTilesBehindLargest(true);
      }
    });

    anim.start(({ finished }) => {
      if (finished && id !== runId.current) return;
    });

    return () => {
      anim.stop();
      resolve.removeListener(sub);
    };
  }, [isActive, resolve]);

  const imgProps = Platform.OS === "android" ? ({ resizeMethod: "resize" } as const) : {};

  return (
    <View style={styles.root} accessibilityRole="none">
      <View style={[styles.imageBlock, { width: imageW }]}>
        {/* Full-bleed final crop; starts slightly offscreen and eases into place */}
        <Animated.View
          style={[
            styles.heroBase,
            tilesBehindLargest ? styles.heroBaseOnTop : styles.heroBaseBelowTiles,
            {
              transform: [{ translateX: heroTx }, { translateY: heroTy }],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={HERO}
            style={styles.heroBaseImage}
            resizeMode="cover"
            {...imgProps}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.layerSmall,
            tilesBehindLargest ? styles.tileBehindHero : styles.tileAboveHero,
            {
              opacity: layer1Opacity,
              transform: [
                { translateX: layer1Tx },
                { translateY: layer1Ty },
                { scale: layer1Scale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Image source={HERO} style={styles.tileImage} resizeMode="cover" {...imgProps} accessibilityIgnoresInvertColors />
        </Animated.View>

        <Animated.View
          style={[
            styles.layerMed,
            tilesBehindLargest ? styles.tileMedBehindHero : styles.tileMedAboveHero,
            {
              opacity: layer2Opacity,
              transform: [
                { translateX: layer2Tx },
                { translateY: layer2Ty },
                { scale: layer2Scale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Image source={HERO} style={styles.tileImage} resizeMode="cover" {...imgProps} accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>

      <Animated.Text
        style={[styles.headline, { opacity: textOpacity }]}
        accessibilityRole="text"
      >
        {HEADLINE}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignItems: "center",
    paddingTop: 4,
  },
  imageBlock: {
    position: "relative",
    aspectRatio: 1.05,
    alignSelf: "center",
    marginBottom: 22,
    backgroundColor: "#191916",
    overflow: "hidden",
  },
  heroBase: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: "#191916",
  },
  heroBaseBelowTiles: {
    zIndex: 0,
    ...Platform.select({ android: { elevation: 0 }, default: {} }),
  },
  heroBaseOnTop: {
    zIndex: 4,
    ...Platform.select({ android: { elevation: 10 }, default: {} }),
  },
  tileAboveHero: {
    zIndex: 2,
    ...Platform.select({ android: { elevation: 6 }, default: {} }),
  },
  tileBehindHero: {
    zIndex: 1,
    ...Platform.select({ android: { elevation: 2 }, default: {} }),
  },
  tileMedAboveHero: {
    zIndex: 3,
    ...Platform.select({ android: { elevation: 8 }, default: {} }),
  },
  tileMedBehindHero: {
    zIndex: 2,
    ...Platform.select({ android: { elevation: 3 }, default: {} }),
  },
  heroBaseImage: {
    width: "100%",
    height: "100%",
  },
  layerSmall: {
    position: "absolute",
    top: "7%",
    right: "5%",
    width: "30%",
    aspectRatio: 1.05,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#191916",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      default: {},
    }),
  },
  layerMed: {
    position: "absolute",
    top: "13%",
    right: "17%",
    width: "44%",
    aspectRatio: 1.05,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#191916",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  headline: {
    fontFamily: "SeasonSerifRegular",
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: "#ffffff",
    textAlign: "center",
    paddingHorizontal: 12,
    ...(Platform.OS === "android"
      ? ({ includeFontPadding: false } as const)
      : {}),
  },
});
