import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";
import { colors, spacing } from "../constants/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color?: string;
  delay?: number;
  suffix?: string;
}

/** Glass stat card with a count-up number animation on mount. */
export function StatCard({ icon, label, value, color = colors.cyan, delay = 0, suffix }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const steps = 20;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplay(Math.round((value / steps) * i));
      if (i >= steps) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <GlassCard delay={delay} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}33` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.value}>
          {display}
          {suffix}
        </Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
  },
  label: {
    color: colors.white70,
    fontSize: 12,
    fontWeight: "600",
  },
});
