import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { Badge } from "../../components/Badge";
import { LoadingScreen } from "../../components/LoadingScreen";
import { adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { Booking } from "../../types";

type Filter = "all" | "active" | "completed" | "no_show";

const filters: Filter[] = ["all", "active", "completed", "no_show"];
const filterLabel: Record<Filter, string> = { all: "All", active: "Active", completed: "Completed", no_show: "No-show" };

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      setBookings(await adminService.bookings());
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "active") return b.status === "booked" || b.status === "checked_in";
    return b.status === filter;
  });

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Bookings</Text>
        <View style={styles.chips}>
          {filters.map((f) => (
            <Glass key={f} isInteractive style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && { color: colors.cyan }]} onPress={() => setFilter(f)}>
                {filterLabel[f]}
              </Text>
            </Glass>
          ))}
        </View>

        {filtered.map((b, i) => (
          <GlassCard key={b.id} delay={i * 50} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.student_name ?? "Student"}</Text>
                <Text style={styles.meta}>
                  Seat {b.seat_number} · {b.slot_name} ({b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)})
                </Text>
                <Text style={styles.meta}>{b.booking_date}</Text>
              </View>
              <Badge status={b.status} />
            </View>
          </GlassCard>
        ))}
        {filtered.length === 0 && (
          <Glass style={styles.empty}>
            <Text style={styles.emptyText}>No bookings for this filter</Text>
          </Glass>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.white70, fontSize: 12, fontWeight: "700" },
  card: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { color: colors.white, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.white70, fontSize: 12, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.white50, fontSize: 13 },
});
