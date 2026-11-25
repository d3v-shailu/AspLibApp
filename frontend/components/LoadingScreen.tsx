import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { GradientBackground } from "./GradientBackground";
import { Glass } from "./Glass";
import { colors, spacing } from "../constants/theme";

export function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <GradientBackground style={styles.bg}>
      <Glass style={styles.card}>
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.text}>{message}</Text>
      </Glass>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  text: {
    color: colors.white70,
    fontSize: 14,
  },
});
