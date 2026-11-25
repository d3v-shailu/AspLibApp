import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassButton } from "../../components/GlassButton";
import { Badge } from "../../components/Badge";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { bookingService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, radius, spacing } from "../../constants/theme";
import { Booking } from "../../types";
import { formatTime } from "../../utils/validators";

export default function StudentHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setBookings(await bookingService.myBookings());
    } catch (e) {
      console.warn(apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // upcoming = today's booked/checked_in booking
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return bookings.find(
      (b) => b.booking_date === today && (b.status === "booked" || b.status === "checked_in")
    );
  }, [bookings]);

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Hi, {(user?.full_name ?? "Student").split(" ")[0]} 👋</Text>
        <Text style={styles.sub}>Ready for today's session?</Text>

        {upcoming ? (
          <GlassCard style={styles.upcoming}>
            <Text style={styles.upcomingLabel}>Today's Booking</Text>
            <View style={styles.upcomingRow}>
              <View>
                <Text style={styles.seatBig}>Seat {upcoming.seat_number}</Text>
                <Text style={styles.slotText}>
                  {upcoming.slot_name} · {formatTime(upcoming.start_time)}–{formatTime(upcoming.end_time)}
                </Text>
              </View>
              <Badge status={upcoming.status} />
            </View>
            <GlassButton
              title={upcoming.status === "checked_in" ? "Check Out" : "Check In"}
              icon="location-outline"
              variant={upcoming.status === "checked_in" ? "secondary" : "primary"}
              onPress={() => router.push("/(student)/checkin")}
            />
            <Text style={styles.hint}>Check-in opens ±15 min around slot start · GPS must be inside the library</Text>
          </GlassCard>
        ) : (
          <Glass style={styles.noBooking}>
            <Text style={styles.noBookingText}>No booking for today — grab a seat!</Text>
          </Glass>
        )}

        <View style={styles.links}>
          <GlassCard style={styles.linkCard} onPress={() => router.push("/(student)/book")}>
            <Text style={styles.linkIcon}>🪑</Text>
            <Text style={styles.linkLabel}>Book Seat</Text>
          </GlassCard>
          <GlassCard style={styles.linkCard} onPress={() => router.push("/(student)/history")}>
            <Text style={styles.linkIcon}>🕘</Text>
            <Text style={styles.linkLabel}>History</Text>
          </GlassCard>
          <GlassCard style={styles.linkCard} onPress={() => router.push("/(student)/chat")}>
            <Text style={styles.linkIcon}>💬</Text>
            <Text style={styles.linkLabel}>Chat</Text>
          </GlassCard>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 120, gap: spacing.md },
  greeting: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  sub: { color: colors.white70, fontSize: 14, marginBottom: spacing.sm },
  upcoming: { gap: spacing.md },
  upcomingLabel: { color: colors.cyan, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  upcomingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seatBig: { color: colors.white, fontSize: 24, fontWeight: "900" },
  slotText: { color: colors.white70, fontSize: 13, marginTop: 2 },
  hint: { color: colors.white50, fontSize: 11, textAlign: "center" },
  noBooking: { padding: spacing.xxl, alignItems: "center", borderRadius: radius.lg },
  noBookingText: { color: colors.white70, fontSize: 14 },
  links: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  linkCard: { flex: 1, alignItems: "center", padding: spacing.lg, gap: 6 },
  linkIcon: { fontSize: 24 },
  linkLabel: { color: colors.white70, fontSize: 12, fontWeight: "700" },
});
