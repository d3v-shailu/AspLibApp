import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Glass } from "./Glass";
import { colors, radius, spacing } from "../constants/theme";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** stagger delay in ms */
  delay?: number;
}

/** Reusable animated frosted-glass card: fade-in on mount, spring scale on press. */
export function GlassCard({ children, style, onPress, delay = 0 }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const content = (
    <Animated.View style={animated} entering={FadeInDown.delay(delay).duration(400)}>
      <Glass style={[styles.card, style]}>{children}</Glass>
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.97, { damping: 15 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
});
