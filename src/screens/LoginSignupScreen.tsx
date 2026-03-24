import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  GROW_LOGO_VIEWBOX_H,
  GROW_LOGO_VIEWBOX_W,
  GrowLogoVector,
} from "../components/GrowLogoVector";
import { body, displayMedium, primaryCtaLabel } from "../theme/typography";

const FRAME_BACKGROUND = "#191916";
const CTA_BACKGROUND = "#f3ff00";
/** Filled surface on screen bg — no stroke; slightly stronger than before for contrast. */
const FIELD_SURFACE = "rgba(255,255,255,0.14)";
/** Inset from the field border for label + text (absolute label ignores shell padding). */
const FIELD_HORIZONTAL_INSET = 16;
/** Must match `inputShell.height` — used to vertically center the unfloated label. */
const INPUT_FIELD_HEIGHT = 64;
/** Unfloated label uses the same line box as `labelLineHeight` at rest (0). */
const LABEL_REST_LINE_HEIGHT = 22;
const LABEL_TOP_UNFLOATED =
  (INPUT_FIELD_HEIGHT - LABEL_REST_LINE_HEIGHT) / 2;

const GROW_LOGO_BASE_W = 72;
const GROW_LOGO_BASE_H =
  (GROW_LOGO_BASE_W * GROW_LOGO_VIEWBOX_H) / GROW_LOGO_VIEWBOX_W;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type FloatingLabelFieldProps = {
  label: string;
  labelNativeId: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  accessibilityLabel: string;
  autoComplete?: "email" | "tel" | "off" | "sms-otp";
  textContentType?: "emailAddress" | "telephoneNumber" | "oneTimeCode";
  inputMode?: "email" | "tel" | "numeric";
  autoCorrect?: boolean;
  maxLength?: number;
};

function FloatingLabelField({
  label,
  labelNativeId,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  accessibilityLabel,
  autoComplete,
  textContentType,
  inputMode,
  autoCorrect = false,
  maxLength,
}: FloatingLabelFieldProps) {
  const [focused, setFocused] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floated = focused || value.length > 0;

  useEffect(() => {
    Animated.timing(floatAnim, {
      toValue: floated ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [floated, floatAnim]);

  const labelTop = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [LABEL_TOP_UNFLOATED, 8],
  });
  const labelFontSize = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });
  const labelLineHeight = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 16],
  });
  const labelColor = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.38)", "rgba(255,255,255,0.72)"],
  });

  return (
    <View style={styles.field} collapsable={false}>
      <View style={styles.inputShell}>
        <Animated.Text
          accessible={false}
          pointerEvents="none"
          nativeID={labelNativeId}
          style={[
            styles.floatingLabel,
            {
              top: labelTop,
              fontSize: labelFontSize,
              lineHeight: labelLineHeight,
              color: labelColor,
            },
          ]}
        >
          {label}
        </Animated.Text>
        <AnimatedTextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={floated ? placeholder : ""}
          placeholderTextColor="rgba(255,255,255,0.38)"
          keyboardType={keyboardType}
          keyboardAppearance="dark"
          autoCapitalize="none"
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          inputMode={inputMode}
          editable
          showSoftInputOnFocus
          accessibilityLabel={accessibilityLabel}
          maxLength={maxLength}
          style={styles.inputInner}
          {...(Platform.OS === "android"
            ? ({ underlineColorAndroid: "transparent" } as const)
            : {})}
        />
      </View>
    </View>
  );
}

type AuthStep = "email" | "phone" | "phoneVerify";

type Props = {
  onContinue: () => void | Promise<void>;
};

/**
 * Login / sign-up entry after onboarding. Wire real auth flows here later.
 */
export default function LoginSignupScreen({ onContinue }: Props) {
  const logoHeight = useRef(new Animated.Value(GROW_LOGO_BASE_H)).current;
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View style={styles.inset}>
            <View style={styles.header}>
              <GrowLogoVector width={GROW_LOGO_BASE_W} height={logoHeight} />
            </View>

            {step === "email" ? (
              <>
                <Text style={[displayMedium, styles.title]} accessibilityRole="header">
                  Sign in or create an account
                </Text>
                <FloatingLabelField
                  label="Email"
                  labelNativeId="login-email-label"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  accessibilityLabel="Email"
                  autoComplete="email"
                  textContentType="emailAddress"
                  inputMode="email"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                  onPress={() => setStep("phone")}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={primaryCtaLabel}>Next</Text>
                </Pressable>
              </>
            ) : step === "phone" ? (
              <>
                <Text style={[displayMedium, styles.title]} accessibilityRole="header">
                  Enter your phone number
                </Text>
                <Text style={[body, styles.phoneBody]}>
                  We can add your insurance info to your account with your phone number
                </Text>
                <FloatingLabelField
                  label="Phone number"
                  labelNativeId="login-phone-label"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 555-5555"
                  keyboardType="phone-pad"
                  accessibilityLabel="Phone number"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  inputMode="tel"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                  onPress={() => setStep("phoneVerify")}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={primaryCtaLabel}>Next</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[displayMedium, styles.title]} accessibilityRole="header">
                  Verify your phone number
                </Text>
                <Text style={[body, styles.phoneBody]}>
                  We sent a text message with a code to your phone. Enter it below.
                </Text>
                <FloatingLabelField
                  label="Code"
                  labelNativeId="login-phone-verify-code-label"
                  value={phoneVerificationCode}
                  onChangeText={setPhoneVerificationCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  accessibilityLabel="Verification code"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  inputMode="numeric"
                  maxLength={6}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                  onPress={() => {
                    void onContinue();
                  }}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={primaryCtaLabel}>Next</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  /** Explicit horizontal inset — SafeAreaView + padding can be unreliable on some platforms */
  inset: {
    width: "100%",
    paddingHorizontal: 28,
    maxWidth: "100%",
    paddingTop: 4,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 48,
    lineHeight: 54,
    marginTop: 24,
    marginBottom: 24,
  },
  phoneBody: {
    marginBottom: 20,
  },
  field: {
    width: "100%",
    maxWidth: 520,
    marginBottom: 24,
  },
  inputShell: {
    position: "relative",
    height: INPUT_FIELD_HEIGHT,
    overflow: "hidden",
    backgroundColor: FIELD_SURFACE,
    borderRadius: 14,
  },
  floatingLabel: {
    position: "absolute",
    left: FIELD_HORIZONTAL_INSET,
    right: FIELD_HORIZONTAL_INSET,
    fontFamily: "SeasonSansSemiBold",
    letterSpacing: 0.4,
    ...(Platform.OS === "android" ? ({ includeFontPadding: false } as const) : {}),
  },
  inputInner: {
    flex: 1,
    fontFamily: "SeasonSansRegular",
    fontSize: 16,
    lineHeight: 22,
    color: "#ffffff",
    backgroundColor: "transparent",
    paddingTop: 26,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: FIELD_HORIZONTAL_INSET,
    margin: 0,
    minHeight: 0,
    ...(Platform.OS === "android"
      ? ({ includeFontPadding: false, textAlignVertical: "top" } as const)
      : {}),
  },
  primaryBtn: {
    marginBottom: 8,
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
