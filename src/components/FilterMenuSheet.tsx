import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import {
  body,
  menuFooterMix,
  menuRowSerif,
  primaryCtaLabel,
  sectionTitle,
  secondaryCtaLabel,
} from "../theme/typography";

const SHEET_BG = "#010204";
const CTA_BACKGROUND = "#f3ff00";
const BACKDROP_MAX_OPACITY = 0.52;

const ROW_SWEEP_IN_MS = 220;
const ROW_SWEEP_OUT_MS = 260;
/** Solid black — slides R→L over the row before navigation */
const ROW_SWEEP_COLOR = "#000000";
/** Cancelled tap: sweep out after this if `onPress` never fired */
const SWEEP_OUT_CANCEL_DELAY_MS = 70;

const sweepStyles = StyleSheet.create({
  clip: { overflow: "hidden" },
  pressableFill: { flex: 1, alignSelf: "stretch" },
  host: {
    position: "relative",
    flex: 1,
    justifyContent: "center",
  },
  labelUnderSweep: {
    zIndex: 0,
  },
  sweepLayer: {
    zIndex: 1,
  },
});

type AnimatedSerifMenuRowProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  containerStyle: ViewStyle;
  bottomBorderStyle?: ViewStyle;
  /** Scroll content width fallback before onLayout (e.g. screenW - horizontal padding) */
  contentWidth: number;
};

