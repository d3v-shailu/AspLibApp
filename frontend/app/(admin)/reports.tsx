import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassButton } from "../../components/GlassButton";
import { LoadingScreen } from "../../components/LoadingScreen";
import { adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { Booking, OccupancyReport } from "../../types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsScreen() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const [occ, books] = await Promise.all([adminService.occupancy(d), adminService.bookings(d)]);
      setOccupancy(occ);
      setBookings(books.filter((b) => b.status === "no_show"));
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(toISODate(d));
  };

  if (loading && !occupancy) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Reports</Text>

        {/* date navigator */}
        <View style={styles.dateRow}>
          <GlassButton title="" icon="chevron-back" variant="ghost" onPress={() => shiftDate(-1)} style={{ width: 52, minHeight: 44 }} />
          <Glass style={styles.dateBox}>
            <Text style={styles.dateText}>{date}</Text>
          </Glass>
          <GlassButton title="" icon="chevron-forward" variant="ghost" onPress={() => shiftDate(1)} style={{ width: 52, minHeight: 44 }} />
        </View>

        {/* occupancy summary */}
        <GlassCard>
          <Text style={styles.section}>Occupancy</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${occupancy?.occupancy_percent ?? 0}%`, backgroundColor: colors.cyan }]} />
          </View>
          <View style={styles.grid}>
            <View style={styles.cell}>
              <Text style={styles.num}>{occupancy?.total_seats ?? 0}</Text>
              <Text style={styles.cellLabel}>Total seats</Text>
            </View>
            <View style={styles.cell}>
              <Text style={[styles.num, { color: colors.cyan }]}>{occupancy?.booked ?? 0}</Text>
              <Text style={styles.cellLabel}>Booked</Text>
            </View>
            <View style={styles.cell}>
              <Text style={[styles.num, { color: colors.green }]}>{occupancy?.checked_in ?? 0}</Text>
              <Text style={styles.cellLabel}>Checked in</Text>
            </View>
            <View style={styles.cell}>
              <Text style={[styles.num, { color: colors.purple }]}>{occupancy?.completed ?? 0}</Text>
              <Text style={styles.cellLabel}>Completed</Text>
            </View>
          </View>
        </GlassCard>

        {/* no-show list */}
        <GlassCard>
          <Text style={styles.section}>No-shows ({bookings.length})</Text>
          {bookings.map((b) => (
            <View key={b.id} style={styles.noShowRow}>
              <Text style={styles.noShowName}>{b.student_name ?? "Student"}</Text>
              <Text style={styles.noShowMeta}>Seat {b.seat_number} · {b.slot_name}</Text>
            </View>
          ))}
          {bookings.length === 0 && <Text style={styles.note}>No no-shows on this date 🎉</Text>}
        </GlassCard>

        <Text style={styles.note}>Revenue reporting activates once payments are integrated (Razorpay/Stripe).</Text>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dateBox: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  dateText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  section: { color: colors.white, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: spacing.lg },
  barFill: { height: 10, borderRadius: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell: { width: "47%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: spacing.md },
  num: { color: colors.white, fontSize: 22, fontWeight: "900" },
  cellLabel: { color: colors.white70, fontSize: 11, marginTop: 2 },
  noShowRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  noShowName: { color: colors.white, fontSize: 13, fontWeight: "600" },
  noShowMeta: { color: colors.white50, fontSize: 12 },
  note: { color: colors.white50, fontSize: 12, textAlign: "center" },
});
