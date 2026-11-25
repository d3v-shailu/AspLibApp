import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FadeInDown } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassButton } from "../../components/GlassButton";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { bookingService, adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { useGeofence } from "../../hooks/useGeofence";
import { isInsideGeofence } from "../../utils/geofence";
import { colors, gradients, radius, spacing } from "../../constants/theme";
import { Booking, Library, TimeSlot } from "../../types";

export default function CheckinScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [library, setLibrary] = useState<Library | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // student's library geofence (via developer endpoint is not student-accessible;
  // the check-in response itself carries distance — but for the live ring we
  // fetch our library's coordinates through the backend's shared library list
  // filtered client-side when role permits; otherwise distance comes from the API)
  useEffect(() => {
    (async () => {
      try {
        const my = await bookingService.myBookings();
        setBookings(my);
      } catch (e) {
        Alert.alert("Error", apiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const active = useMemo(
    () => bookings.find((b) => b.booking_date === today && (b.status === "booked" || b.status === "checked_in")),
    [bookings, today]
  );

  const { fix, distance, error: gpsError } = useGeofence(library ? Number(library.latitude) : undefined, library ? Number(library.longitude) : undefined);

  // Library coords: student endpoint doesn't expose them; the server validates
  // anyway. We rely on server responses + show our own distance if we can.
  // (kept null-safe — live ring works once coords are known)
  useEffect(() => {
    if (library || !active) return;
    // no student endpoint for library details; skip live ring if unknown
  }, [library, active]);

  const checkIn = async () => {
    if (!active || !fix) return;
    setBusy(true);
    try {
      await bookingService.checkIn(active.id, fix.lat, fix.lng, fix.accuracy);
      setSuccess("Checked in! Have a great session 🎉");
      setTimeout(() => router.replace("/(student)"), 1400);
    } catch (e) {
      Alert.alert("Check-in failed", apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    if (!active || !fix) return;
    setBusy(true);
    try {
      await bookingService.checkOut(active.id, fix.lat, fix.lng, fix.accuracy);
      setSuccess("Checked out. See you next time! 👋");
      setTimeout(() => router.replace("/(student)"), 1400);
    } catch (e) {
      Alert.alert("Check-out failed", apiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (!active) {
    return (
      <GradientBackground style={{ alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
        <Glass style={{ padding: spacing.xxl, alignItems: "center", gap: spacing.md, borderRadius: radius.lg }}>
          <Ionicons name="calendar-clear-outline" size={44} color={colors.white50} />
          <Text style={styles.emptyTitle}>No active booking today</Text>
          <GlassButton title="Book a Seat" onPress={() => router.replace("/(student)/book")} />
        </Glass>
      </GradientBackground>
    );
  }

  const isCheckedIn = active.status === "checked_in";

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{isCheckedIn ? "Check Out" : "Check In"}</Text>
        <Text style={styles.sub}>
          Seat {active.seat_number} · {active.slot_name} ({active.start_time?.slice(0, 5)}–{active.end_time?.slice(0, 5)})
        </Text>

        {/* status ring */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center" }}>
          <LinearGradient colors={gradients.primary} style={styles.ringOuter}>
            <Glass style={styles.ringInner} tintColor={isCheckedIn ? colors.green : colors.purple}>
              {busy ? (
                <ActivityIndicator size="large" color={colors.cyan} />
              ) : success ? (
                <Ionicons name="checkmark-circle" size={64} color={colors.green} />
              ) : (
                <>
                  <Ionicons name={isCheckedIn ? "log-out-outline" : "location-outline"} size={44} color={colors.cyan} />
                  <Text style={styles.ringTitle}>
                    {gpsError ? "GPS unavailable" : distance != null ? `${distance} m` : "Locating…"}
                  </Text>
                  <Text style={styles.ringSub}>{gpsError ?? (fix?.accuracy != null ? `±${Math.round(fix.accuracy)} m accuracy` : "waiting for GPS")}</Text>
                </>
              )}
            </Glass>
          </LinearGradient>
        </Animated.View>

        {success && <Text style={styles.success}>{success}</Text>}

        <GlassButton
          title={isCheckedIn ? "Check Out" : "Check In"}
          icon={isCheckedIn ? "log-out-outline" : "log-in-outline"}
          onPress={isCheckedIn ? checkOut : checkIn}
          loading={busy}
          disabled={!fix || !!success}
          variant={isCheckedIn ? "danger" : "primary"}
        />
        <Text style={styles.hint}>
          The server verifies your GPS distance against the library geofence — you must be physically inside.
        </Text>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, alignItems: "center", gap: spacing.lg, paddingBottom: 80 },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xxl },
  sub: { color: colors.white70, fontSize: 13 },
  ringOuter: { padding: 6, borderRadius: 130, marginTop: spacing.xl },
  ringInner: { width: 240, height: 240, borderRadius: 120, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  ringTitle: { color: colors.white, fontSize: 30, fontWeight: "900" },
  ringSub: { color: colors.white70, fontSize: 12 },
  success: { color: colors.green, fontSize: 16, fontWeight: "800" },
  hint: { color: colors.white50, fontSize: 11, textAlign: "center" },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: "800" },
});
