import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import {
  FilterMenuSheet,
  type FilterSelections,
} from "../components/FilterMenuSheet";
import {
  GROW_LOGO_VIEWBOX_H,
  GROW_LOGO_VIEWBOX_W,
  GrowLogoVector,
} from "../components/GrowLogoVector";
import {
  ProfileExpandOverlay,
  type ProfileCardOrigin,
} from "../components/ProfileDetailSheet";
import { PROFILE_DETAILS_BY_ID } from "../data/profileDetails";
import type { Profile } from "../types/profile";
import {
  displayMedium,
  eyebrow,
  primaryCtaLabel,
  secondaryCtaLabel,
} from "../theme/typography";

const PROFILE_1_HERO = require("../../assets/figma-rebrand-node-405-5465.png");
const PROFILE_2_HERO = require("../../assets/profile-2-hero.png");
const PROFILE_3_HERO = require("../../assets/profile-3-hero.png");

const FRAME_BACKGROUND = "#191916";
const CARD_BACKGROUND = "#010204";
const CTA_BACKGROUND = "#f3ff00";

const INDICATOR_DOT_GAP = 10;
const INDICATOR_DOT_SIZE = 7;
const INDICATOR_DOT_ACTIVE_SCALE = 1.35;

const CARD_SLOT_FALLBACK = 240;

/** Logo width on overlay; height matches Individual-letters.svg aspect (261×146). */
const GROW_LOGO_BASE_W = 63;
const GROW_LOGO_BASE_H = (GROW_LOGO_BASE_W * GROW_LOGO_VIEWBOX_H) / GROW_LOGO_VIEWBOX_W;
const LAST_PAGE_OVERSCROLL_FOR_MAX_STRETCH = 260;

/** Equals fallback when SF Symbol / Material icon isn’t available. */
function EqualGlyph() {
  const bar = {
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: "#ffffff",
    width: 18,
  } as const;
  return (
    <View style={styles.equalGlyph} accessibilityElementsHidden importantForAccessibility="no">
      <View style={bar} />
      <View style={[bar, { marginTop: 5 }]} />
    </View>
  );
}

const PROFILES: Profile[] = [
  {
    id: "1",
    displayName: "Alexandra de Castro",
    heroImage: PROFILE_1_HERO,
  },
  {
    id: "2",
    displayName: "Alex De Basto",
    heroImage: PROFILE_2_HERO,
  },
  {
    id: "3",
    displayName: "Jordan Rivera",
    heroImage: PROFILE_3_HERO,
  },
];

function useHeroFacePrioritizedLayout(
  source: ImageSourcePropType,
  screenW: number,
  screenH: number,
) {
  return useMemo(() => {
    const meta = Image.resolveAssetSource(source);
    const iw = Math.max(meta.width ?? 1, 1);
    const ih = Math.max(meta.height ?? 1, 1);
    const scale = Math.max(screenW / iw, screenH / ih);
    const width = iw * scale;
    const height = ih * scale;
    return {
      width,
      height,
      left: (screenW - width) / 2,
      top: 0,
    };
  }, [source, screenW, screenH]);
}

