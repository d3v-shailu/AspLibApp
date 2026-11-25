import { Platform, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { GlassView } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { colors, radius } from "../constants/theme";
import { ReactNode } from "react";

/**
 * Adaptive glassmorphism wrapper.
 *
 * - iOS 26+  → native Liquid Glass via expo-glass-effect (GlassView)
 * - Android + older iOS → real frosted-glass blur via expo-blur
 *   (experimentalBlurMethod="dimezisBlurView" is required for blur on Android)
 *
 * Same API everywhere: <Glass style tintColor isInteractive glassEffectStyle>
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
  const supportsLiquidGlass = Platform.OS === "ios" && Number(Platform.Version) >= 26;

  if (supportsLiquidGlass) {
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

  // Frosted-glass fallback (Android + iOS < 26)
  return (
    <View style={[styles.base, style]}>
      <BlurView
        intensity={Platform.OS === "android" ? 60 : 40}
        tint="dark"
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={[StyleSheet.absoluteFill, { overflow: "hidden" as const }]}
      />
      {/* translucent tint layer gives the "frosted" body + colored variants */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tintColor ? `${tintColor}55` : colors.glassFill },
        ]}
      />
      {/* subtle top-light border highlight */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.border,
          { borderRadius: styleBorderRadius(style) },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** Pull a borderRadius out of the passed style so the border highlight matches. */
function styleBorderRadius(style?: StyleProp<ViewStyle>): number {
  const flat = StyleSheet.flatten(style);
  if (!flat) return radius.lg;
  return (flat.borderRadius as number | undefined) ?? radius.lg;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderTopColor: "rgba(255,255,255,0.28)",
  },
  content: {
    flex: 1,
  },
});
