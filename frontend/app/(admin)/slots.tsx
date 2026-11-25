import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassButton } from "../../components/GlassButton";
import { GlassInput } from "../../components/GlassInput";
import { LoadingScreen } from "../../components/LoadingScreen";
import { adminService } from "../../services/booking.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { TimeSlot } from "../../types";

export default function SlotsScreen() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSlots(await adminService.slots());
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addSlot = async () => {
    if (!name.trim() || !start || !end) return setError("Name, start and end times are required");
    setAdding(true);
    setError(null);
    try {
      await adminService.addSlot({
        name: name.trim(),
        start_time: start,
        end_time: end,
        price: price ? parseFloat(price) : undefined,
      });
      setShowAdd(false);
      setName("");
      setStart("");
      setEnd("");
      setPrice("");
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (slot: TimeSlot) => {
    try {
      await adminService.updateSlot(slot.id, { is_active: !slot.is_active });
      await load();
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Time Slots</Text>
        <Text style={styles.sub}>Define sessions and pricing</Text>

        {slots.map((s, i) => (
          <GlassCard key={s.id} delay={i * 60} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)} · ₹{s.price}
                </Text>
              </View>
              <Switch
                value={s.is_active}
                onValueChange={() => toggleActive(s)}
                trackColor={{ true: colors.cyan, false: "rgba(255,255,255,0.2)" }}
                thumbColor="#fff"
              />
            </View>
          </GlassCard>
        ))}
        {slots.length === 0 && (
          <Glass style={styles.empty}>
            <Text style={styles.emptyText}>No time slots yet</Text>
          </Glass>
        )}
      </ScrollView>

      <GlassButton title="Add Slot" icon="add" onPress={() => setShowAdd(true)} style={styles.fab} />

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <Glass style={styles.modal}>
            <Text style={styles.modalTitle}>Add Time Slot</Text>
            <GlassInput label="Name" placeholder="Morning" value={name} onChangeText={setName} error={error} />
            <GlassInput label="Start (HH:MM)" placeholder="09:00" value={start} onChangeText={setStart} />
            <GlassInput label="End (HH:MM)" placeholder="13:00" value={end} onChangeText={setEnd} />
            <GlassInput label="Price (₹, optional)" placeholder="50" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <View style={styles.modalButtons}>
              <GlassButton title="Cancel" variant="ghost" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <GlassButton title="Add" onPress={addSlot} loading={adding} style={{ flex: 1 }} />
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
  card: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { color: colors.white, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.white70, fontSize: 12, marginTop: 2 },
  empty: { padding: spacing.xxl, alignItems: "center" },
  emptyText: { color: colors.white50, fontSize: 13 },
  fab: { position: "absolute", bottom: 40, left: spacing.xl, right: spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
  modalButtons: { flexDirection: "row", gap: spacing.md },
});
