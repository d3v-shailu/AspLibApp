import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassInput } from "../../components/GlassInput";
import { GlassButton } from "../../components/GlassButton";
import { Badge } from "../../components/Badge";
import { LoadingScreen } from "../../components/LoadingScreen";
import { libraryService } from "../../services/library.service";
import { apiError } from "../../services/api";
import { colors, gradients, radius, spacing } from "../../constants/theme";
import { Library } from "../../types";

type Filter = "all" | "active" | "suspended";

export default function LibrariesScreen() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLibraries(await libraryService.list());
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return setError("Library name is required");
    setCreating(true);
    setError(null);
    try {
      await libraryService.create({ name: name.trim(), address: address || undefined, phone: phone || undefined });
      setShowCreate(false);
      setName("");
      setAddress("");
      setPhone("");
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (lib: Library) => {
    const next = lib.status === "active" ? "suspended" : "active";
    try {
      await libraryService.updateStatus(lib.id, next);
      await load();
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  const filtered = libraries.filter(
    (l) =>
      (filter === "all" || l.status === filter) &&
      l.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <FlatList
        contentContainerStyle={styles.scroll}
        data={filtered}
        keyExtractor={(l) => l.id}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <Text style={styles.title}>Libraries</Text>
            <Glass style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.white50} />
              <TextInput placeholder="Search libraries…" placeholderTextColor={colors.white50} value={search} onChangeText={setSearch} style={styles.searchInput} />
            </Glass>
            <View style={styles.chips}>
              {(["all", "active", "suspended"] as Filter[]).map((f) => (
                <Glass key={f} isInteractive style={[styles.chip, filter === f && styles.chipActive]}>
                  <Text style={[styles.chipText, filter === f && { color: colors.cyan }]}>{f.toUpperCase()}</Text>
                </Glass>
              ))}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <GlassCard delay={index * 60} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.address || "No address"}</Text>
                <Text style={styles.meta}>
                  {item.student_count ?? 0} students · {item.seat_count ?? 0} seats
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: spacing.sm }}>
                <Badge status={item.status} />
                <Text style={styles.action} onPress={() => toggleStatus(item)}>
                  {item.status === "active" ? "Suspend" : "Activate"}
                </Text>
                <Text style={styles.action} onPress={() => router.push({ pathname: "/(developer)/create-admin", params: { libraryId: item.id, libraryName: item.name } })}>
                  + Admin
                </Text>
              </View>
            </View>
          </GlassCard>
        )}
      />

      {/* Floating action button */}
      <LinearGradient colors={gradients.primary} style={styles.fab}>
        <Ionicons name="add" size={30} color="#fff" onPress={() => setShowCreate(true)} />
      </LinearGradient>

      {/* Create library modal */}
      {showCreate && (
        <View style={styles.modalOverlay}>
          <Glass style={styles.modal}>
            <Text style={styles.modalTitle}>Create Library</Text>
            <GlassInput label="Name" placeholder="ABC Library" value={name} onChangeText={setName} error={error} />
            <GlassInput label="Address" placeholder="Street, city" value={address} onChangeText={setAddress} />
            <GlassInput label="Phone" placeholder="+91…" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={styles.modalButtons}>
              <GlassButton title="Cancel" variant="ghost" onPress={() => setShowCreate(false)} style={{ flex: 1 }} />
              <GlassButton title="Create" onPress={create} loading={creating} style={{ flex: 1 }} />
            </View>
          </Glass>
        </View>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 140, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 48 },
  searchInput: { flex: 1, color: colors.white, fontSize: 15 },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.white70, fontSize: 12, fontWeight: "700" },
  card: { padding: spacing.lg },
  cardRow: { flexDirection: "row", gap: spacing.md },
  name: { color: colors.white, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.white70, fontSize: 12 },
  action: { color: colors.cyan, fontSize: 13, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
  modalButtons: { flexDirection: "row", gap: spacing.md },
});
