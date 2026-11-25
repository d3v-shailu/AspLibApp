import { Platform, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { GlassView } from "expo-glass-effect";
import { colors, radius } from "../constants/theme";
import { ReactNode } from "react";

/**
 * Liquid Glass wrapper.
 * Uses the native expo-glass-effect GlassView on iOS 26+; falls back to a
 * translucent styled view on Android / older iOS so the UI still works.
 */
export function Glass({
  children,
  style,
  isInteractive = false,
  tintColor,
  glassEffectStyle = "regular",
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  isInteractive?: boolean;
  tintColor?: string;
  glassEffectStyle?: "clear" | "regular";
}) {
  const supportsGlass = Platform.OS === "ios" && Number(Platform.Version) >= 26;

  if (supportsGlass) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        colorScheme="dark"
        isInteractive={isInteractive}
        tintColor={tintColor}
        style={[styles.base, style]}
      >
        {children}
      </GlassView>
    );
  }

  return <View style={[styles.base, styles.fallback, tintColor ? { backgroundColor: tintColor } : null, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: "hidden" as const,
  },
  fallback: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
