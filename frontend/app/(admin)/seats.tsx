import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassButton } from "../../components/GlassButton";
import { GlassInput } from "../../components/GlassInput";
import { LoadingScreen } from "../../components/LoadingScreen";
import { adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { Seat } from "../../types";

export default function SeatsScreen() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [seatNumber, setSeatNumber] = useState("");
  const [zone, setZone] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSeats(await adminService.seats());
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addSeat = async () => {
    if (!seatNumber.trim()) return setError("Seat number required");
    setAdding(true);
    setError(null);
    try {
      await adminService.addSeat(seatNumber.trim(), zone || undefined);
      setShowAdd(false);
      setSeatNumber("");
      setZone("");
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (seat: Seat) => {
    const next = seat.status === "maintenance" ? "available" : "maintenance";
    try {
      await adminService.updateSeat(seat.id, { status: next });
      await load();
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  const seatBg = (s: Seat) =>
    s.status === "maintenance" ? colors.gray : colors.green;

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Seats</Text>
        <Text style={styles.sub}>{seats.length} total · tap a seat to toggle maintenance</Text>

        <View style={styles.grid}>
          {seats.map((s, i) => (
            <Glass key={s.id} isInteractive style={[styles.seat, { borderColor: seatBg(s) }]} tintColor={`${seatBg(s)}22`}>
              <Text onPress={() => toggleStatus(s)} style={[styles.seatText, { color: seatBg(s) }]}>
                {s.seat_number}
              </Text>
              {s.zone ? <Text style={styles.seatZone}>{s.zone}</Text> : null}
            </Glass>
          ))}
        </View>
        {seats.length === 0 && (
          <Glass style={styles.empty}>
            <Ionicons name="grid-outline" size={32} color={colors.white50} />
            <Text style={styles.emptyText}>No seats yet — add your first one</Text>
          </Glass>
        )}
      </ScrollView>

      <GlassButton title="Add Seat" icon="add" onPress={() => setShowAdd(true)} style={styles.fab} />

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <Glass style={styles.modal}>
            <Text style={styles.modalTitle}>Add Seat</Text>
            <GlassInput label="Seat Number" placeholder="A1" value={seatNumber} onChangeText={setSeatNumber} error={error} />
            <GlassInput label="Zone (optional)" placeholder="Quiet / Group" value={zone} onChangeText={setZone} />
            <View style={styles.modalButtons}>
              <GlassButton title="Cancel" variant="ghost" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <GlassButton title="Add" onPress={addSeat} loading={adding} style={{ flex: 1 }} />
            </View>
          </Glass>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 160, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  sub: { color: colors.white70, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  seat: { width: "22%", flexGrow: 1, borderWidth: 2, borderRadius: 14, paddingVertical: spacing.md, alignItems: "center", minHeight: 60, justifyContent: "center" },
  seatText: { fontWeight: "800", fontSize: 14 },
  seatZone: { color: colors.white50, fontSize: 9, marginTop: 2 },
  empty: { padding: spacing.xxl, alignItems: "center", gap: spacing.sm },
  emptyText: { color: colors.white50, fontSize: 13 },
  fab: { position: "absolute", bottom: 40, left: spacing.xl, right: spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
  modalButtons: { flexDirection: "row", gap: spacing.md },
});
