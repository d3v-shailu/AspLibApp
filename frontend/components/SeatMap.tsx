import { StyleSheet, Text, View } from "react-native";
import { Glass } from "./Glass";
import { colors, statusColors, radius, spacing } from "../constants/theme";
import { Pressable } from "react-native";

interface SeatMapProps {
  seats: Array<{ id: string; seat_number: string; status: string; is_booked?: boolean }>;
  selectedId?: string | null;
  onSelect?: (seatId: string) => void;
  columns?: number;
}

const seatColor = (s: { status: string; is_booked?: boolean }, selected: boolean): string => {
  if (selected) return colors.purple;
  if (s.is_booked) return colors.red;
  if (s.status === "maintenance") return colors.gray;
  return colors.green;
};

/** Visual seat grid — green available, red occupied, gray maintenance, purple selected. */
export function SeatMap({ seats, selectedId, onSelect, columns = 4 }: SeatMapProps) {
  return (
    <View style={styles.grid}>
      {seats.map((s) => {
        const disabled = s.is_booked || s.status === "maintenance";
        return (
          <Pressable key={s.id} onPress={() => !disabled && onSelect?.(s.id)} style={styles.cell}>
            <Glass
              isInteractive={!disabled}
              style={[styles.seat, { borderColor: seatColor(s, selectedId === s.id) }]}
            >
              <Text style={[styles.seatText, { color: seatColor(s, selectedId === s.id) }]}>{s.seat_number}</Text>
            </Glass>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  cell: {
    width: "22%",
    flexGrow: 1,
  },
  seat: {
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  seatText: {
    fontWeight: "800",
    fontSize: 14,
  },
});
