import { StyleSheet, Text, View } from "react-native";
import { colors, statusColors, spacing } from "../constants/theme";

/** Colored status pill (booked / checked_in / active / blocked / ...). */
export function Badge({ status, label }: { status: string; label?: string }) {
  const color = statusColors[status] ?? colors.gray;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}26`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{(label ?? status).replace(/_/g, " ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