function AnimatedSerifMenuRow({
  label,
  onPress,
  accessibilityLabel,
  containerStyle,
  bottomBorderStyle,
  contentWidth,
}: AnimatedSerifMenuRowProps) {
  const [measuredW, setMeasuredW] = useState(0);
  const barW = Math.max(measuredW > 0 ? measuredW : contentWidth, 1);
  const progress = useRef(new Animated.Value(0)).current;
  const sweepOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseSweepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  /** True once this touch has fired `onPress` — skip cancel sweep from `onPressOut`. */
  const pressCommittedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (sweepOutTimer.current) clearTimeout(sweepOutTimer.current);
      if (navigateTimer.current) clearTimeout(navigateTimer.current);
      if (releaseSweepTimer.current) clearTimeout(releaseSweepTimer.current);
    };
  }, []);

  /** R→L: bar starts off the right edge, slides left to cover the row */
  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [barW, 0],
      }),
    [progress, barW],
  );

  const sweepIn = useCallback(() => {
    pressCommittedRef.current = false;
    if (sweepOutTimer.current) {
      clearTimeout(sweepOutTimer.current);
      sweepOutTimer.current = null;
    }
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: ROW_SWEEP_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const sweepOut = useCallback(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: ROW_SWEEP_OUT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const onPressOut = useCallback(() => {
    sweepOutTimer.current = setTimeout(() => {
      sweepOutTimer.current = null;
      if (pressCommittedRef.current) {
        pressCommittedRef.current = false;
        return;
      }
      sweepOut();
    }, SWEEP_OUT_CANCEL_DELAY_MS);
  }, [sweepOut]);

  const handlePress = useCallback(() => {
    pressCommittedRef.current = true;
    if (sweepOutTimer.current) {
      clearTimeout(sweepOutTimer.current);
      sweepOutTimer.current = null;
    }
    if (navigateTimer.current) clearTimeout(navigateTimer.current);
    if (releaseSweepTimer.current) clearTimeout(releaseSweepTimer.current);

    navigateTimer.current = setTimeout(() => {
      navigateTimer.current = null;
      onPress();
      // Submenus stay mounted — ease sweep off after the action. Root rows unmount
      // before this runs; mountedRef cleanup clears this timer.
      releaseSweepTimer.current = setTimeout(() => {
        releaseSweepTimer.current = null;
        if (!mountedRef.current) return;
        sweepOut();
      }, 120);
    }, ROW_SWEEP_IN_MS);
  }, [onPress, sweepOut]);

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setMeasuredW(e.nativeEvent.layout.width);
  }, []);

  return (
    <View
      style={[containerStyle, bottomBorderStyle, sweepStyles.clip]}
      onLayout={onRowLayout}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={sweepIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={sweepStyles.pressableFill}
      >
        <View style={sweepStyles.host}>
          <Text style={[menuRowSerif, sweepStyles.labelUnderSweep]}>
            {label}
          </Text>
          <Animated.View
            pointerEvents="none"
            style={[
              sweepStyles.sweepLayer,
              {
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: barW,
                backgroundColor: ROW_SWEEP_COLOR,
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
      </Pressable>
    </View>
  );
}

export type FilterSelections = Record<string, boolean>;

type MenuLevel = "root" | "coach" | "filter" | "messages";

const FILTER_SECTIONS: {
  title: string;
  options: { id: string; label: string }[];
}[] = [
  {
    title: "Availability",
    options: [
      { id: "evenings", label: "Evening hours" },
      { id: "weekends", label: "Weekend sessions" },
    ],
  },
  {
    title: "Session type",
    options: [
      { id: "video", label: "Video" },
      { id: "inPerson", label: "In person" },
    ],
  },
];

/** Coach submenu — wire navigation when those flows exist. */
const COACH_SUBITEMS = [
  { id: "browse", label: "Browse coaches" },
  { id: "saved", label: "Saved coaches" },
  { id: "preferences", label: "Match preferences" },
] as const;

/** Messages submenu — placeholder rows. */
const MESSAGES_SUBITEMS = [
  { id: "inbox", label: "Inbox" },
  { id: "archived", label: "Archived" },
] as const;

const ROOT_ITEMS: { id: Exclude<MenuLevel, "root">; label: string }[] = [
  { id: "filter", label: "Filter" },
  { id: "coach", label: "Coach" },
  { id: "messages", label: "Messages" },
];

function buildInitialSelections(): FilterSelections {
  const s: FilterSelections = {};
  for (const sec of FILTER_SECTIONS) {
    for (const o of sec.options) {
      s[o.id] = false;
    }
  }
  return s;
}

function titleForLevel(level: MenuLevel): string {
  switch (level) {
    case "root":
      return "Menu";
    case "coach":
      return "Coach";
    case "filter":
      return "Filter";
    case "messages":
      return "Messages";
    default:
      return "Menu";
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply?: (selections: FilterSelections) => void;
  onAccountPress?: () => void;
  onLogoutPress?: () => void;
};

const PANEL_SLIDE_MS = 320;
const BACKDROP_FADE_MS = 260;
const CLOSE_BACKDROP_MS = 200;
const CLOSE_PANEL_MS = 300;

const TOP_INSET = Platform.select({ ios: 56, android: 16, default: 16 });
const BOTTOM_INSET = Platform.select({ ios: 28, android: 16, default: 16 });

/** Root ↔ submenu cross-fade + slide (eased) */
const MENU_NAV_OUT_MS = 260;
const MENU_NAV_IN_MS = 420;

export function FilterMenuSheet({
  visible,
  onClose,
  onApply,
  onAccountPress,
  onLogoutPress,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const [menuLevel, setMenuLevel] = useState<MenuLevel>("root");
  /** What’s on screen (may lag `menuLevel` during transition) */
  const [contentLevel, setContentLevel] = useState<MenuLevel>("root");
  const [selections, setSelections] = useState<FilterSelections>(buildInitialSelections);
  const [modalVisible, setModalVisible] = useState(false);
  const [backdropDismissable, setBackdropDismissable] = useState(false);

  const menuLevelRef = useRef(menuLevel);
  menuLevelRef.current = menuLevel;

  const menuBodyOp = useRef(new Animated.Value(1)).current;
  const menuBodyTx = useRef(new Animated.Value(0)).current;
  const menuNavAnim = useRef<Animated.CompositeAnimation | null>(null);

  const panelW = screenW;
  /** Matches `scrollContent` horizontal padding (20 + 20) */
  const menuRowContentW = Math.max(1, screenW - 40);

  const translateX = useRef(new Animated.Value(0)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const animating = useRef<{ stop: () => void } | null>(null);
  const prevVisibleRef = useRef(false);

  const stopAnim = useCallback(() => {
    animating.current?.stop();
    animating.current = null;
  }, []);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      setMenuLevel("root");
      setContentLevel("root");
      menuNavAnim.current?.stop();
      menuNavAnim.current = null;
      menuBodyOp.setValue(1);
      menuBodyTx.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (menuLevel === contentLevel) return;

    menuNavAnim.current?.stop();

    const fromRoot = contentLevel === "root";
    const toRoot = menuLevel === "root";

    let outX: number;
    let inStartX: number;
    if (fromRoot && !toRoot) {
      outX = -18;
      inStartX = 26;
    } else if (toRoot) {
      outX = 20;
      inStartX = -26;
    } else {
      outX = -14;
      inStartX = 22;
    }

    const easeIn = Easing.bezier(0.45, 0, 0.55, 1);
    const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

    const outAnim = Animated.parallel([
      Animated.timing(menuBodyOp, {
        toValue: 0,
        duration: MENU_NAV_OUT_MS,
        easing: easeIn,
        useNativeDriver: true,
      }),
      Animated.timing(menuBodyTx, {
        toValue: outX,
        duration: MENU_NAV_OUT_MS,
        easing: easeIn,
        useNativeDriver: true,
      }),
    ]);

    menuNavAnim.current = outAnim;
    outAnim.start(({ finished }) => {
      if (!finished) return;
      const target = menuLevelRef.current;
      setContentLevel(target);
      menuBodyTx.setValue(inStartX);
      menuBodyOp.setValue(0);

      const inAnim = Animated.parallel([
        Animated.timing(menuBodyOp, {
          toValue: 1,
          duration: MENU_NAV_IN_MS,
          easing: easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(menuBodyTx, {
          toValue: 0,
          duration: MENU_NAV_IN_MS,
          easing: easeOut,
          useNativeDriver: true,
        }),
      ]);
      menuNavAnim.current = inAnim;
      inAnim.start(({ finished: doneIn }) => {
        if (doneIn) menuNavAnim.current = null;
      });
    });
  }, [menuLevel, contentLevel]);

  const goBack = useCallback(() => {
    setMenuLevel("root");
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onHardwareBack = () => {
      if (!visible || !modalVisible) return false;
      if (contentLevel !== "root") {
        goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack,
    );
    return () => sub.remove();
  }, [visible, modalVisible, contentLevel, goBack]);

  useEffect(() => {
    if (!modalVisible) return;

    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      stopAnim();
      setBackdropDismissable(false);
      translateX.setValue(panelW);
      backdropOp.setValue(0);

      const openSeq = Animated.sequence([
        Animated.timing(translateX, {
          toValue: 0,
          duration: PANEL_SLIDE_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: BACKDROP_FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

      animating.current = openSeq;
      openSeq.start(({ finished }) => {
        animating.current = null;
        if (finished) setBackdropDismissable(true);
      });
    } else if (!visible && wasVisible) {
      stopAnim();
      setBackdropDismissable(false);

      const closeSeq = Animated.sequence([
        Animated.timing(backdropOp, {
          toValue: 0,
          duration: CLOSE_BACKDROP_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: panelW,
          duration: CLOSE_PANEL_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animating.current = closeSeq;
      closeSeq.start(({ finished }) => {
        animating.current = null;
        if (finished) setModalVisible(false);
      });
    }

    return () => {
      stopAnim();
    };
  }, [visible, modalVisible, panelW, translateX, backdropOp, stopAnim]);

  const backdropOpacity = useMemo(
    () =>
      backdropOp.interpolate({
        inputRange: [0, 1],
        outputRange: [0, BACKDROP_MAX_OPACITY],
      }),
    [backdropOp],
  );

  const toggle = useCallback((id: string) => {
    setSelections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const clearAll = useCallback(() => {
    setSelections(buildInitialSelections());
  }, []);

  const apply = useCallback(() => {
    onApply?.(selections);
    onClose();
  }, [onApply, onClose, selections]);

  const onBackdropPress = useCallback(() => {
    if (backdropDismissable) onClose();
  }, [backdropDismissable, onClose]);

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Animated.View
          pointerEvents={backdropDismissable ? "auto" : "none"}
          style={[styles.backdropWrap, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onBackdropPress}
            accessibilityLabel="Dismiss menu"
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelW,
              paddingTop: TOP_INSET,
              paddingBottom: BOTTOM_INSET,
              transform: [{ translateX }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.menuTransitionWrap,
              {
                opacity: menuBodyOp,
                transform: [{ translateX: menuBodyTx }],
              },
            ]}
          >
            <View style={styles.headerRow}>
              {contentLevel !== "root" ? (
                <Pressable
                  onPress={goBack}
                  accessibilityRole="button"
                  accessibilityLabel="Back to menu"
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.headerSideButton,
                    styles.headerSideLeft,
                    pressed && styles.headerSidePressed,
                  ]}
                >
                  <View style={styles.closeCircle}>
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
                            intensity={64}
                            tint="dark"
                            style={styles.closeBlurFill}
                            {...(Platform.OS === "android"
                              ? {
                                  blurMethod:
                                    "dimezisBlurViewSdk31Plus" as const,
                                }
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
                      <SymbolView
                        name={
                          {
                            ios: "arrow.left",
                            android: "arrow_back",
                            web: "arrow_back",
                          } as unknown as ComponentProps<typeof SymbolView>["name"]
                        }
                        size={22}
                        tintColor="#ffffff"
                        fallback={
                          <Text
                            style={styles.backArrowFallback}
                            accessibilityElementsHidden
                          >
                            ←
                          </Text>
                        }
                      />
                    </View>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.headerSideSpacer} />
              )}
              {contentLevel !== "root" ? (
                <Text
                  style={[sectionTitle, styles.headerTitleCenter]}
                  numberOfLines={1}
                >
                  {titleForLevel(contentLevel)}
                </Text>
              ) : (
                <View style={styles.headerTitleCenter} />
              )}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerSideButton,
                  styles.headerSideRight,
                  pressed && styles.headerSidePressed,
                ]}
              >
                <View style={styles.closeCircle}>
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
                          intensity={64}
                          tint="dark"
                          style={styles.closeBlurFill}
                          {...(Platform.OS === "android"
                            ? {
                                blurMethod:
                                  "dimezisBlurViewSdk31Plus" as const,
                              }
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
                    <Text style={styles.closeIcon} accessibilityElementsHidden>
                      ×
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {contentLevel === "root" ? (
                <View style={styles.rootMenu}>
                  {ROOT_ITEMS.map((item, index) => (
                    <AnimatedSerifMenuRow
                      key={item.id}
                      label={item.label}
                      onPress={() => setMenuLevel(item.id)}
                      accessibilityLabel={`Open ${item.label}`}
                      contentWidth={menuRowContentW}
                      containerStyle={styles.mainRow}
                      bottomBorderStyle={
                        index < ROOT_ITEMS.length - 1
                          ? styles.mainRowBorder
                          : undefined
                      }
                    />
                  ))}
                </View>
              ) : null}

              {contentLevel === "coach" ? (
                <View style={styles.subMenu}>
                  {COACH_SUBITEMS.map((item, index) => (
                    <AnimatedSerifMenuRow
                      key={item.id}
                      label={item.label}
                      onPress={() => {
                        /* Wire to coach flows */
                      }}
                      accessibilityLabel={item.label}
                      contentWidth={menuRowContentW}
                      containerStyle={styles.subRow}
                      bottomBorderStyle={
                        index < COACH_SUBITEMS.length - 1
                          ? styles.subRowBorder
                          : undefined
                      }
                    />
                  ))}
                </View>
              ) : null}

              {contentLevel === "filter" ? (
                <View>
                  {FILTER_SECTIONS.map((section) => (
                    <View key={section.title} style={styles.section}>
                      <Text style={[sectionTitle, styles.sectionLabel]}>
                        {section.title}
                      </Text>
                      {section.options.map((opt) => (
                        <View key={opt.id} style={styles.optionRow}>
                          <Text style={[body, styles.optionLabel]}>
                            {opt.label}
                          </Text>
                          <Switch
                            value={selections[opt.id] ?? false}
                            onValueChange={() => toggle(opt.id)}
                            trackColor={{
                              false: "rgba(255, 255, 255, 0.16)",
                              true: "rgba(243, 255, 0, 0.55)",
                            }}
                            thumbColor={
                              Platform.OS === "ios"
                                ? "#ffffff"
                                : selections[opt.id]
                                  ? CTA_BACKGROUND
                                  : "#f4f4f4"
                            }
                            ios_backgroundColor="rgba(255, 255, 255, 0.16)"
                            accessibilityLabel={opt.label}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}

              {contentLevel === "messages" ? (
                <View style={styles.subMenu}>
                  {MESSAGES_SUBITEMS.map((item, index) => (
                    <AnimatedSerifMenuRow
                      key={item.id}
                      label={item.label}
                      onPress={() => {
                        /* Wire to messages */
                      }}
                      accessibilityLabel={item.label}
                      contentWidth={menuRowContentW}
                      containerStyle={styles.subRow}
                      bottomBorderStyle={
                        index < MESSAGES_SUBITEMS.length - 1
                          ? styles.subRowBorder
                          : undefined
                      }
                    />
                  ))}
                  <Text style={[body, styles.messagesHint]}>
                    Conversations with your care team will appear here.
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            {contentLevel === "root" ? (
            <View style={styles.accountFooter}>
              <Pressable
                onPress={() => onAccountPress?.()}
                accessibilityRole="button"
                accessibilityLabel="Account"
                style={({ pressed }) => [
                  styles.accountFooterRow,
                  pressed && styles.accountFooterRowPressed,
                ]}
              >
                <Text style={menuFooterMix}>Account</Text>
              </Pressable>
              <Pressable
                onPress={() => onLogoutPress?.()}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={({ pressed }) => [
                  styles.accountFooterRow,
                  pressed && styles.accountFooterRowPressed,
                ]}
              >
                <Text style={menuFooterMix}>Log out</Text>
              </Pressable>
            </View>
          ) : null}

            {contentLevel === "filter" ? (
            <View style={styles.footer}>
              <Pressable
                onPress={clearAll}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.clearButtonPressed,
                ]}
              >
                <Text style={[secondaryCtaLabel, styles.clearLabel]}>
                  Clear all
                </Text>
              </Pressable>
              <Pressable
                onPress={apply}
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.applyButtonPressed,
                ]}
              >
                <Text style={[primaryCtaLabel, styles.applyLabel]}>Apply</Text>
              </Pressable>
            </View>
          ) : null}
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
  backdropWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  panel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: SHEET_BG,
    flexDirection: "column",
  },
  menuTransitionWrap: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerSideSpacer: {
    width: 72,
  },
  headerSideButton: {
    width: 72,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerSideLeft: {
    alignItems: "flex-start",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerSidePressed: {
    opacity: 0.75,
  },
  backArrowFallback: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
    textAlign: "center",
    ...(Platform.OS === "android"
      ? ({ includeFontPadding: false } as const)
      : {}),
  },
  headerTitleCenter: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlassClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: "hidden",
  },
  closeBlurFill: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Web: blur not available — frosted tint */
  closeGlassFallback: {
    backgroundColor: "rgba(28, 28, 26, 0.72)",
  },
  closeGlassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  closeIconLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  closeIcon: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 28,
    lineHeight: 30,
    marginTop: Platform.OS === "ios" ? -1 : 0,
    fontWeight: "300",
    ...(Platform.OS === "android"
      ? ({ includeFontPadding: false } as const)
      : {}),
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 120,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  rootMenu: {
    marginTop: 8,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  mainRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  subMenu: {
    marginTop: 4,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 4,
  },
  subRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  messagesHint: {
    marginTop: 24,
    opacity: 0.65,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    marginBottom: 12,
    opacity: 0.9,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  optionLabel: {
    flex: 1,
    marginRight: 16,
    paddingRight: 8,
  },
  accountFooter: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 4,
  },
  accountFooterRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  accountFooterRowPressed: {
    opacity: 0.75,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    flexShrink: 0,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
  },
  clearButtonPressed: {
    opacity: 0.88,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  clearLabel: {
    fontSize: 15,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    backgroundColor: CTA_BACKGROUND,
  },
  applyButtonPressed: {
    opacity: 0.9,
  },
  applyLabel: {
    fontSize: 15,
  },
});
