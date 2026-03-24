import { Platform, type TextStyle } from "react-native";

const androidTrim =
  Platform.OS === "android" ? ({ includeFontPadding: false } as const) : {};

export const eyebrow: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSansSemiBold",
  color: "rgba(255,255,255,0.72)",
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
};

export const displayMedium: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonMixRegular",
  color: "#fff",
  fontSize: 48,
  letterSpacing: -0.5,
  lineHeight: 54,
};

/** Full-width menu rows (Season Serif, rebrand display size). */
export const menuRowSerif: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSerifRegular",
  color: "#fff",
  fontSize: 64,
  letterSpacing: -0.5,
  lineHeight: 68,
};

/** Menu footer — Account / Log out (Season Mix). */
export const menuFooterMix: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonMixRegular",
  color: "rgba(255, 255, 255, 0.88)",
  fontSize: 18,
  lineHeight: 24,
};

export const secondaryCtaLabel: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSansRegular",
  color: "#fff",
  fontSize: 15,
};

export const primaryCtaLabel: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSansRegular",
  color: "#010204",
  fontSize: 15,
};

/** Close control — Season Sans */
export const closeLabel: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSansRegular",
  color: "rgba(255,255,255,0.92)",
  fontSize: 15,
};

export const body: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSansRegular",
  color: "rgba(255,255,255,0.82)",
  fontSize: 16,
  lineHeight: 24,
};

export const sectionTitle: TextStyle = {
  ...androidTrim,
  fontFamily: "SeasonSansSemiBold",
  color: "#fff",
  fontSize: 13,
  letterSpacing: 0.6,
  textTransform: "uppercase",
};