function ProfileSlide({
  profile,
  screenW,
  screenH,
}: {
  profile: Profile;
  screenW: number;
  screenH: number;
}) {
  const heroLayout = useHeroFacePrioritizedLayout(
    profile.heroImage,
    screenW,
    screenH,
  );

  return (
    <View style={[styles.slide, { width: screenW, height: screenH }]}>
      <Image
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={`Profile photo, ${profile.displayName}`}
        source={profile.heroImage}
        style={{
          position: "absolute",
          width: heroLayout.width,
          height: heroLayout.height,
          left: heroLayout.left,
          top: heroLayout.top,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

const viewabilityConfig = {
  itemVisiblePercentThreshold: 55,
};

function ProfileCardContent({
  displayName,
  onViewProfilePress,
}: {
  displayName: string;
  onViewProfilePress?: () => void;
}) {
  return (
    <>
      <Text style={[eyebrow, styles.cardLineNoShrink]}>
        Next available MAR 2, 10 AM - 11 AM
      </Text>
      <Text
        style={[
          displayMedium,
          styles.cardLineNoShrink,
          styles.cardDisplayName,
        ]}
      >
        {displayName}
      </Text>
      <View style={styles.ctaRow}>
        <View style={styles.ctaCell}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View profile"
            onPress={onViewProfilePress}
            style={({ pressed }) => [
              styles.outlineCtaButton,
              pressed && styles.outlineCtaButtonPressed,
            ]}
          >
            <Text style={secondaryCtaLabel}>View profile</Text>
          </Pressable>
        </View>
        <View style={styles.ctaCell}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book session"
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
          >
            <Text style={primaryCtaLabel}>Book session</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

type FigmaRebrandScreenProps = {
  /** Navigate to sign-in / sign-up (e.g. after Log out in the menu). */
  onLogout?: () => void;
};

export default function FigmaRebrandScreen({ onLogout }: FigmaRebrandScreenProps = {}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
  const [detailOrigin, setDetailOrigin] = useState<ProfileCardOrigin | null>(
    null,
  );
  const cardMeasureRef = useRef<View>(null);

  const openProfileDetail = useCallback(() => {
    cardMeasureRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      setDetailOrigin({ x, y, width, height });
      setProfileDetailOpen(true);
    });
  }, []);

  const handleProfileDetailDismiss = useCallback(() => {
    setProfileDetailOpen(false);
    setDetailOrigin(null);
  }, []);

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const onFilterPress = useCallback(() => {
    setFilterMenuOpen(true);
  }, []);

  const onFilterMenuClose = useCallback(() => {
    setFilterMenuOpen(false);
  }, []);

  const onFilterApply = useCallback((_selections: FilterSelections) => {
    // Hook up profile list filtering when backend / criteria exist.
  }, []);

  const handleLogoutPress = useCallback(() => {
    setFilterMenuOpen(false);
    onLogout?.();
  }, [onLogout]);

  const [slotHeights, setSlotHeights] = useState<number[]>(() =>
    PROFILES.map(() => CARD_SLOT_FALLBACK),
  );
  const scrollY = useRef(new Animated.Value(0)).current;

  const setSlotHeight = useCallback((index: number, height: number) => {
    setSlotHeights((prev) => {
      if (prev[index] === height) return prev;
      const next = [...prev];
      next[index] = height;
      return next;
    });
  }, []);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const idx = Math.round(value / Math.max(screenH, 1));
      const clamped = Math.min(PROFILES.length - 1, Math.max(0, idx));
      setActiveIndex(clamped);
    });
    return () => scrollY.removeListener(id);
  }, [screenH, scrollY]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) setActiveIndex(idx);
    },
    [],
  );

  const getItemLayout = useMemo(
    () =>
      (_: unknown, index: number) => ({
        length: screenH,
        offset: screenH * index,
        index,
      }),
    [screenH],
  );

  const snapOffsets = useMemo(
    () => PROFILES.map((_, i) => i * screenH),
    [screenH],
  );

  const { slotStarts, heightsForAnim } = useMemo(() => {
    const n = PROFILES.length;
    const heights = slotHeights.map((hi) => hi ?? CARD_SLOT_FALLBACK);
    const starts: number[] = [];
    let acc = 0;
    for (let i = 0; i < n; i += 1) {
      starts.push(acc);
      acc += heights[i];
    }
    return { slotStarts: starts, heightsForAnim: heights };
  }, [slotHeights]);

  const cardHeight = useMemo(() => {
    const H = Math.max(screenH, 1);
    const n = PROFILES.length;
    const inputRange = PROFILES.map((_, i) => i * H);
    const outputRange = heightsForAnim;
    if (n <= 1) {
      return scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [
          outputRange[0] ?? CARD_SLOT_FALLBACK,
          outputRange[0] ?? CARD_SLOT_FALLBACK,
        ],
        extrapolate: "clamp",
      });
    }
    return scrollY.interpolate({
      inputRange,
      outputRange,
      extrapolate: "clamp",
    });
  }, [screenH, scrollY, heightsForAnim]);

  const cardTranslateY = useMemo(() => {
    const H = Math.max(screenH, 1);
    const n = PROFILES.length;
    const inputRange = PROFILES.map((_, i) => i * H);
    const outputRange = slotStarts.map((s) => -s);
    if (n <= 1) {
      return scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0],
        extrapolate: "clamp",
      });
    }
    return scrollY.interpolate({
      inputRange,
      outputRange,
      extrapolate: "clamp",
    });
  }, [screenH, scrollY, slotStarts]);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      ),
    [scrollY],
  );

  const lastProfileIndex = Math.max(0, PROFILES.length - 1);
  const isOnLastProfile = activeIndex === lastProfileIndex;
  const maxScrollYForStretch = lastProfileIndex * Math.max(screenH, 1);

  const logoStretchHeight = useMemo(() => {
    const H = Math.max(screenH, 1);
    const stretchCap = H * 0.94;
    const maxY = maxScrollYForStretch;
    return scrollY.interpolate({
      inputRange: [
        maxY - 2,
        maxY,
        maxY + LAST_PAGE_OVERSCROLL_FOR_MAX_STRETCH,
      ],
      outputRange: [GROW_LOGO_BASE_H, GROW_LOGO_BASE_H, stretchCap],
      extrapolate: "clamp",
    });
  }, [scrollY, maxScrollYForStretch, screenH]);

  const cardContentWidth = Math.max(0, screenW - 48);

  const activeProfile = PROFILES[activeIndex] ?? PROFILES[0];
  const activeProfileDetails =
    PROFILE_DETAILS_BY_ID[activeProfile.id] ?? PROFILE_DETAILS_BY_ID["1"];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.measureGhost, { width: cardContentWidth }]}
      >
        <View style={styles.cardStrip}>
          {PROFILES.map((p, index) => (
            <View
              key={p.id}
              style={styles.cardSlot}
              onLayout={(e) => setSlotHeight(index, e.nativeEvent.layout.height)}
            >
              <ProfileCardContent displayName={p.displayName} />
            </View>
          ))}
        </View>
      </View>
      <Animated.FlatList
        data={PROFILES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProfileSlide
            profile={item}
            screenW={screenW}
            screenH={screenH}
          />
        )}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={onScroll}
        scrollEventThrottle={16}
        {...(Platform.OS === "ios"
          ? {
              pagingEnabled: true,
              decelerationRate: 0.82,
              bounces: isOnLastProfile,
            }
          : {
              snapToOffsets: snapOffsets,
              snapToAlignment: "start" as const,
              decelerationRate: "fast" as const,
              disableIntervalMomentum: true,
              overScrollMode: isOnLastProfile ? "always" : "never",
            })}
      />
      <View
        ref={cardMeasureRef}
        collapsable={false}
        style={[
          styles.cardMeasureHost,
          profileDetailOpen && styles.cardMeasureHostHidden,
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.floatingCard, { height: cardHeight }]}
          pointerEvents="box-none"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open full profile, ${activeProfile.displayName}`}
            accessibilityHint="Opens a full screen with personal and professional details"
            onPress={openProfileDetail}
            style={styles.cardPressable}
          >
            <View style={styles.cardClip}>
              <Animated.View
                style={[
                  styles.cardStrip,
                  { transform: [{ translateY: cardTranslateY }] },
                ]}
              >
                {PROFILES.map((p) => (
                  <View key={p.id} style={styles.cardSlot}>
                    <ProfileCardContent
                      displayName={p.displayName}
                      onViewProfilePress={openProfileDetail}
                    />
                  </View>
                ))}
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      </View>
      <SafeAreaView style={styles.logoOverlay} pointerEvents="box-none">
        <View style={styles.logoOverlayInner} pointerEvents="box-none">
          <View style={styles.logoHeaderRow}>
            <View style={styles.logoMarkWrap}>
              <GrowLogoVector
                width={GROW_LOGO_BASE_W}
                height={logoStretchHeight}
                style={styles.growLogoImage}
              />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            accessibilityHint="Opens options to filter profiles"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onFilterPress}
            style={({ pressed }) => [
              styles.filterButtonOuter,
              pressed && styles.filterButtonGlassPressed,
            ]}
          >
            <View style={styles.filterInnerClip} pointerEvents="none">
              {Platform.OS === "web" ? (
                <>
                  <View
                    style={[StyleSheet.absoluteFillObject, styles.filterGlassFallback]}
                  />
                  <View style={styles.filterGlassSheen} pointerEvents="none" />
                </>
              ) : (
                <>
                  {/*
                    Use tint="dark" (not systemThinMaterial*) — material tints often
                    render flat/invisible in RN overlay stacks. Sheen on top sells “glass”.
                  */}
                  <BlurView
                    intensity={72}
                    tint="dark"
                    style={styles.filterBlurFill}
                    {...(Platform.OS === "android"
                      ? { blurMethod: "dimezisBlurViewSdk31Plus" as const }
                      : {})}
                  />
                  <View
                    style={styles.filterGlassSheen}
                    pointerEvents="none"
                  />
                </>
              )}
            </View>
            <View style={styles.filterIconLayer} pointerEvents="none">
              <SymbolView
                name={{
                  ios: "equal",
                  android: "equal",
                  web: "equal",
                }}
                size={24}
                tintColor="#ffffff"
                fallback={<EqualGlyph />}
              />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
      {PROFILES.length > 1 ? (
        <View
          style={styles.profileIndicatorRail}
          pointerEvents="none"
          accessible
          accessibilityLabel={`Profile ${activeIndex + 1} of ${PROFILES.length}. Swipe up or down to change profile.`}
        >
          <View style={styles.profileIndicatorTrack} />
          <View style={styles.profileIndicatorDots}>
            {PROFILES.map((p, index) => {
              const active = index === activeIndex;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.profileIndicatorDot,
                    active && styles.profileIndicatorDotActive,
                    {
                      width: active
                        ? INDICATOR_DOT_SIZE * INDICATOR_DOT_ACTIVE_SCALE
                        : INDICATOR_DOT_SIZE,
                      height: active
                        ? INDICATOR_DOT_SIZE * INDICATOR_DOT_ACTIVE_SCALE
                        : INDICATOR_DOT_SIZE,
                      borderRadius:
                        (active
                          ? INDICATOR_DOT_SIZE * INDICATOR_DOT_ACTIVE_SCALE
                          : INDICATOR_DOT_SIZE) / 2,
                      marginBottom:
                        index < PROFILES.length - 1 ? INDICATOR_DOT_GAP : 0,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      ) : null}
      <ProfileExpandOverlay
        open={profileDetailOpen}
        origin={detailOrigin}
        profile={activeProfile}
        details={activeProfileDetails}
        onDismiss={handleProfileDetailDismiss}
      />
      <FilterMenuSheet
        visible={filterMenuOpen}
        onClose={onFilterMenuClose}
        onApply={onFilterApply}
        onLogoutPress={handleLogoutPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: FRAME_BACKGROUND,
  },
  list: {
    flex: 1,
  },
  slide: {
    overflow: "hidden",
    backgroundColor: FRAME_BACKGROUND,
  },
  cardMeasureHost: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    zIndex: 4,
  },
  cardMeasureHostHidden: {
    opacity: 0,
  },
  floatingCard: {
    borderRadius: 32,
    backgroundColor: CARD_BACKGROUND,
    overflow: "hidden",
  },
  measureGhost: {
    position: "absolute",
    left: -4000,
    top: 0,
    opacity: 0,
    zIndex: -1,
  },
  cardStrip: {
    paddingHorizontal: 24,
  },
  cardSlot: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  cardPressable: {
    flex: 1,
  },
  cardClip: {
    flex: 1,
    overflow: "hidden",
  },
  cardLineNoShrink: {
    flexShrink: 0,
  },
  /** Extra air between eyebrow and 48px display name */
  cardDisplayName: {
    marginTop: 12,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    marginTop: 20,
    flexShrink: 0,
  },
  ctaCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  outlineCtaButton: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineCtaButtonPressed: {
    opacity: 0.88,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  ctaButton: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: CTA_BACKGROUND,
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonPressed: {
    opacity: 0.88,
  },
  logoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    backgroundColor: "transparent",
    overflow: "visible",
  },
  logoOverlayInner: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    overflow: "visible",
    /** Room for absolutely positioned filter control so parents don’t clip it. */
    minHeight: 58,
  },
  logoHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    overflow: "visible",
    backgroundColor: "transparent",
    width: "100%",
  },
  logoMarkWrap: {
    alignItems: "center",
    overflow: "visible",
  },
  growLogoImage: {
    alignSelf: "center",
  },
  /** No outer stroke — avoids a harsh white ring; edge comes from blur + sheen only. */
  filterButtonOuter: {
    position: "absolute",
    top: 4,
    right: 12,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 8,
    backgroundColor: "transparent",
    overflow: "visible",
  },
  /** Inset circle clips blur only; avoids soft blur / antialias looking “cut off”. */
  filterInnerClip: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    top: 2,
    left: 2,
  },
  filterBlurFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
  },
  filterGlassFallback: {
    borderRadius: 23,
    backgroundColor: "rgba(28, 28, 26, 0.72)",
  },
  /** Frosted layer on top of native blur — no border (that read as a white stroke). */
  filterGlassSheen: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  filterIconLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonGlassPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  equalGlyph: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileIndicatorRail: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    width: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  profileIndicatorTrack: {
    position: "absolute",
    width: 3,
    top: "32%",
    bottom: "32%",
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  profileIndicatorDots: {
    alignItems: "center",
  },
  profileIndicatorDot: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  profileIndicatorDotActive: {
    backgroundColor: "#ffffff",
  },
});
