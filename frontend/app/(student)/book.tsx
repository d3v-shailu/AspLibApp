import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassButton } from "../../components/GlassButton";
import { SeatMap } from "../../components/SeatMap";
import { LoadingScreen } from "../../components/LoadingScreen";
import { bookingService, adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { Seat, TimeSlot } from "../../types";

function nextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function BookScreen() {
  const [dates] = useState(nextDays(7));
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    adminService
      .slots()
      .then((s) => {
        setSlots(s.filter((x) => x.is_active));
        if (s[0]) setSlotId(s[0].id);
      })
      .catch((e) => Alert.alert("Error", apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadSeats = useCallback(async () => {
    if (!slotId) return;
    setSelectedSeat(null);
    try {
      setSeats(await bookingService.availableSeats(date, slotId));
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  }, [date, slotId]);

  useEffect(() => {
    loadSeats();
  }, [loadSeats]);

  const confirm = async () => {
    if (!selectedSeat || !slotId) return;
    setBooking(true);
    try {
      await bookingService.book(selectedSeat, slotId, date);
      Alert.alert("Booked ✅", "Your seat is reserved. See you at the library!", [
        { text: "OK", onPress: loadSeats },
      ]);
    } catch (e) {
      Alert.alert("Booking failed", apiError(e));
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const selectedSlot = slots.find((s) => s.id === slotId);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Book a Seat</Text>

        {/* date chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {dates.map((d) => (
            <Glass key={d} isInteractive style={[styles.chip, date === d && styles.chipActive]}>
              <Text style={[styles.chipText, date === d && { color: colors.cyan }]} onPress={() => setDate(d)}>
                {new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
              </Text>
            </Glass>
          ))}
        </ScrollView>

        {/* slot chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {slots.map((s) => (
            <Glass key={s.id} isInteractive style={[styles.chip, slotId === s.id && styles.chipActive]}>
              <Text style={[styles.chipText, slotId === s.id && { color: colors.cyan }]} onPress={() => setSlotId(s.id)}>
                {s.name} {s.start_time.slice(0, 5)}
              </Text>
            </Glass>
          ))}
        </ScrollView>

        <GlassCard>
          <Text style={styles.section}>Seat Map</Text>
          <SeatMap seats={seats} selectedId={selectedSeat} onSelect={setSelectedSeat} />
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.green }]} /><Text style={styles.legendText}>Available</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.red }]} /><Text style={styles.legendText}>Booked</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.gray }]} /><Text style={styles.legendText}>Maintenance</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.purple }]} /><Text style={styles.legendText}>Selected</Text></View>
          </View>
        </GlassCard>

        {selectedSeat && selectedSlot && (
          <GlassCard style={styles.summary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <Text style={styles.summaryText}>
              Seat #{seats.find((s) => s.id === selectedSeat)?.seat_number} · {selectedSlot.name} · {date}
            </Text>
            <Text style={styles.summaryText}>₹{selectedSlot.price}</Text>
          </GlassCard>
        )}

        <GlassButton title="Confirm Booking" icon="checkmark-circle" onPress={confirm} disabled={!selectedSeat} loading={booking} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  chips: { gap: spacing.sm, paddingHorizontal: 2 },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.white70, fontSize: 13, fontWeight: "700" },
  section: { color: colors.white, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { color: colors.white70, fontSize: 11 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  summary: { gap: spacing.sm },
  summaryTitle: { color: colors.cyan, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  summaryText: { color: colors.white, fontSize: 15, fontWeight: "600" },
});
