import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { Badge } from "../../components/Badge";
import { LoadingScreen } from "../../components/LoadingScreen";
import { bookingService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { Booking } from "../../types";
import { formatDate, formatTime } from "../../utils/validators";

type Filter = "all" | "booked" | "checked_in" | "completed" | "no_show" | "cancelled";
const FILTERS: Filter[] = ["all", "booked", "checked_in", "completed", "no_show", "cancelled"];

export default function HistoryScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      setBookings(await bookingService.myBookings());
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter((b) => filter === "all" || b.status === filter);

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>History</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Glass key={f} isInteractive style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && { color: colors.cyan }]} onPress={() => setFilter(f)}>
                {f === "all" ? "All" : f.replace(/_/g, " ")}
              </Text>
            </Glass>
          ))}
        </ScrollView>

        {filtered.map((b, i) => (
          <GlassCard key={b.id} delay={i * 50} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  Seat {b.seat_number} · {b.slot_name}
                </Text>
                <Text style={styles.meta}>
                  {formatDate(b.booking_date)} · {formatTime(b.start_time)}–{formatTime(b.end_time)}
                </Text>
                {b.is_geofence_valid ? <Text style={styles.proof}>📍 geo-verified attendance</Text> : null}
              </View>
              <Badge status={b.status} />
            </View>
          </GlassCard>
        ))}
        {filtered.length === 0 && (
          <Glass style={styles.empty}>
            <Text style={styles.emptyText}>Nothing here yet</Text>
          </Glass>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  chips: { gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.white70, fontSize: 12, fontWeight: "700" },
  card: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { color: colors.white, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.white70, fontSize: 12, marginTop: 2 },
  proof: { color: colors.green, fontSize: 11, marginTop: 4 },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { color: colors.white50, fontSize: 13 },
});
