import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../components/GradientBackground";
import { GlassCard } from "../../components/GlassCard";
import { Glass } from "../../components/Glass";
import { Badge } from "../../components/Badge";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, radius, spacing } from "../../constants/theme";
import { Booking, OccupancyReport } from "../../types";

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [occ, books] = await Promise.all([adminService.occupancy(), adminService.bookings()]);
      setOccupancy(occ);
      setBookings(books.slice(0, 6));
    } catch (e) {
      console.warn(apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  const occPct = occupancy?.occupancy_percent ?? 0;
  const ringColor = occPct > 80 ? colors.red : occPct > 50 ? colors.amber : colors.green;

  const quickActions = [
    { icon: "add-circle-outline", label: "Add Seat", route: "/(admin)/seats" },
    { icon: "time-outline", label: "Add Slot", route: "/(admin)/slots" },
    { icon: "person-add-outline", label: "Add Student", route: "/(admin)/students" },
    { icon: "location-outline", label: "Geofence", route: "/(admin)/geofence" },
    { icon: "bar-chart-outline", label: "Reports", route: "/(admin)/reports" },
    { icon: "list-outline", label: "Bookings", route: "/(admin)/bookings" },
  ];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>{user?.full_name ?? "Admin"}'s Library</Text>
        <Text style={styles.sub}>Live overview for today</Text>

        {/* Occupancy ring */}
        <GlassCard style={styles.occCard}>
          <View style={styles.occRow}>
            <View style={[styles.ring, { borderColor: `${ringColor}44` }]}>
              <Text style={[styles.ringValue, { color: ringColor }]}>{occPct}%</Text>
              <Text style={styles.ringLabel}>occupied</Text>
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <View style={styles.statLine}>
                <Text style={styles.statLabel}>Booked</Text>
                <Text style={styles.statValue}>{occupancy?.booked ?? 0}/{occupancy?.total_seats ?? 0}</Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLabel}>Checked in</Text>
                <Text style={[styles.statValue, { color: colors.green }]}>{occupancy?.checked_in ?? 0}</Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLabel}>No-shows</Text>
                <Text style={[styles.statValue, { color: colors.red }]}>{occupancy?.no_shows ?? 0}</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          {quickActions.map((qa, i) => (
            <GlassCard key={qa.label} delay={i * 60} style={styles.quickCard} onPress={() => router.push(qa.route as never)}>
              <Ionicons name={qa.icon as never} size={26} color={colors.cyan} />
              <Text style={styles.quickLabel}>{qa.label}</Text>
            </GlassCard>
          ))}
        </View>

        <Text style={styles.section}>Recent Bookings</Text>
        {bookings.map((b, i) => (
          <GlassCard key={b.id} delay={i * 60} style={styles.bookingCard}>
            <View style={styles.bookingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingName}>{b.student_name ?? "Student"}</Text>
                <Text style={styles.bookingMeta}>Seat {b.seat_number} · {b.slot_name} · {b.start_time?.slice(0, 5)}</Text>
              </View>
              <Badge status={b.status} />
            </View>
          </GlassCard>
        ))}
        {bookings.length === 0 && (
          <Glass style={styles.empty}>
            <Text style={styles.emptyText}>No bookings yet today</Text>
          </Glass>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 120, gap: spacing.md },
  greeting: { color: colors.white, fontSize: 24, fontWeight: "900", marginTop: spacing.xl },
  sub: { color: colors.white70, fontSize: 13, marginBottom: spacing.sm },
  occCard: { padding: spacing.xl },
  occRow: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 8, alignItems: "center", justifyContent: "center" },
  ringValue: { fontSize: 26, fontWeight: "900" },
  ringLabel: { color: colors.white70, fontSize: 11 },
  statLine: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { color: colors.white70, fontSize: 13 },
  statValue: { color: colors.white, fontSize: 15, fontWeight: "800" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  quickCard: { width: "31%", padding: spacing.md, alignItems: "center", gap: 6 },
  quickLabel: { color: colors.white70, fontSize: 11, fontWeight: "600", textAlign: "center" },
  section: { color: colors.white, fontSize: 18, fontWeight: "800", marginTop: spacing.md },
  bookingCard: { padding: spacing.lg },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bookingName: { color: colors.white, fontSize: 15, fontWeight: "700" },
  bookingMeta: { color: colors.white70, fontSize: 12, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: "center", borderRadius: radius.md },
  emptyText: { color: colors.white50, fontSize: 13 },
});
