import { Animated, Image, type ImageSourcePropType, StyleSheet } from "react-native";

/**
 * Raster logo from `assets/individual-letters-logo.png` (exported from
 * `assets/Individual-letters.svg`). We use **Image + stretch** instead of
 * `react-native-svg` so the logo always renders: Fabric shows a pink
 * “Unimplemented” placeholder when the native `RNSVG*` views aren’t in the
 * binary (e.g. Expo Go built for a different SDK, or a dev client that wasn’t
 * rebuilt after adding SVG). After a fresh `npx expo run:ios`, you could swap
 * this back to vector paths if you need infinite sharpness when stretched.
 */
const LOGO_PNG = require("../../assets/individual-letters-logo.png") as ImageSourcePropType;

const src = Image.resolveAssetSource(LOGO_PNG);
export const GROW_LOGO_VIEWBOX_W = Math.max(src.width ?? 261, 1);
export const GROW_LOGO_VIEWBOX_H = Math.max(src.height ?? 146, 1);

type Props = {
  width?: number;
  height: Animated.AnimatedInterpolation<number> | Animated.Value;
  style?: object;
};

export function GrowLogoVector({
  width = GROW_LOGO_VIEWBOX_W,
  height,
  style,
}: Props) {
  return (
    <Animated.View
      accessibilityLabel="Grow"
      accessible
      collapsable={false}
      style={[
        { width, height, overflow: "hidden", backgroundColor: "transparent" },
        style,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        source={LOGO_PNG}
        style={styles.image}
        resizeMode="stretch"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
});
