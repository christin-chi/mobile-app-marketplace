import { BlurView } from "expo-blur";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { ProfileDetails } from "../data/profileDetails";
import { getGalleryMediaForProfile } from "../data/profileGallery";
import type { Profile } from "../types/profile";
import {
  body,
  displayMedium,
  primaryCtaLabel,
  sectionTitle,
} from "../theme/typography";
import { GalleryVideoCell } from "./GalleryVideoCell";

export type ProfileCardOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  open: boolean;
  /** Window coordinates from `measureInWindow` — drives expand/collapse animation */
  origin?: ProfileCardOrigin | null;
  profile: Profile;
  details: ProfileDetails;
  onDismiss: () => void;
  /** Called when the user taps “Book session” under the gallery */
  onBookSessionPress?: () => void;
};

/** Matches explore card primary CTA (`FigmaRebrandScreen`) */
const BOOK_SESSION_CTA_BG = "#f3ff00";

/** Matches explore floating card while expanding */
const SHELL_BG = "#010204";

/** Horizontal padding for profile scroll body — gallery bleeds past this to screen edges */
const SCROLL_CONTENT_PADDING_H = 24;

/** Fixed row height; each image width follows its original aspect ratio */
const GALLERY_ROW_HEIGHT = 260;

const springOpen = {
  tension: 78,
  friction: 12,
  useNativeDriver: false,
} as const;

/**
 * Display size for one gallery image: fixed height, width from intrinsic aspect ratio.
 */
function galleryImageSizeForRowHeight(
  source: ImageSourcePropType,
  rowHeight: number,
): { width: number; height: number } {
  const meta = Image.resolveAssetSource(source);
  const iw = meta.width ?? 0;
  const ih = meta.height ?? 0;
  if (iw <= 0 || ih <= 0) {
    /** Bundled assets always have size; remote URIs may not until loaded — 4:3 fallback */
    return { width: rowHeight * (4 / 3), height: rowHeight };
  }
  const width = (iw / ih) * rowHeight;
  return { width, height: rowHeight };
}

