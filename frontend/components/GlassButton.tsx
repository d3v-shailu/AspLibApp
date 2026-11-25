import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, StyleProp } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Glass } from "./Glass";
import { colors, radius, spacing } from "../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../constants/theme";

interface Props {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  style?: StyleProp<ViewStyle>;
  icon?: string;
}

const variantColors: Record<string, string> = {
  primary: colors.purple,
  secondary: colors.cyan,
  danger: colors.red,
  ghost: "rgba(255,255,255,0.12)",
};

/** Glass button with press spring, loading spinner and disabled state. */
export function GlassButton({ title, onPress, loading, disabled, variant = "primary", style, icon }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;
  const tint = variantColors[variant];

  return (
    <Pressable
      onPress={() => !isDisabled && onPress?.()}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
      disabled={isDisabled}
    >
      <Animated.View style={[animated, isDisabled && { opacity: 0.5 }]}>
        <LinearGradient colors={gradients[variant as keyof typeof gradients] ?? gradients.primary} style={[styles.fill, style]}>
          <Glass style={styles.glass} tintColor={tint} glassEffectStyle="regular">
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.text}>
                {icon ? `${icon}  ` : ""}
                {title}
              </Text>
            )}
          </Glass>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: radius.md,
    padding: 2,
  },
  glass: {
    borderRadius: radius.md - 2,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
