import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { gradients } from "../constants/theme";
import { ReactNode } from "react";

/** Deep purple → blue → navy gradient backdrop used on every screen. */
export function GradientBackground({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <LinearGradient colors={gradients.bg} style={[styles.bg, style]}>
      <StatusBar style="light" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
});