export function ProfileExpandOverlay({
  open,
  origin,
  profile,
  details,
  onDismiss,
  onBookSessionPress,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const fallbackOrigin = useMemo(
    () => ({
      x: 24,
      y: Math.max(0, screenH - 260),
      width: Math.max(0, screenW - 48),
      height: 220,
    }),
    [screenW, screenH],
  );

  const o = origin ?? fallbackOrigin;

  const finalH = screenH;
  const finalY = 0;
  const finalX = 0;
  const finalW = screenW;

  /** Bundled gallery + optional `profile.galleryImages` override (images only). */
  const galleryItems = getGalleryMediaForProfile(profile);

  useEffect(() => {
    if (!open) {
      closingRef.current = false;
      progress.setValue(0);
      backdrop.setValue(0);
      contentOpacity.setValue(0);
      return;
    }

    closingRef.current = false;
    progress.setValue(0);
    backdrop.setValue(0);
    contentOpacity.setValue(0);

    const t = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(progress, { toValue: 1, ...springOpen }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 280,
          delay: 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(t);
  }, [open, origin, progress, backdrop, contentOpacity]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: 320,
        useNativeDriver: false,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      closingRef.current = false;
      if (finished) onDismiss();
    });
  }, [progress, backdrop, contentOpacity, onDismiss]);

  const shellStyle = useMemo(
    () => ({
      position: "absolute" as const,
      top: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [o.y, finalY],
      }),
      left: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [o.x, finalX],
      }),
      width: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [o.width, finalW],
      }),
      height: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [o.height, finalH],
      }),
      borderRadius: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [32, 0],
      }),
      backgroundColor: SHELL_BG,
      overflow: "hidden" as const,
    }),
    [progress, o.x, o.y, o.width, o.height, finalY, finalX, finalW, finalH],
  );

  if (!open) {
    return null;
  }

  return (
    <Modal
      visible={open}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.55)",
              opacity: backdrop,
            },
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss profile"
          onPress={handleClose}
        />
        <Animated.View style={[shellStyle, styles.shellElevated]}>
          <Animated.View
            style={[styles.sheetInner, { opacity: contentOpacity }]}
          >
            <SafeAreaView style={styles.safeFill}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close profile"
                onPress={handleClose}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeGlassOuter,
                  pressed && styles.closeGlassPressed,
                ]}
              >
                <View style={styles.closeGlassClip} pointerEvents="none">
                  {Platform.OS === "web" ? (
                    <>
                      <View
                        style={[
                          StyleSheet.absoluteFillObject,
                          styles.closeGlassFallback,
                        ]}
                      />
                      <View
                        style={styles.closeGlassSheen}
                        pointerEvents="none"
                      />
                    </>
                  ) : (
                    <>
                      <BlurView
                        intensity={68}
                        tint="dark"
                        style={styles.closeBlurFill}
                        {...(Platform.OS === "android"
                          ? { blurMethod: "dimezisBlurViewSdk31Plus" as const }
                          : {})}
                      />
                      <View
                        style={styles.closeGlassSheen}
                        pointerEvents="none"
                      />
                    </>
                  )}
                </View>
                <View style={styles.closeIconLayer} pointerEvents="none">
                  <Text style={styles.closeX} accessibilityElementsHidden>
                    ×
                  </Text>
                </View>
              </Pressable>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces
              >
                <Text
                  style={[
                    displayMedium,
                    styles.profileHeadlineLine,
                    styles.profileName,
                  ]}
                >
                  {profile.displayName}
                </Text>
                <Text style={[body, styles.profileTagline]}>
                  A solution oriented, open-minded therapist supporting adults
                  navigating anxiety and depression
                </Text>
                <View style={styles.infoGrid}>
                  <View style={[styles.infoRow, styles.infoRowFirst]}>
                    <View style={[styles.infoCellLeft, styles.infoCellLeftRow]}>
                      <Text style={[styles.infoCellText, styles.infoLicenseUnit]}>
                        LMFT
                      </Text>
                      <Text style={[styles.infoCellText, styles.infoRatingUnit]}>
                        {"★\u00A04.8\u00A0(20)"}
                      </Text>
                    </View>
                    <View style={styles.infoCellRight}>
                      <Text style={[styles.infoCellText, styles.infoCellRightText]}>
                        Next virtual appointment
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.infoRow, styles.infoRowSecond]}>
                    <View style={styles.infoCellLeft}>
                      <Text style={[styles.infoCellText, styles.infoCellLeftText]}>
                        8 years of experience
                      </Text>
                    </View>
                    <View style={styles.infoCellRight}>
                      <Text style={[styles.infoCellText, styles.infoCellRightText]}>
                        Mon, Mar 23 at 10 AM
                      </Text>
                    </View>
                  </View>
                </View>
                {galleryItems.length > 0 ? (
                  <View
                    style={styles.gallerySection}
                    accessibilityRole="none"
                    accessibilityLabel="Photo and video gallery"
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled
                      contentContainerStyle={styles.galleryScrollContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      {galleryItems.map((item, index) => {
                        const label = `Gallery item ${index + 1} of ${galleryItems.length}`;
                        if (item.kind === "image") {
                          const { width, height } = galleryImageSizeForRowHeight(
                            item.source,
                            GALLERY_ROW_HEIGHT,
                          );
                          return (
                            <Image
                              key={`${profile.id}-gallery-${index}`}
                              source={item.source}
                              style={[
                                styles.galleryThumb,
                                { width, height },
                              ]}
                              resizeMode="cover"
                              accessibilityLabel={label}
                            />
                          );
                        }
                        return (
                          <GalleryVideoCell
                            key={`${profile.id}-gallery-${index}`}
                            source={item.source}
                            rowHeight={GALLERY_ROW_HEIGHT}
                            thumbStyle={styles.galleryThumb}
                            accessibilityLabel={label}
                          />
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                <View style={styles.bookSessionSection}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Book session"
                    accessibilityHint="Opens booking for this therapist"
                    onPress={() => onBookSessionPress?.()}
                    style={({ pressed }) => [
                      styles.bookSessionButton,
                      pressed && styles.bookSessionButtonPressed,
                    ]}
                  >
                    <Text style={primaryCtaLabel}>Book session</Text>
                  </Pressable>
                </View>
                <Text style={[sectionTitle, styles.blockGap]}>Intro</Text>
                <Text style={[body, styles.para]}>{details.intro}</Text>
                <Text style={[sectionTitle, styles.blockGap]}>About</Text>
                <Text style={[body, styles.para]}>{details.about}</Text>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  shellElevated: {
    zIndex: 1,
  },
  sheetInner: {
    flex: 1,
    minHeight: 120,
  },
  safeFill: {
    flex: 1,
  },
  /** Matches explore filter chip — blur + sheen, no harsh ring */
  closeGlassOuter: {
    alignSelf: "flex-end",
    marginRight: 16,
    marginTop: 4,
    marginBottom: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    overflow: "visible",
  },
  closeGlassClip: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    top: 2,
    left: 2,
  },
  closeBlurFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  closeGlassFallback: {
    borderRadius: 20,
    backgroundColor: "rgba(28, 28, 26, 0.72)",
  },
  closeGlassSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  closeIconLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  closeGlassPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  closeX: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "300",
    lineHeight: 28,
    marginTop: -2,
    textAlign: "center",
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: SCROLL_CONTENT_PADDING_H,
    paddingBottom: 40,
  },
  /** Name (64px Season Mix) */
  profileHeadlineLine: {
    fontSize: 64,
    lineHeight: 70,
    textAlign: "left",
    alignSelf: "stretch",
  },
  profileName: {
    marginBottom: 12,
  },
  profileTagline: {
    fontFamily: "SeasonMixRegular",
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0.35,
    alignSelf: "stretch",
    textAlign: "left",
    marginBottom: 28,
  },
  infoGrid: {
    alignSelf: "stretch",
    marginBottom: 16,
    /** Keep 2×2 column order and text alignment stable when device is RTL */
    direction: "ltr",
  },
  /** Full-bleed strip under the info grid (counteracts scroll horizontal padding) */
  gallerySection: {
    alignSelf: "stretch",
    marginHorizontal: -SCROLL_CONTENT_PADDING_H,
    marginTop: 28,
    marginBottom: 16,
    direction: "ltr",
  },
  galleryScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 0,
    gap: 4,
  },
  /** Width/height per image set inline from `galleryImageSizeForRowHeight` */
  galleryThumb: {
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  bookSessionSection: {
    alignSelf: "stretch",
    marginTop: 8,
    marginBottom: 24,
  },
  bookSessionButton: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: BOOK_SESSION_CTA_BG,
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bookSessionButtonPressed: {
    opacity: 0.88,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    direction: "ltr",
  },
  /** Explicit spacing — `gap` on parent View is unreliable in some RN layouts */
  infoRowFirst: {
    marginBottom: 2,
  },
  infoRowSecond: {
    marginTop: 0,
  },
  infoCellLeft: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingRight: 8,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  /** Text inside left column — use a View parent for flex; Text alone won’t take 50% in RN */
  infoCellLeftText: {
    alignSelf: "stretch",
    width: "100%",
    textAlign: "left",
  },
  /** License + rating as two layout units (row), not inline text */
  infoCellLeftRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  infoLicenseUnit: {
    flexShrink: 0,
  },
  /** Star + score + count — single unit; NBSP in string keeps it from splitting */
  infoRatingUnit: {
    marginLeft: 16,
    flexShrink: 0,
  },
  /** Right column — stretch children so text isn’t hugging the wrong edge in RTL */
  infoCellRight: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingLeft: 8,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  /** Full width of right cell so wrapped lines stay left-aligned */
  infoCellRightText: {
    alignSelf: "stretch",
    width: "100%",
    textAlign: "left",
    ...(Platform.OS === "android"
      ? ({ textAlignVertical: "top" } as const)
      : {}),
  },
  /** Smaller than body + medium (SemiBold) for the 2×2 stats */
  infoCellText: {
    fontFamily: "SeasonSansSemiBold",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.35,
    color: "rgba(255, 255, 255, 0.82)",
    textAlign: "left",
    ...(Platform.OS === "android" ? ({ includeFontPadding: false } as const) : {}),
  },
  blockGap: {
    marginTop: 8,
    marginBottom: 8,
  },
  para: {
    marginBottom: 4,
  },
});
