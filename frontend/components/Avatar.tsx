import { StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../constants/theme";

/** Circular gradient avatar with the user's initials. */
export function Avatar({ name, size = 48 }: { name?: string | null; size?: number }) {
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <LinearGradient colors={gradients.primary} style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
